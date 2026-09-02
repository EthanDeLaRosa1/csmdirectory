import React, { useEffect, useState } from "react";
import {
  Search,
  Download,
  Phone,
  FileText,
  Loader2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  XCircle,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { saveAs } from "file-saver";
import { supabase } from "@/lib/supabase";

const PRESET_CHIPS = [
  { label: "ServiceNow / ITSM", query: "ServiceNow,SNOW,ITSM" },
  { label: "Change Requests", query: "Change Request,Change Management,CAB approval" },
  { label: "Copado Connect Repair", query: "Copado Connect,subscriber code,integration failed" },
  { label: "CRT & Non-SF UIs", query: "CRT,Workday,robotic testing,recorder" },
  { label: "Agentia AI", query: "Agentia,Copado AI,test agent" },
];

interface ProofItem {
  type: "Case" | "Gong";
  id: string;
  date: string;
  keyword: string;
  snippet: string;
}

interface AccountSignal {
  accountName: string;
  signalLevel: "HIGH" | "MEDIUM" | "LOW";
  primaryPlay: string;
  gongCount: number;
  caseCount: number;
  totalMentions: number;
  lastDate: string;
  proofList: ProofItem[];
  owners: Set<string>;
}

// Extended Noise Filter: Blocks OOO replies, automated voicemails, and receptionist switchboards
const isNoiseText = (text: string, subject?: string): boolean => {
  const combined = `${subject || ""} ${text}`.toLowerCase();
  return (
    combined.includes("automatic reply:") ||
    combined.includes("out of the office") ||
    combined.includes("ooo") ||
    combined.includes("to request access:") ||
    combined.includes("on vacation") ||
    combined.includes("please rate our performance") ||
    combined.includes("please leave your message") ||
    combined.includes("transferred to") ||
    combined.includes("forwarded to voice") ||
    combined.includes("automated attendant") ||
    combined.includes("leave a message after the tone") ||
    combined.includes("your call has been forwarded")
  );
};

const isWithinPast730Days = (dateStr: string | null | undefined): boolean => {
  if (!dateStr || dateStr === "N/A" || dateStr === "null") return true;
  try {
    const cleanStr = dateStr.trim().split(" ")[0];
    const timestamp = Date.parse(cleanStr);
    if (isNaN(timestamp)) return true;
    const twoYearsAgo = Date.now() - 730 * 24 * 60 * 60 * 1000;
    return timestamp >= twoYearsAgo;
  } catch {
    return true;
  }
};

const determinePrimaryPlay = (snippetsText: string): string => {
  const lower = snippetsText.toLowerCase();
  if (lower.includes("agentia") || lower.includes("test agent") || lower.includes("copado ai")) {
    return "Copado Agentia AI";
  }
  if (lower.includes("workday") || lower.includes("crt") || lower.includes("recorder") || lower.includes("robotic")) {
    return "CRT & Non-Salesforce Testing";
  }
  if (lower.includes("copado connect") || lower.includes("subscriber code") || lower.includes("integration failed")) {
    return "Copado Connect Repair";
  }
  if (lower.includes("change request") || lower.includes("cab approval") || lower.includes("change management")) {
    return "Change Management Automation";
  }
  return "ServiceNow Integration";
};

export const ServiceNowSignalsTab = () => {
  const [keyword, setKeyword] = useState<string>("");
  const [selectedKeyword, setSelectedKeyword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [progressStage, setProgressStage] = useState<number>(0);
  const [progressText, setProgressText] = useState<string>("");
  const [accountSignals, setAccountSignals] = useState<AccountSignal[]>([]);
  const [searched, setSearched] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showResults, setShowResults] = useState<boolean>(true);
  const [animatedPlaceholder, setAnimatedPlaceholder] = useState("Type keyword or variation...");

  useEffect(() => {
    const prewarmContainer = async () => {
      try {
        await supabase.functions.invoke("gong-it", {
          body: { accountName: "ping", daysBack: 1 },
        });
      } catch {
        // Silent warm-up
      }
    };
    prewarmContainer();

    const queries = ["ServiceNow", "Change Request", "Copado Connect", "CRT for SNOW", "Workday", "SNOW"];
    let queryIndex = 0;
    let charIndex = "ServiceNow".length;
    let deleting = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const tick = () => {
      const current = queries[queryIndex];
      if (!current) return;

      if (!deleting && charIndex <= current.length) {
        setAnimatedPlaceholder(current.slice(0, charIndex));
        charIndex += 1;

        if (charIndex > current.length) {
          deleting = true;
          timeoutId = setTimeout(tick, 1500);
          return;
        }
      }

      if (deleting) {
        setAnimatedPlaceholder(current.slice(0, Math.max(0, charIndex - 1)));
        charIndex -= 1;

        if (charIndex <= 0) {
          deleting = false;
          queryIndex = (queryIndex + 1) % queries.length;
          charIndex = 0;
          timeoutId = setTimeout(tick, 100);
          return;
        }
      }

      timeoutId = setTimeout(tick, deleting ? 50 : 100);
    };

    timeoutId = setTimeout(tick, 100);
    return () => { if (timeoutId) clearTimeout(timeoutId); };
  }, []);

  const runSignalScan = async (rawInput: string, isBatchAll = false) => {
    const trimmed = rawInput.trim();
    if (!trimmed && !isBatchAll) return;

    const searchLabel = isBatchAll ? "ALL Expansion Signals" : trimmed;
    setKeyword(trimmed);
    setSelectedKeyword(searchLabel);
    setLoading(true);
    setProgressStage(1);
    setProgressText("Building customer account & email domain directory...");
    setErrorMsg(null);
    setSearched(true);
    setShowResults(true);

    try {
      const domainToAccount = new Map<string, string>();
      const knownCustomerAccounts = new Set<string>();

      try {
        const { data: allCaseData } = await supabase
          .from("support_cases")
          .select("account_name, contact_email")
          .not("account_name", "is", null)
          .limit(2500);

        (allCaseData || []).forEach((c: any) => {
          const acc = c.account_name?.trim();
          if (acc && acc !== "null" && !acc.toLowerCase().includes("copado")) {
            knownCustomerAccounts.add(acc);
          }

          if (acc && c.contact_email && c.contact_email.includes("@")) {
            const domain = c.contact_email.split("@")[1]?.toLowerCase().trim();
            if (domain && !["copado.com", "gmail.com", "yahoo.com", "outlook.com", "salesforce.com", "hotmail.com"].includes(domain)) {
              domainToAccount.set(domain, acc);
              if (domain.includes("-external.")) {
                domainToAccount.set(domain.replace("-external.", "."), acc);
              }
            }
          }
        });
      } catch (domainErr) {
        console.warn("Domain directory query fallback:", domainErr);
      }

      setProgressStage(2);
      setProgressText(`Querying cases & Gong calls for "${searchLabel}" (730-day timebox)...`);

      // Define target query terms
      const searchTerms = isBatchAll
        ? ["ServiceNow", "SNOW", "ITSM", "Change Request", "Copado Connect", "CRT", "Workday", "Agentia"]
        : trimmed.split(",").map((t) => t.trim()).filter(Boolean);

      // Execute separate clean PostgREST queries to avoid parser errors
      let rawCases: any[] = [];
      const casePromises = searchTerms.map(async (term) => {
        try {
          const { data: subSubject } = await supabase
            .from("support_cases")
            .select("*")
            .ilike("subject", `%${term}%`)
            .order("date_opened", { ascending: false })
            .limit(100);

          const { data: subDesc } = await supabase
            .from("support_cases")
            .select("*")
            .ilike("description", `%${term}%`)
            .order("date_opened", { ascending: false })
            .limit(100);

          return [...(subSubject || []), ...(subDesc || [])];
        } catch {
          return [];
        }
      });

      const caseResults = await Promise.all(casePromises);
      const combinedCasesMap = new Map<string, any>();
      caseResults.flat().forEach((c: any) => {
        if (c && c.id && isWithinPast730Days(c.date_opened)) {
          combinedCasesMap.set(String(c.id), c);
        }
      });
      rawCases = Array.from(combinedCasesMap.values());

      // Query Gong Edge Function across key terms
      let rawTranscripts: any[] = [];
      const gongPromises = searchTerms.slice(0, 3).map(async (term) => {
        try {
          const res = await supabase.functions.invoke("gong-it", {
            body: { accountName: term, daysBack: 730 },
          });
          return res.data?.transcripts || [];
        } catch {
          return [];
        }
      });

      const gongResults = await Promise.all(gongPromises);
      const combinedGongMap = new Map<string, any>();
      gongResults.flat().forEach((t: any) => {
        if (t && t.callId) {
          combinedGongMap.set(String(t.callId), t);
        }
      });
      rawTranscripts = Array.from(combinedGongMap.values());

      setProgressStage(3);
      setProgressText("Linking Gong calls to Account Names & ranking HIGH signals...");

      const accountMap = new Map<string, AccountSignal>();

      const getOrCreateAccountRecord = (accName: string): AccountSignal => {
        if (!accountMap.has(accName)) {
          accountMap.set(accName, {
            accountName: accName,
            signalLevel: "LOW",
            primaryPlay: "ServiceNow Integration",
            gongCount: 0,
            caseCount: 0,
            totalMentions: 0,
            lastDate: "N/A",
            proofList: [],
            owners: new Set<string>(),
          });
        }
        return accountMap.get(accName)!;
      };

      // Process Cases (Deduplicated per case_number)
      rawCases.forEach((c: any) => {
        const accName = c.account_name && c.account_name !== "null" ? c.account_name.trim() : "Unassigned Account";
        if (accName.toLowerCase().includes("copado")) return;

        const record = getOrCreateAccountRecord(accName);
        record.caseCount += 1;
        if (c.case_owner && c.case_owner !== "null") record.owners.add(c.case_owner);

        const caseDate = c.date_opened ? new Date(c.date_opened).toLocaleDateString() : "N/A";
        if (record.lastDate === "N/A" || caseDate > record.lastDate) record.lastDate = caseDate;

        const caseId = String(c.case_number || c.id || "Case");
        const alreadyExists = record.proofList.some((p) => p.type === "Case" && p.id === caseId);

        let cleanDesc = (c.description || "").replace(/<[^>]*>?/gm, "").replace(/\s+/g, " ").trim();
        if (cleanDesc.toLowerCase().includes("no description provided") || cleanDesc.length < 3) {
          cleanDesc = `Subject Match: ${c.subject || "No Subject"}`;
        }

        if (!alreadyExists && !isNoiseText(cleanDesc, c.subject)) {
          record.totalMentions += 1;
          record.proofList.push({
            type: "Case",
            id: caseId,
            date: caseDate,
            keyword: searchLabel,
            snippet: `[Case ${caseId}] ${c.subject}: ${cleanDesc.substring(0, 160)}...`,
          });
        }
      });

      // Process Gong Calls (Deduplicated per callId & noise filtered)
      rawTranscripts.forEach((t: any) => {
        let matchedAccount: string | null = null;
        const parties: string[] = Array.isArray(t.parties) ? t.parties : [];
        const callTitle: string = String(t.title || "").toLowerCase();

        for (const email of parties) {
          if (typeof email !== "string") continue;
          const domain = email.split("@")[1]?.toLowerCase().trim();
          if (domain && !["copado.com", "gmail.com", "yahoo.com", "outlook.com", "salesforce.com", "hotmail.com"].includes(domain)) {
            if (domainToAccount.has(domain)) {
              matchedAccount = domainToAccount.get(domain)!;
              break;
            } else {
              const cleanCompany = domain.split(".")[0];
              matchedAccount = cleanCompany.charAt(0).toUpperCase() + cleanCompany.slice(1);
              break;
            }
          }
        }

        if (!matchedAccount) {
          for (const acc of knownCustomerAccounts) {
            if (acc.length > 3 && callTitle.includes(acc.toLowerCase())) {
              matchedAccount = acc;
              break;
            }
          }
        }

        if (matchedAccount && !matchedAccount.toLowerCase().includes("copado")) {
          const fullText = (t.transcript || [])
            .map((m: any) => (m.sentences || []).map((s: any) => s.text).join(" "))
            .join(" ")
            .replace(/\s+/g, " ")
            .trim();

          const callId = String(t.callId);

          // Skip voicemails, operator banter, or empty transcripts
          if (fullText.length > 20 && !isNoiseText(fullText, t.title)) {
            const record = getOrCreateAccountRecord(matchedAccount);
            record.gongCount += 1;

            const alreadyExists = record.proofList.some((p) => p.type === "Gong" && p.id === callId);
            if (!alreadyExists) {
              record.totalMentions += 1;
              record.proofList.push({
                type: "Gong",
                id: callId,
                date: new Date().toLocaleDateString(),
                keyword: searchLabel,
                snippet: `[Gong Call ${callId}] ${fullText.substring(0, 160)}...`,
              });
            }
          }
        }
      });

      // Filter out empty proof accounts and rank priority signals
      const validAccounts = Array.from(accountMap.values())
        .filter((acc) => acc.proofList.length > 0 && !acc.accountName.toLowerCase().includes("copado"))
        .map((acc) => {
          const combinedProofText = acc.proofList.map((p) => p.snippet).join(" ");
          const play = determinePrimaryPlay(combinedProofText);

          let level: "HIGH" | "MEDIUM" | "LOW" = "LOW";
          if (acc.gongCount > 0 && acc.caseCount > 0) {
            level = "HIGH";
          } else if (acc.gongCount >= 2 || acc.caseCount >= 2 || acc.totalMentions >= 2) {
            level = "MEDIUM";
          }

          return { ...acc, primaryPlay: play, signalLevel: level };
        });

      validAccounts.sort((a, b) => {
        const weight = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        return weight[b.signalLevel] - weight[a.signalLevel];
      });

      setAccountSignals(validAccounts);
    } catch (err: any) {
      console.error("ServiceNow Signal Scan Error:", err);
      setErrorMsg(`Signal Scan Notice: ${err?.message || String(err)}`);
      setAccountSignals([]);
    } finally {
      setLoading(false);
      setProgressStage(0);
      setProgressText("");
    }
  };

  const exportSignalsToCsv = () => {
    if (accountSignals.length === 0) return;

    let csv =
      "Account Name,Primary Expansion Play,Signal Priority,Total Proof Mentions,Gong Calls Count,Support Cases Count,Last Activity Date,Key Owners,Evidence & Proof Log\n";

    accountSignals.forEach((acc) => {
      const ownersStr = Array.from(acc.owners).join("; ") || "N/A";
      const proofLogStr = acc.proofList
        .map((p) => `[${p.date} ${p.type} ${p.id} (${p.keyword})]: ${p.snippet.replace(/"/g, '""')}`)
        .join(" | ");

      csv += `"${acc.accountName}","${acc.primaryPlay}",${acc.signalLevel},${acc.totalMentions},${acc.gongCount},${acc.caseCount},"${acc.lastDate}","${ownersStr}","${proofLogStr || "No key snippets logged."}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    saveAs(
      blob,
      `ServiceNow_Target_Evidence_${(selectedKeyword || "Search").replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

  const getPriorityBadge = (level: "HIGH" | "MEDIUM" | "LOW") => {
    if (level === "HIGH") return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
    if (level === "MEDIUM") return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    return "bg-muted text-muted-foreground border-border";
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8 relative">
      <div className="relative text-center space-y-3 pt-4 pb-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
          <span>ServiceNow Signal Engine ⚡</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
          What ServiceNow signal or keyword are we scanning today?
        </h1>
        <p className="text-muted-foreground text-sm max-w-xl mx-auto leading-relaxed">
          Aggregates Gong calls and support cases into verified priority signals with audit proof for Dreamforce campaign targeting.
        </p>
      </div>

      <div className="pt-1 flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={() => runSignalScan("", true)}
          disabled={loading}
          className="text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-300 border border-amber-500/30 rounded-full px-3.5 py-1.5 transition-all shadow-sm flex items-center gap-1.5 shrink-0"
        >
          <Zap className="w-3.5 h-3.5 fill-current" />
          <span>Batch Scan All Target Signals</span>
        </button>

        {PRESET_CHIPS.map((chip) => (
          <button
            key={chip.label}
            onClick={() => { setKeyword(chip.label); runSignalScan(chip.query); }}
            disabled={loading}
            className="text-xs bg-muted/60 hover:bg-primary/10 hover:border-primary/40 text-muted-foreground hover:text-foreground border border-border rounded-full px-3 py-1 transition-all disabled:opacity-50"
          >
            {chip.label}
          </button>
        ))}
      </div>

      <div className="bg-card border border-border p-2 sm:p-3 rounded-2xl shadow-sm">
        <form onSubmit={(e) => { e.preventDefault(); runSignalScan(keyword); }} className="flex items-center gap-2">
          <Search className="w-5 h-5 text-primary ml-3 shrink-0" />
          <input
            type="text"
            placeholder={animatedPlaceholder || "Type keyword or variation..."}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            disabled={loading}
            className="w-full bg-transparent border-none text-foreground text-base placeholder:text-muted-foreground focus:outline-none focus:ring-0 px-2 py-2"
          />

          {loading ? (
            <button
              type="button"
              onClick={() => setLoading(false)}
              className="bg-rose-600/10 hover:bg-rose-600/20 text-rose-500 border border-rose-500/30 font-semibold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-all text-xs shrink-0"
            >
              <XCircle className="w-4 h-4" />
              <span>Cancel</span>
            </button>
          ) : (
            <button
              type="submit"
              disabled={!keyword.trim()}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-6 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-md disabled:opacity-40 shrink-0"
            >
              <ArrowRight className="w-4 h-4" />
              <span>Scan Signal</span>
            </button>
          )}
        </form>

        {loading && (
          <div className="mt-3 pt-3 border-t border-border px-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-primary font-medium flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                {progressText}
              </span>
              <span className="text-muted-foreground italic font-mono">Stage {progressStage}/3</span>
            </div>
            <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-700 ease-out"
                style={{ width: `${(progressStage / 3) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-foreground">
          {searched ? `Found ${accountSignals.length} Account Targets for "${selectedKeyword}"` : "Ready to scan"}
        </span>

        {accountSignals.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowResults((current) => !current)}
              className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] font-medium text-foreground hover:border-primary/60 transition-colors"
            >
              {showResults ? "Hide Results" : "Show Results"}
            </button>

            <button
              type="button"
              onClick={exportSignalsToCsv}
              className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-1.5 text-[11px] font-medium text-primary hover:bg-primary/10 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV Proof
            </button>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 p-4 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {!loading && searched && accountSignals.length === 0 && !errorMsg && (
        <div className="text-center py-12 bg-card border border-border rounded-2xl space-y-2 shadow-sm">
          <p className="text-sm font-semibold text-foreground">No accounts matched this signal</p>
          <p className="text-xs text-muted-foreground">Try clicking "Batch Scan All Target Signals" above to sweep across all product expansion plays.</p>
        </div>
      )}

      {!loading && showResults && accountSignals.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          {accountSignals.map((acc, idx) => (
            <div key={idx} className="bg-card border border-border p-4 rounded-xl space-y-3 hover:border-primary/40 transition-colors shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground">{acc.accountName}</h3>
                  <span className="text-[10px] text-primary font-semibold font-mono">
                    Play: {acc.primaryPlay}
                  </span>
                </div>
                <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${getPriorityBadge(acc.signalLevel)}`}>
                  {acc.signalLevel} SIGNAL
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
                <span className="flex items-center gap-1 text-emerald-500 font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" /> {acc.totalMentions} Proof Mentions
                </span>
                <span className="flex items-center gap-1 text-amber-500">
                  <Phone className="w-3 h-3" /> {acc.gongCount} Calls
                </span>
                <span className="flex items-center gap-1 text-blue-500">
                  <FileText className="w-3 h-3" /> {acc.caseCount} Cases
                </span>
              </div>

              {acc.proofList.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase">
                    Proof Audit Snippets ({acc.proofList.length})
                  </p>
                  <div className="max-h-[140px] overflow-y-auto space-y-1 pr-1">
                    {acc.proofList.slice(0, 3).map((item, pIdx) => (
                      <p key={pIdx} className="text-[11px] text-muted-foreground font-mono bg-muted/30 p-2 rounded-lg border border-border/40 line-clamp-2">
                        {item.snippet}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/40">
                <span>Owners: {Array.from(acc.owners).join(", ") || "N/A"}</span>
                <span>Last: {acc.lastDate}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};