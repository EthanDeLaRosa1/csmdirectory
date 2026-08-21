import React, { useState } from "react";
import { Search, Download, FileText, Phone, Sparkles, CheckCircle2, Loader2 } from "lucide-react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { supabase } from "@/integrations/supabase/client";

export const GongItTab = () => {
  const [accountName, setAccountName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountName.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("gong-it", {
        body: { accountName: accountName.trim(), daysBack: 365 },
      });

      if (error) throw error;
      setResult(data);
    } catch (err: any) {
      console.error("Gong It error:", err);
    } finally {
      setLoading(false);
    }
  };

  const downloadNotebookLMBundle = () => {
    if (!result) return;
    const zip = new JSZip();

    // 1. Support Cases Report
    let casesText = `=== SUPPORT CASES REPORT: ${result.accountName.toUpperCase()} ===\n\n`;
    if (result.cases.length === 0) {
      casesText += "No support cases recorded.\n";
    } else {
      result.cases.forEach((c: any) => {
        casesText += `Case Number: ${c.case_number}\n`;
        casesText += `Subject: ${c.subject}\n`;
        casesText += `Status: ${c.status}\n`;
        casesText += `Owner: ${c.case_owner}\n`;
        casesText += `Date Opened: ${c.date_opened}\n`;
        casesText += `Contact Email: ${c.contact_email}\n`;
        casesText += `Description:\n${c.description}\n`;
        casesText += "------------------------------------------------------------\n\n";
      });
    }
    zip.file("1_Support_Cases_Report.txt", casesText);

    // 2. Gong Transcripts
    let gongText = `=== GONG CALL TRANSCRIPTS: ${result.accountName.toUpperCase()} ===\n\n`;
    if (result.transcripts.length === 0) {
      gongText += "No Gong call transcripts found for this timeframe.\n";
    } else {
      result.transcripts.forEach((t: any) => {
        gongText += `Call ID: ${t.callId}\n`;
        (t.transcript || []).forEach((m: any) => {
          const sentences = (m.sentences || []).map((s: any) => s.text).join(" ");
          gongText += `[${m.speakerId || "Speaker"}]: ${sentences}\n`;
        });
        gongText += "\n============================================================\n\n";
      });
    }
    zip.file("2_Gong_Transcripts.txt", gongText);

    // 3. Walt's NotebookLM Prompt Cheat Sheet
    const promptText = `=== WALT'S "GONG IT" NOTEBOOK LM PROMPTS ===
Customer: ${result.accountName}

PROMPT 1 (Initial Source Analysis):
"Referencing all uploaded sources on ${result.accountName}, summarize their budgeting, hiring, company initiatives, and DevOps team structure."

PROMPT 2 (Churn Risk & Action Plan):
"Referencing recent transcripts, emails, and support cases, generate what are ${result.accountName}'s strategic initiatives and priorities. Include Gong's response on the customer's issue and churn risk, and how we can save them."

PROMPT 3 (Copado AI Plan Input):
"I have uploaded an artifact from NotebookLM that gives a comprehensive overview of ${result.accountName} and their goals, strengths, and pain points. Build a plan to address their problems that we can present to them."
`;
    zip.file("3_NotebookLM_Prompt_CheatSheet.txt", promptText);

    zip.generateAsync({ type: "blob" }).then((content) => {
      saveAs(content, `GongIt_Artifacts_${result.accountName.replace(/\s+/g, "_")}.zip`);
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-xl border border-indigo-500/20 shadow-xl">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="w-6 h-6 text-indigo-400" />
          <h2 className="text-xl font-bold text-white">Walt's "Gong It" Artifact Generator</h2>
        </div>
        <p className="text-slate-400 text-sm">
          Enter an Account Name to extract support cases from Supabase & Gong transcripts, then package them directly into a NotebookLM artifact bundle.
        </p>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mt-4 flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Enter Account Name (e.g. Jeppesen, Brenntag, Travelers)..."
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-6 py-2.5 rounded-lg flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {loading ? "Gathering..." : "Gong It"}
          </button>
        </form>
      </div>

      {/* Results View */}
      {result && (
        <div className="space-y-6">
          {/* Download Action Bar */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span className="text-slate-200 font-medium">
                Found {result.cases.length} Support Case(s) & {result.transcripts.length} Gong Transcript(s) for <strong className="text-white">{result.accountName}</strong>
              </span>
            </div>
            <button
              onClick={downloadNotebookLMBundle}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-5 py-2 rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-emerald-900/20"
            >
              <Download className="w-4 h-4" />
              Download NotebookLM Bundle (.zip)
            </button>
          </div>

          {/* Dual Columns Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Support Cases Column */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                <FileText className="w-5 h-5 text-blue-400" />
                <h3 className="text-white font-semibold">Support Cases (Supabase)</h3>
                <span className="ml-auto bg-blue-500/10 text-blue-400 text-xs px-2.5 py-1 rounded-full font-medium">
                  {result.cases.length} Total
                </span>
              </div>
              <div className="max-h-[500px] overflow-y-auto space-y-3 pr-2">
                {result.cases.length === 0 ? (
                  <p className="text-slate-500 text-sm italic">No support cases found for this account.</p>
                ) : (
                  result.cases.map((c: any) => (
                    <div key={c.id} className="bg-slate-800/50 border border-slate-700/50 p-3.5 rounded-lg space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-indigo-400 font-mono text-xs font-semibold">{c.case_number}</span>
                        <span className="text-slate-400 text-xs">{c.date_opened}</span>
                      </div>
                      <p className="text-white text-sm font-medium line-clamp-1">{c.subject}</p>
                      <p className="text-slate-400 text-xs line-clamp-2">{c.description || "No description provided."}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Gong Transcripts Column */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                <Phone className="w-5 h-5 text-amber-400" />
                <h3 className="text-white font-semibold">Gong Transcripts (Gong API)</h3>
                <span className="ml-auto bg-amber-500/10 text-amber-400 text-xs px-2.5 py-1 rounded-full font-medium">
                  {result.transcripts.length} Calls Matched
                </span>
              </div>
              <div className="max-h-[500px] overflow-y-auto space-y-3 pr-2">
                {result.transcripts.length === 0 ? (
                  <p className="text-slate-500 text-sm italic">No recent Gong transcripts found for this account.</p>
                ) : (
                  result.transcripts.map((t: any) => (
                    <div key={t.callId} className="bg-slate-800/50 border border-slate-700/50 p-3.5 rounded-lg space-y-1">
                      <span className="text-amber-400 font-mono text-xs font-semibold">Call ID: {t.callId}</span>
                      <p className="text-slate-300 text-xs line-clamp-3 font-mono">
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