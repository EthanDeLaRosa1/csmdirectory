import React, { useState } from "react";
import {
  Search,
  Download,
  FileText,
  Phone,
  Sparkles,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Copy,
  Check,
  Globe,
  Clock,
  Layers,
  Zap,
} from "lucide-react";
import { saveAs } from "file-saver";
import { supabase } from "@/lib/supabase";

const SAMPLE_ACCOUNTS = ["Brenntag", "Jeppesen", "Travelers", "Copado"];

export const GongItTab = () => {
  const [accountName, setAccountName] = useState("");
  const [loading, setLoading] = useState(false);
  const [progressStage, setProgressStage] = useState<number>(0);
  const [progressText, setProgressText] = useState<string>("");
  const [result, setResult] = useState<any>(null);
  const [copiedPromptIndex, setCopiedPromptIndex] = useState<number | null>(null);

  const executeSearch = async (targetAccount: string) => {
    if (!targetAccount.trim()) return;

    setLoading(true);
    setResult(null);
    setProgressStage(1);
    setProgressText("Querying Supabase database for high-value cases...");

    try {
      const timer1 = setTimeout(() => {
        setProgressStage(2);
        setProgressText("Extracting email domains & querying Gong API...");
      }, 1200);

      const timer2 = setTimeout(() => {
        setProgressStage(3);
        setProgressText("Synthesizing transcripts & building Markdown briefcase...");
      }, 2400);

      const { data, error } = await supabase.functions.invoke("gong-it", {
        body: { accountName: targetAccount.trim(), daysBack: 365 },
      });

      clearTimeout(timer1);
      clearTimeout(timer2);

      if (error) throw error;

      // Deduplicate cases by case_number
      const uniqueCasesMap = new Map();
      (data.cases || []).forEach((c: any) => {
        if (c.case_number && !uniqueCasesMap.has(c.case_number)) {
          uniqueCasesMap.set(c.case_number, c);
        }
      });

      setResult({
        ...data,
        cases: Array.from(uniqueCasesMap.values()),
      });
    } catch (err: any) {
      console.error("Gong It error:", err);
    } finally {
      setLoading(false);
      setProgressStage(0);
      setProgressText("");
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(accountName);
  };

  const handleChipClick = (account: string) => {
    setAccountName(account);
    executeSearch(account);
  };

  const copyPromptToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedPromptIndex(index);
    setTimeout(() => setCopiedPromptIndex(null), 2000);
  };

  const downloadSingleMarkdownArtifact = () => {
    if (!result) return;

    let md = `# WALT'S VAULT BRIEFCASE: ${result.accountName.toUpperCase()}\n`;
    md += `*Generated on: ${new Date().toLocaleDateString()} | Curated via Walt's Gong It Workflow*\n\n`;
    md += `---\n\n`;

    // 1. NotebookLM Suggested Prompts
    md += `## 1. WALT'S NOTEBOOK LM PROMPTS\n\n`;
    md += `**Prompt 1 (Initial Source Analysis):**\n`;
    md += `> "Referencing all uploaded sources on ${result.accountName}, summarize their budgeting, hiring, company initiatives, and DevOps team structure."\n\n`;
    md += `**Prompt 2 (Churn Risk & Strategic Priorities):**\n`;
    md += `> "Referencing recent transcripts, emails, and support cases, generate what are ${result.accountName}'s strategic initiatives and priorities. Include Gong's response on the customer's issue and churn risk, and how we can save them."\n\n`;
    md += `**Prompt 3 (Copado AI Plan Input):**\n`;
    md += `> "I have uploaded an artifact from NotebookLM that gives a comprehensive overview of ${result.accountName} and their goals, strengths, and pain points. Build a plan to address their problems that we can present to them."\n\n`;
    md += `---\n\n`;

    // 2. Support Cases Report
    md += `## 2. SUPPORT CASES REPORT (${result.cases.length} Unique Cases)\n\n`;
    if (result.cases.length === 0) {
      md += `*No active support cases recorded for this account.*\n\n`;
    } else {
      result.cases.forEach((c: any) => {
        const desc = c.description && c.description !== "null" ? c.description.trim() : "No description provided.";
        const email = c.contact_email && c.contact_email !== "null" ? c.contact_email : "N/A";

        md += `### Case ${c.case_number}: ${c.subject}\n`;
        md += `- **Status:** ${c.status || "N/A"}\n`;
        md += `- **Owner:** ${c.case_owner || "N/A"}\n`;
        md += `- **Date Opened:** ${c.date_opened || "N/A"}\n`;
        md += `- **Contact Email:** ${email}\n`;
        md += `- **Description:**\n${desc}\n\n`;
        md += `------------------------------------------------------------\n\n`;
      });
    }

    md += `---\n\n`;

    // 3. Gong Call Transcripts
    md += `## 3. GONG CALL TRANSCRIPTS (${result.transcripts?.length || 0} Calls Matched)\n\n`;
    if (!result.transcripts || result.transcripts.length === 0) {
      md += `*No recent Gong call transcripts matched this account.*\n\n`;
    } else {
      result.transcripts.forEach((t: any) => {
        md += `### Call ID: ${t.callId}\n\n`;
        (t.transcript || []).forEach((m: any) => {
          const sentences = (m.sentences || []).map((s: any) => s.text).join(" ");
          md += `**[${m.speakerId || "Speaker"}]**: ${sentences}\n\n`;
        });
        md += `============================================================\n\n`;
      });
    }

    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    saveAs(blob, `WaltsVault_${result.accountName.replace(/\s+/g, "_")}.md`);
  };

  const getStatusBadgeColor = (status: string) => {
    const lower = (status || "").toLowerCase();
    if (lower.includes("resolved") || lower.includes("closed"))
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    if (lower.includes("progress") || lower.includes("open"))
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    if (lower.includes("spam") || lower.includes("scope"))
      return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
    return "bg-muted text-muted-foreground border-border";
  };

  const prompts = [
    `Referencing all uploaded sources on ${accountName || "Customer"}, summarize their budgeting, hiring, company initiatives, and DevOps team structure.`,
    `Referencing recent transcripts, emails, and support cases, generate what are ${accountName || "Customer"}'s strategic initiatives and priorities. Include Gong's response on the customer's issue and churn risk, and how we can save them.`,
    `I have uploaded an artifact from NotebookLM that gives a comprehensive overview of ${accountName || "Customer"} and their goals, strengths, and pain points. Build a plan to address their problems that we can present to them.`,
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Hero Section */}
      <div className="relative text-center space-y-4 pt-6 pb-2 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl -z-10 pointer-events-none" />

        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
          <span>Walt's "Gong It" Intelligence Engine</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold text-foreground tracking-tight">
          What account are we analyzing today?
        </h1>
        <p className="text-muted-foreground text-sm max-w-xl mx-auto leading-relaxed">
          Pulls live support cases from Supabase & call transcripts from Gong into a single NotebookLM Briefcase.
        </p>

        {/* 1-Click Sample Chips */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium mr-1">
            <Zap className="w-3 h-3 text-amber-500" /> Try Sample:
          </span>
          {SAMPLE_ACCOUNTS.map((acc) => (
            <button
              key={acc}
              onClick={() => handleChipClick(acc)}
              disabled={loading}
              className="text-xs bg-muted/60 hover:bg-primary/10 hover:border-primary/40 text-muted-foreground hover:text-foreground border border-border rounded-full px-3 py-1 transition-all disabled:opacity-50"
            >
              {acc}
            </button>
          ))}
        </div>
      </div>

      {/* Centered Prompt Bar */}
      <div className="relative bg-card border border-border p-2 sm:p-3 rounded-2xl shadow-lg backdrop-blur-xl transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
        <form onSubmit={handleFormSubmit} className="flex items-center gap-2">
          <Search className="w-5 h-5 text-primary ml-3 shrink-0" />
          <input
            type="text"
            placeholder="Enter Account Name (e.g. Brenntag, Jeppesen, Travelers)..."
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            disabled={loading}
            className="w-full bg-transparent border-none text-foreground text-base placeholder:text-muted-foreground focus:outline-none focus:ring-0 px-2 py-2"
          />
          <button
            type="submit"
            disabled={loading || !accountName.trim()}
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-6 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-md disabled:opacity-40 shrink-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            <span>{loading ? "Gonging..." : "Gong It"}</span>
          </button>
        </form>

        {/* Multi-Stage Active Progress Indicator */}
        {loading && (
          <div className="mt-3 pt-3 border-t border-border px-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-primary font-medium flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                {progressText}
              </span>
              <span className="text-muted-foreground italic font-mono">Stage {progressStage}/3</span>
            </div>
            {/* Visual Progress Bar */}
            <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-700 ease-out"
                style={{ width: `${(progressStage / 3) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Results View */}
      {result && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Key Metrics & Download Action Banner */}
          <div className="bg-gradient-to-r from-card via-primary/5 to-card border border-primary/20 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                <h3 className="text-foreground font-bold text-lg">
                  {result.accountName} Briefcase Ready
                </h3>
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-1">
                <span className="flex items-center gap-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 px-2.5 py-1 rounded-md font-mono">
                  <FileText className="w-3.5 h-3.5 text-blue-500" /> {result.cases?.length || 0} Unique Cases
                </span>
                <span className="flex items-center gap-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-md font-mono">
                  <Phone className="w-3.5 h-3.5 text-amber-500" /> {result.transcripts?.length || 0} Gong Calls
                </span>
                {result.autoDomains?.length > 0 && (
                  <span className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-md font-mono">
                    <Globe className="w-3.5 h-3.5 text-emerald-500" /> {result.autoDomains.join(", ")}
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={downloadSingleMarkdownArtifact}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>Walt's Vault: NotebookLM Artifact</span>
            </button>
          </div>

          {/* Quick Copy Prompts Bar */}
          <div className="bg-card border border-border p-4 rounded-xl space-y-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" /> Walt's NotebookLM Prompts
            </span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {prompts.map((p, idx) => (
                <div key={idx} className="bg-muted/40 border border-border p-3 rounded-lg flex flex-col justify-between space-y-2">
                  <p className="text-foreground text-xs line-clamp-2 italic">"{p}"</p>
                  <button
                    onClick={() => copyPromptToClipboard(p, idx)}
                    className="self-end text-[11px] font-medium text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                  >
                    {copiedPromptIndex === idx ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedPromptIndex === idx ? "Copied!" : "Copy Prompt"}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Dual Columns Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Support Cases Column */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-border">
                <FileText className="w-4 h-4 text-blue-500" />
                <h3 className="text-foreground text-sm font-semibold">Support Cases</h3>
                <span className="ml-auto bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs px-2.5 py-0.5 rounded-full font-medium">
                  {result.cases?.length || 0} Total
                </span>
              </div>
              <div className="max-h-[480px] overflow-y-auto space-y-3 pr-2">
                {!result.cases || result.cases.length === 0 ? (
                  <p className="text-muted-foreground text-xs italic">No support cases found for this account.</p>
                ) : (
                  result.cases.map((c: any) => (
                    <div key={c.case_number} className="bg-muted/30 border border-border/60 p-3.5 rounded-xl space-y-2 hover:border-primary/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="text-primary font-mono text-xs font-bold">{c.case_number}</span>
                        <span className={`text-[10px] font-semibold border px-2 py-0.5 rounded-full ${getStatusBadgeColor(c.status)}`}>
                          {c.status || "N/A"}
                        </span>
                      </div>
                      <p className="text-foreground text-xs font-medium line-clamp-1">{c.subject}</p>
                      <p className="text-muted-foreground text-[11px] line-clamp-2">
                        {c.description && c.description !== "null" ? c.description : "No description provided."}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/50">
                        <span>Owner: {c.case_owner || "N/A"}</span>
                        <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> {c.date_opened}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Gong Transcripts Column */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-border">
                <Phone className="w-4 h-4 text-amber-500" />
                <h3 className="text-foreground text-sm font-semibold">Gong Transcripts</h3>
                <span className="ml-auto bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs px-2.5 py-0.5 rounded-full font-medium">
                  {result.transcripts?.length || 0} Calls
                </span>
              </div>
              <div className="max-h-[480px] overflow-y-auto space-y-3 pr-2">
                {!result.transcripts || result.transcripts.length === 0 ? (
                  <p className="text-muted-foreground text-xs italic">No recent Gong transcripts found for this account.</p>
                ) : (
                  result.transcripts.map((t: any) => (
                    <div key={t.callId} className="bg-muted/30 border border-border/60 p-3.5 rounded-xl space-y-2 hover:border-primary/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="text-amber-600 dark:text-amber-400 font-mono text-xs font-semibold flex items-center gap-1">
                          <Layers className="w-3 h-3" /> Call ID: {t.callId}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {t.transcript?.length || 0} Speakers
                        </span>
                      </div>
                      <p className="text-foreground text-[11px] line-clamp-3 font-mono bg-background/80 p-2 rounded-lg border border-border/50">
                        {(t.transcript || []).map((m: any) => (m.sentences || []).map((s: any) => s.text).join(" ")).join(" ")}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};