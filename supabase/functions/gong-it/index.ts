import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MAX_CALLS_TO_PROCESS = 200;
const TRANSCRIPT_BATCH_SIZE = 50;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { accountName, daysBack = 365 } = await req.json();

    if (!accountName || typeof accountName !== "string") {
      return new Response(
        JSON.stringify({ error: "accountName is required" }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
          status: 400,
        }
      );
    }

    const gongAccessKey = Deno.env.get("GONG_ACCESS_KEY") || "";
    const gongSecretKey = Deno.env.get("GONG_SECRET_KEY") || "";
    const supabaseServiceKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase environment variables are missing");
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseServiceKey
    );

    // ---------------------------------------------------------
    // 1. Fetch Support Cases from Supabase
    // ---------------------------------------------------------

    const { data: cases, error: caseErr } = await supabase
      .from("support_cases")
      .select("*")
      .ilike("account_name", `%${accountName}%`)
      .order("date_opened", { ascending: false });

    if (caseErr) {
      throw new Error(`Supabase error: ${caseErr.message}`);
    }

    // ---------------------------------------------------------
    // 2. Extract Customer Email Domains
    // ---------------------------------------------------------

    const ignoredDomains = new Set([
      "copado.com",
      "gmail.com",
      "yahoo.com",
      "hotmail.com",
      "outlook.com",
      "salesforce.com",
    ]);

    const autoDomains = new Set<string>();

    (cases || []).forEach((c: any) => {
      const email = c.contact_email?.toLowerCase().trim();

      if (!email || !email.includes("@")) {
        return;
      }

      const parts = email.split("@");

      if (parts.length !== 2) {
        return;
      }

      const domain = parts[1];

      if (domain && !ignoredDomains.has(domain)) {
        autoDomains.add(domain);
      }
    });

    // ---------------------------------------------------------
    // 3. Prepare Gong Search
    // ---------------------------------------------------------

    let gongTranscripts: any[] = [];
    const matchedCallIds: string[] = [];

    if (gongAccessKey && gongSecretKey) {
      const authHeader =
        "Basic " +
        btoa(`${gongAccessKey}:${gongSecretKey}`);

      const startDate = new Date(
        Date.now() - Number(daysBack) * 24 * 60 * 60 * 1000
      ).toISOString();

      const normalizedAccountName = accountName
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      const keywords = normalizedAccountName
        .split(" ")
        .filter((word: string) => word.length > 3);

      const domainList = Array.from(autoDomains);

      // -------------------------------------------------------
      // 4. Fetch Gong Calls With Pagination
      // -------------------------------------------------------

      let cursor: string | null = null;
      let hasMore = true;

      while (hasMore && matchedCallIds.length < MAX_CALLS_TO_PROCESS) {
        const params = new URLSearchParams({
          fromDateTime: startDate,
        });

        if (cursor) {
          params.set("cursor", cursor);
        }

        const callsRes = await fetch(
          `https://api.gong.io/v2/calls?${params.toString()}`,
          {
            headers: {
              Authorization: authHeader,
              "Content-Type": "application/json",
            },
          }
        );

        if (!callsRes.ok) {
          const errorText = await callsRes.text();

          console.error(
            "Gong Calls API Error:",
            callsRes.status,
            errorText
          );

          throw new Error(
            `Gong Calls API returned ${callsRes.status}`
          );
        }

        const callsData = await callsRes.json();

        const calls = callsData.calls || [];

        for (const c of calls) {
          if (matchedCallIds.length >= MAX_CALLS_TO_PROCESS) {
            break;
          }

          const title = String(c.title || "").toLowerCase();

          const parties = (c.parties || [])
            .map((p: any) =>
              String(p.emailAddress || "").toLowerCase().trim()
            )
            .filter(Boolean);

          // -----------------------------------------------
          // Match #1: Exact customer email domain
          // -----------------------------------------------

          const domainMatch = parties.some((email: string) =>
            domainList.some((domain) =>
              email.endsWith(`@${domain}`)
            )
          );

          // -----------------------------------------------
          // Match #2: Account name in call title
          // Require the meaningful account name rather
          // than matching generic words like "company".
          // -----------------------------------------------

          const accountNameMatch =
            normalizedAccountName.length > 3 &&
            title.includes(normalizedAccountName);

          // -----------------------------------------------
          // Match #3: Multiple meaningful keywords
          // -----------------------------------------------

          const matchingKeywordCount = keywords.filter(
            (keyword: string) => title.includes(keyword)
          ).length;

          const keywordMatch =
            keywords.length > 0 &&
            matchingKeywordCount >=
              Math.min(2, keywords.length);

          // -----------------------------------------------
          // Match #4: Customer email contains account keyword
          // -----------------------------------------------

          const emailKeywordMatch = parties.some(
            (email: string) =>
              keywords.some((keyword: string) =>
                email.split("@")[0].includes(keyword)
              )
          );

          if (
            domainMatch ||
            accountNameMatch ||
            keywordMatch ||
            emailKeywordMatch
          ) {
            matchedCallIds.push(String(c.id));
          }
        }

        // ---------------------------------------------------
        // Gong pagination
        // ---------------------------------------------------

        cursor =
          callsData.records?.cursor ||
          callsData.cursor ||
          null;

        hasMore = Boolean(cursor && calls.length > 0);

        if (calls.length === 0) {
          hasMore = false;
        }
      }

      // -------------------------------------------------------
      // 5. Remove Duplicate Call IDs
      // -------------------------------------------------------

      const uniqueCallIds = [
        ...new Set(matchedCallIds),
      ];

      // -------------------------------------------------------
      // 6. Fetch Gong Transcripts In Batches
      // -------------------------------------------------------

      for (
        let i = 0;
        i < uniqueCallIds.length;
        i += TRANSCRIPT_BATCH_SIZE
      ) {
        const batch = uniqueCallIds.slice(
          i,
          i + TRANSCRIPT_BATCH_SIZE
        );

        const transRes = await fetch(
          "https://api.gong.io/v2/calls/transcript",
          {
            method: "POST",
            headers: {
              Authorization: authHeader,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              filter: {
                callIds: batch,
              },
            }),
          }
        );

        if (!transRes.ok) {
          const errorText = await transRes.text();

          console.error(
            "Gong Transcript API Error:",
            transRes.status,
            errorText
          );

          continue;
        }

        const transData = await transRes.json();

        if (Array.isArray(transData.callTranscripts)) {
          gongTranscripts.push(
            ...transData.callTranscripts
          );
        }
      }
    }

    // ---------------------------------------------------------
    // 7. Return Customer Data
    // ---------------------------------------------------------

    return new Response(
      JSON.stringify({
        accountName,
        daysBack: Number(daysBack),
        supportCaseCount: cases?.length || 0,
        gongCallCount: matchedCallIds.length,
        transcriptCount: gongTranscripts.length,
        autoDomains: Array.from(autoDomains),
        cases: cases || [],
        transcripts: gongTranscripts,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 200,
      }
    );
  } catch (err: any) {
    console.error("Customer Briefcase Function Error:", err);

    return new Response(
      JSON.stringify({
        error: err?.message || "Unknown error",
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 500,
      }
    );
  }
});