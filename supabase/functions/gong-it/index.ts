import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { accountName, daysBack = 365 } = await req.json();

    if (!accountName) {
      return new Response(JSON.stringify({ error: "accountName is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const gongAccessKey = Deno.env.get("GONG_ACCESS_KEY") || "";
    const gongSecretKey = Deno.env.get("GONG_SECRET_KEY") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch Support Cases from Supabase
    const { data: cases, error: caseErr } = await supabase
      .from("support_cases")
      .select("*")
      .ilike("account_name", `%${accountName}%`)
      .order("date_opened", { ascending: false });

    if (caseErr) throw caseErr;

    // 2. Auto-Extract Customer Email Domains
    const ignoredDomains = new Set(["copado.com", "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "salesforce.com"]);
    const autoDomains = new Set<string>();

    (cases || []).forEach((c) => {
      const email = c.contact_email?.toLowerCase().trim();
      if (email && email.includes("@")) {
        const domain = email.split("@")[1];
        if (domain && !ignoredDomains.has(domain)) {
          autoDomains.add(domain);
        }
      }
    });

    // 3. Scan Gong API for Calls
    let gongTranscripts: any[] = [];
    if (gongAccessKey && gongSecretKey) {
      const authHeader = "Basic " + btoa(`${gongAccessKey}:${gongSecretKey}`);
      const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();
      const keywords = accountName.toLowerCase().split(" ").filter((w: string) => w.length > 2);
      const domainList = Array.from(autoDomains);

      const callsRes = await fetch(`https://api.gong.io/v2/calls?fromDateTime=${startDate}`, {
        headers: { Authorization: authHeader, "Content-Type": "application/json" },
      });

      if (callsRes.ok) {
        const callsData = await callsRes.json();
        const matchedCallIds: string[] = [];

        (callsData.calls || []).forEach((c: any) => {
          const title = (c.title || "").toLowerCase();
          const parties = (c.parties || []).map((p: any) => (p.emailAddress || "").toLowerCase());

          const titleMatch = keywords.some((kw: string) => title.includes(kw));
          const domainMatch = parties.some((email: string) => domainList.some((dom) => email.includes(dom)));
          const emailKwMatch = parties.some((email: string) => keywords.some((kw: string) => email.includes(kw)));

          if (titleMatch || domainMatch || emailKwMatch) {
            matchedCallIds.push(c.id);
          }
        });

        // 4. Fetch Call Transcripts
        if (matchedCallIds.length > 0) {
          const transRes = await fetch("https://api.gong.io/v2/calls/transcript", {
            method: "POST",
            headers: { Authorization: authHeader, "Content-Type": "application/json" },
            body: JSON.stringify({ filter: { callIds: matchedCallIds } }),
          });

          if (transRes.ok) {
            const transData = await transRes.json();
            gongTranscripts = transData.callTranscripts || [];
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        accountName,
        cases: cases || [],
        autoDomains: Array.from(autoDomains),
        transcripts: gongTranscripts,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});