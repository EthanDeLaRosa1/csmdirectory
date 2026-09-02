import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MAX_CALLS_TO_PROCESS = 150;
const TRANSCRIPT_BATCH_SIZE = 50;
const MAX_GONG_SEARCH_DAYS = 365;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const COMMON_STOPWORDS = new Set([
  "the", "of", "and", "a", "an", "at", "by", "for", "in", "on", "to", "with",
  "association", "institute", "society", "foundation", "federation", "council",
  "board", "bureau", "agency", "trust", "union", "authority",
  "college", "university", "inc", "incorporated", "corp", "corporation",
  "llc", "ltd", "limited", "group", "services", "system", "systems",
  "technologies", "center", "hospital", "co", "company", "solutions",
  "department", "dept", "state"
]);

// SOQL Injection Protection
function sanitizeSoql(str: string): string {
  if (!str) return "";
  return str.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function extractBrandTokens(accountName: string): string[] {
  const cleaned = accountName.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  const rawTokens = cleaned.split(/\s+/).filter((w) => w.length > 0);
  const brandTokens = rawTokens.filter((w) => !COMMON_STOPWORDS.has(w));
  return brandTokens.length > 0 ? brandTokens : rawTokens;
}

function checkTitleMatch(accountName: string, title: string): boolean {
  const titleLower = (title || "").toLowerCase();
  const tokens = extractBrandTokens(accountName);
  
  const phrase = tokens.join(" ");
  if (phrase.length >= 3 && titleLower.includes(phrase)) {
    return true;
  }
  
  if (tokens.length === 1) {
    const t = tokens[0];
    return t.length >= 3 && titleLower.includes(t);
  } else {
    return tokens.every((t) => titleLower.includes(t));
  }
}

function extractDomainFromUrl(url: string): string | null {
  if (!url || typeof url !== "string") return null;
  try {
    const cleanUrl = url.startsWith("http") ? url : `https://${url}`;
    const parsed = new URL(cleanUrl);
    let hostname = parsed.hostname.toLowerCase();
    if (hostname.startsWith("www.")) hostname = hostname.slice(4);
    return hostname.includes(".") ? hostname : null;
  } catch {
    return null;
  }
}

async function getSalesforceAccessToken() {
  const sfInstanceUrl = Deno.env.get("SF_INSTANCE_URL") || Deno.env.get("SALESFORCE_INSTANCE_URL");
  const sfClientId = Deno.env.get("SF_CLIENT_ID");
  const sfRefreshToken = Deno.env.get("SF_REFRESH_TOKEN");

  if (!sfInstanceUrl || !sfRefreshToken) {
    return { error: "Missing SF_INSTANCE_URL or SF_REFRESH_TOKEN in environment secrets" };
  }

  try {
    const params = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: sfClientId || "",
      refresh_token: sfRefreshToken,
    });

    const tokenRes = await fetch(`${sfInstanceUrl}/services/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      return { error: `Token refresh failed (${tokenRes.status}): ${errText}` };
    }

    const tokenData = await tokenRes.json();
    return {
      accessToken: tokenData.access_token,
      instanceUrl: tokenData.instance_url || sfInstanceUrl,
    };
  } catch (err: any) {
    return { error: err?.message || String(err) };
  }
}

function isCalendarNoise(subject: string, body: string): boolean {
  const s = (subject || "").toLowerCase();
  const b = (body || "").trim().toLowerCase();

  const isRsvpSubject =
    s.includes("accepted:") ||
    s.includes("invitation:") ||
    s.includes("declined:") ||
    s.includes("canceled:") ||
    s.includes("cancelled:") ||
    s.includes("updated invitation:");

  const isPlaceholderBody =
    !b ||
    b === "no content logged." ||
    b === "logged ebsta communication event" ||
    b === "no body text available." ||
    b === "no email body logged.";

  return isRsvpSubject || isPlaceholderBody;
}

// Direct Live Salesforce Case Query (No Supabase DB Fallback)
async function fetchSalesforceCases(accountName: string, sfAuth?: any, autoDomainsRef?: Set<string>) {
  if (!sfAuth?.accessToken || !sfAuth?.instanceUrl) {
    return [];
  }

  const cleanAccName = sanitizeSoql(accountName);
  const cases: any[] = [];

  try {
    // 1. Discover Official Account Website Domain
    const accQuery = `SELECT Id, Name, Website FROM Account WHERE Name LIKE '%${cleanAccName}%' LIMIT 5`;
    const accRes = await fetch(
      `${sfAuth.instanceUrl}/services/data/v58.0/query/?q=${encodeURIComponent(accQuery)}`,
      { headers: { Authorization: `Bearer ${sfAuth.accessToken}` } }
    );
    if (accRes.ok) {
      const accData = await accRes.json();
      (accData.records || []).forEach((acc: any) => {
        const domain = extractDomainFromUrl(acc.Website);
        if (domain && autoDomainsRef) {
          autoDomainsRef.add(domain);
        }
      });
    }

    // 2. Query Live Cases
    const caseDescribeRes = await fetch(
      `${sfAuth.instanceUrl}/services/data/v58.0/sobjects/Case/describe`,
      { headers: { Authorization: `Bearer ${sfAuth.accessToken}` } }
    );

    let richDescFields: string[] = [];
    if (caseDescribeRes.ok) {
      const caseDescribeData = await caseDescribeRes.json();
      richDescFields = (caseDescribeData.fields || [])
        .map((f: any) => f.name)
        .filter((f: string) => {
          const l = f.toLowerCase();
          return l.includes("rich") || l.includes("description") || l.includes("details");
        });
    }

    const queryFields = [
      "Id",
      "CaseNumber",
      "Subject",
      "Status",
      "Description",
      "CreatedDate",
      "ContactEmail",
      "Owner.Name",
      "Account.Name",
      ...richDescFields,
    ];

    const uniqueQueryFields = [...new Set(queryFields)].slice(0, 15);
    const caseQuery = `SELECT ${uniqueQueryFields.join(
      ", "
    )} FROM Case WHERE Account.Name LIKE '%${cleanAccName}%' ORDER BY CreatedDate DESC LIMIT 100`;

    const res = await fetch(
      `${sfAuth.instanceUrl}/services/data/v58.0/query/?q=${encodeURIComponent(caseQuery)}`,
      {
        headers: {
          Authorization: `Bearer ${sfAuth.accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (res.ok) {
      const data = await res.json();
      if (data.records && data.records.length > 0) {
        data.records.forEach((c: any) => {
          let bestDesc = "";
          for (const key of Object.keys(c)) {
            if (
              key !== "attributes" &&
              key !== "Id" &&
              key !== "CaseNumber" &&
              key !== "Subject" &&
              key !== "Status" &&
              key !== "CreatedDate" &&
              key !== "ContactEmail" &&
              key !== "Owner" &&
              key !== "Account" &&
              c[key] &&
              typeof c[key] === "string"
            ) {
              const cleanText = c[key].replace(/<[^>]*>?/gm, "").trim();
              if (cleanText.length > bestDesc.length) {
                bestDesc = cleanText;
              }
            }
          }

          cases.push({
            case_number: c.CaseNumber,
            account_name: c.Account?.Name || accountName,
            subject: c.Subject || "No Subject",
            status: c.Status || "N/A",
            description: bestDesc.length > 0 ? bestDesc : c.Subject || "No description provided.",
            date_opened: c.CreatedDate ? new Date(c.CreatedDate).toLocaleDateString() : "N/A",
            contact_email: c.ContactEmail || "N/A",
            case_owner: c.Owner?.Name || "Unassigned",
          });
        });
      }
    }
  } catch (e) {
    console.warn("Direct Salesforce Case query error:", e);
  }

  return cases;
}

async function fetchEbstaData(accountName: string, sfAuth: any, effectiveDaysBack: number = 180) {
  if (sfAuth?.error || !sfAuth?.accessToken) {
    return null;
  }

  const cleanAccName = sanitizeSoql(accountName);
  const headers = {
    Authorization: `Bearer ${sfAuth.accessToken}`,
    "Content-Type": "application/json",
  };

  const cutoffDate = new Date(Date.now() - effectiveDaysBack * 24 * 60 * 60 * 1000).toISOString();

  let accountScoreData: any = null;
  let rawContacts: any[] = [];
  let rawOpps: any[] = [];
  let rawEmails: any[] = [];
  let rawTasks: any[] = [];

  try {
    const accountQuery = `SELECT Id, Ebsta_Score__c, LastModifiedDate, Account__c, Account__r.Name FROM Account_Ebsta_Score__c WHERE Account__r.Name LIKE '%${cleanAccName}%' ORDER BY LastModifiedDate DESC LIMIT 1`;
    const accRes = await fetch(`${sfAuth.instanceUrl}/services/data/v58.0/query/?q=${encodeURIComponent(accountQuery)}`, { headers });
    if (accRes.ok) {
      const accJson = await accRes.json();
      if (accJson.records && accJson.records.length > 0) {
        accountScoreData = accJson.records[0];
      }
    }

    try {
      const contactQuery = `SELECT Id, Ebsta_Score__c, Contact__r.Name, Contact__r.Title, LastModifiedDate FROM Contact_Ebsta_Score__c WHERE Contact__r.Account.Name LIKE '%${cleanAccName}%' ORDER BY Ebsta_Score__c DESC LIMIT 20`;
      const conRes = await fetch(`${sfAuth.instanceUrl}/services/data/v58.0/query/?q=${encodeURIComponent(contactQuery)}`, { headers });
      if (conRes.ok) {
        const conJson = await conRes.json();
        rawContacts = conJson.records || [];
      }
    } catch (e) {
      console.warn("Contact EBSTA fetch fallback:", e);
    }

    try {
      const oppQuery = `SELECT Id, Ebsta_Score__c, Opportunity__r.Name, Opportunity__r.StageName, LastModifiedDate FROM Opportunity_Ebsta_Score__c WHERE Opportunity__r.Account.Name LIKE '%${cleanAccName}%' ORDER BY Ebsta_Score__c DESC LIMIT 20`;
      const oppRes = await fetch(`${sfAuth.instanceUrl}/services/data/v58.0/query/?q=${encodeURIComponent(oppQuery)}`, { headers });
      if (oppRes.ok) {
        const oppJson = await oppRes.json();
        rawOpps = oppJson.records || [];
      }
    } catch (e) {
      console.warn("Opportunity EBSTA fetch fallback:", e);
    }

    try {
      const emailQuery = `SELECT Id, Subject, FromAddress, ToAddress, MessageDate, TextBody, HtmlBody FROM EmailMessage WHERE (RelatedToId IN (SELECT Id FROM Account WHERE Name LIKE '%${cleanAccName}%') OR RelatedToId IN (SELECT Id FROM Opportunity WHERE Account.Name LIKE '%${cleanAccName}%')) AND (NOT Subject LIKE 'Accepted:%') AND (NOT Subject LIKE 'Invitation:%') AND (NOT Subject LIKE 'Declined:%') AND MessageDate >= ${cutoffDate} ORDER BY MessageDate DESC LIMIT 40`;
      const emailRes = await fetch(`${sfAuth.instanceUrl}/services/data/v58.0/query/?q=${encodeURIComponent(emailQuery)}`, { headers });
      if (emailRes.ok) {
        const emailJson = await emailRes.json();
        rawEmails = emailJson.records || [];
      }
    } catch (e) {
      console.warn("EmailMessage query fallback:", e);
    }

    let taskSelectFields = ["Id", "Subject", "Description", "CreatedDate", "Who.Name", "What.Name"];
    try {
      const taskDescribeRes = await fetch(
        `${sfAuth.instanceUrl}/services/data/v58.0/sobjects/Task/describe`,
        { headers }
      );
      if (taskDescribeRes.ok) {
        const taskDescribeData = await taskDescribeRes.json();
        const taskFields = (taskDescribeData.fields || []).map((f: any) => f.name);
        const extraBodyFields = taskFields.filter((f: string) => {
          const l = f.toLowerCase();
          return (
            l.includes("ebsta") ||
            l.includes("body") ||
            l.includes("comment") ||
            l.includes("detail") ||
            l.includes("mail") ||
            l.includes("text")
          );
        });
        taskSelectFields = [...new Set([...taskSelectFields, ...extraBodyFields])].slice(0, 15);
      }
    } catch (e) {
      console.warn("Task describe fallback:", e);
    }

    try {
      const taskQuery = `SELECT ${taskSelectFields.join(
        ", "
      )} FROM Task WHERE AccountId IN (SELECT Id FROM Account WHERE Name LIKE '%${cleanAccName}%') AND (NOT Subject LIKE 'Accepted:%') AND (NOT Subject LIKE 'Invitation:%') AND (NOT Subject LIKE 'Declined:%') ORDER BY CreatedDate DESC LIMIT 40`;
      const taskRes = await fetch(`${sfAuth.instanceUrl}/services/data/v58.0/query/?q=${encodeURIComponent(taskQuery)}`, { headers });
      if (taskRes.ok) {
        const taskJson = await taskRes.json();
        rawTasks = taskJson.records || [];
      }
    } catch (e) {
      console.warn("Task query fallback:", e);
    }

    const uniqueContactsMap = new Map();
    rawContacts.forEach((c: any) => {
      const name = c.Contact__r?.Name;
      if (name && !uniqueContactsMap.has(name)) {
        uniqueContactsMap.set(name, {
          name,
          title: c.Contact__r?.Title || "N/A",
          score: c.Ebsta_Score__c ?? 0,
          lastModified: c.LastModifiedDate,
        });
      }
    });

    const uniqueOppsMap = new Map();
    rawOpps.forEach((o: any) => {
      const name = o.Opportunity__r?.Name;
      if (name && !uniqueOppsMap.has(name)) {
        uniqueOppsMap.set(name, {
          name,
          stage: o.Opportunity__r?.StageName || "N/A",
          score: o.Ebsta_Score__c ?? 0,
          lastModified: o.LastModifiedDate,
        });
      }
    });

    const formattedEmailMessages = rawEmails
      .map((e: any) => {
        const raw = e.TextBody || e.HtmlBody || "";
        const clean = raw.replace(/<[^>]*>?/gm, "").trim();
        return {
          id: e.Id,
          subject: e.Subject || "No Subject",
          from: e.FromAddress || "N/A",
          to: e.ToAddress || "N/A",
          date: e.MessageDate,
          body: clean,
        };
      })
      .filter((e: any) => !isCalendarNoise(e.subject, e.body));

    const formattedTaskEmails = rawTasks
      .map((t: any) => {
        let bestBody = "";
        for (const key of Object.keys(t)) {
          if (
            key !== "attributes" &&
            key !== "Id" &&
            key !== "Subject" &&
            key !== "CreatedDate" &&
            key !== "Who" &&
            key !== "What" &&
            t[key] &&
            typeof t[key] === "string"
          ) {
            const val = t[key].trim();
            if (val.length > bestBody.length) {
              bestBody = val;
            }
          }
        }

        const cleanBody = bestBody.replace(/<[^>]*>?/gm, "").trim();

        return {
          id: t.Id,
          subject: t.Subject || "No Subject",
          from: t.Who?.Name || "N/A",
          to: t.What?.Name || "N/A",
          date: t.CreatedDate,
          body: cleanBody,
        };
      })
      .filter((e: any) => !isCalendarNoise(e.subject, e.body));

    const combinedEmails = [...formattedEmailMessages, ...formattedTaskEmails].slice(0, 20);

    return {
      score: accountScoreData?.Ebsta_Score__c ?? null,
      lastActivity: accountScoreData?.LastModifiedDate ?? null,
      accountId: accountScoreData?.Account__c ?? null,
      contacts: Array.from(uniqueContactsMap.values()),
      opportunities: Array.from(uniqueOppsMap.values()),
      emails: combinedEmails,
    };
  } catch (error) {
    console.warn("EBSTA fetch error:", error);
    return null;
  }
}

async function fetchGongData(
  accountName: string,
  autoDomains: Set<string>,
  effectiveDaysBack: number,
  authHeader: string
) {
  let debugGongStatus: number | null = 200;
  let debugGongError = "";

  try {
    const domainList = Array.from(autoDomains);
    let matchedCallsMap = new Map<string, any>();
    let cursor: string | null = null;
    let hasMore = true;
    let retry429Count = 0;

    while (hasMore && matchedCallsMap.size < MAX_CALLS_TO_PROCESS) {
      const params = new URLSearchParams({
        fromDateTime: new Date(
          Date.now() - effectiveDaysBack * 24 * 60 * 60 * 1000
        ).toISOString(),
      });

      if (cursor) params.set("cursor", cursor);

      const callsRes = await fetch(
        `https://api.gong.io/v2/calls?${params.toString()}`,
        {
          headers: { Authorization: authHeader, "Content-Type": "application/json" },
        }
      );

      if (callsRes.status === 429) {
        retry429Count++;
        if (retry429Count > 3) break;
        await sleep(2000);
        continue;
      }

      if (!callsRes.ok) {
        debugGongStatus = callsRes.status;
        debugGongError = await callsRes.text();
        break;
      }

      const callsData = await callsRes.json();
      const calls = callsData.calls || [];

      for (const c of calls) {
        if (matchedCallsMap.size >= MAX_CALLS_TO_PROCESS) break;

        const partyEmails = (c.parties || [])
          .map((p: any) => String(p.emailAddress || "").toLowerCase().trim())
          .filter(Boolean);

        // Tier 1: Exact Domain Match against verified autoDomains (e.g. ada.org)
        const exactDomainMatch = partyEmails.some((email: string) => {
          if (!email.includes("@")) return false;
          const emailDom = email.split("@")[1];
          return domainList.some(
            (domain) => emailDom === domain.toLowerCase() || emailDom.endsWith("." + domain.toLowerCase())
          );
        });

        // Tier 2: Strict Multi-Token Title Match
        const titleMatch = checkTitleMatch(accountName, String(c.title || ""));

        if (exactDomainMatch || titleMatch) {
          const durSec = Number(c.duration);
          matchedCallsMap.set(String(c.id), {
            callId: String(c.id),
            title: c.title || "Untitled Call",
            started: c.started || c.scheduled || null,
            durationMinutes: !isNaN(durSec) && durSec > 0 ? Math.round(durSec / 60) : null,
            url: c.url || c.mediaUrl || `https://app.gong.io/call?id=${c.id}`,
            parties: (c.parties || []).map((p: any) => ({
              name: p.name || p.emailAddress || "Attendee",
              email: p.emailAddress || "",
            })),
          });
        }
      }

      cursor = callsData.records?.cursor || callsData.cursor || null;
      hasMore = Boolean(cursor && calls.length > 0);
      if (calls.length === 0) hasMore = false;
      await sleep(50);
    }

    const uniqueCallEntries = Array.from(matchedCallsMap.values());
    if (uniqueCallEntries.length === 0) {
      return { transcripts: [], debugGongStatus, debugGongError };
    }

    const uniqueCallIds = uniqueCallEntries.map((item) => item.callId);
    const transcriptBatches: string[][] = [];
    for (let i = 0; i < uniqueCallIds.length; i += TRANSCRIPT_BATCH_SIZE) {
      transcriptBatches.push(uniqueCallIds.slice(i, i + TRANSCRIPT_BATCH_SIZE));
    }

    const transcriptResults = await Promise.all(
      transcriptBatches.map(async (batch) => {
        const transRes = await fetch("https://api.gong.io/v2/calls/transcript", {
          method: "POST",
          headers: { Authorization: authHeader, "Content-Type": "application/json" },
          body: JSON.stringify({ filter: { callIds: batch } }),
        });
        if (!transRes.ok) return [];
        const transData = await transRes.json();
        return Array.isArray(transData.callTranscripts) ? transData.callTranscripts : [];
      })
    );

    const transcriptMap = new Map();
    for (const batch of transcriptResults) {
      for (const t of batch) {
        transcriptMap.set(String(t.callId), t.transcript || []);
      }
    }

    const enrichedCalls = uniqueCallEntries.map((meta) => {
      let formattedDate = "N/A";
      if (meta.started) {
        try {
          formattedDate = new Date(meta.started).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });
        } catch {
          formattedDate = String(meta.started);
        }
      }

      return {
        ...meta,
        started: formattedDate,
        transcript: transcriptMap.get(meta.callId) || [],
      };
    });

    return { transcripts: enrichedCalls, debugGongStatus, debugGongError };
  } catch (error: any) {
    return { transcripts: [], debugGongStatus: 500, debugGongError: String(error) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { accountName, daysBack = 180 } = await req.json();
    const effectiveDaysBack = Math.min(Number(daysBack) || 180, MAX_GONG_SEARCH_DAYS);

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

    const sfAuth = await getSalesforceAccessToken();

    const ignoredDomains = new Set([
      "copado.com",
      "gmail.com",
      "yahoo.com",
      "hotmail.com",
      "outlook.com",
      "salesforce.com",
    ]);

    const autoDomains = new Set<string>();

    const cases = await fetchSalesforceCases(accountName, sfAuth, autoDomains);
    const ebstaData = await fetchEbstaData(accountName, sfAuth, effectiveDaysBack);

    (cases || []).forEach((c: any) => {
      const email = c.contact_email?.toLowerCase().trim();
      if (!email || !email.includes("@")) return;

      const parts = email.split("@");
      if (parts.length !== 2) return;

      const domain = parts[1];
      if (domain && !ignoredDomains.has(domain)) {
        autoDomains.add(domain);
        
        if (domain.includes("-external.")) {
          const coreDomain = domain.replace("-external.", ".");
          autoDomains.add(coreDomain);
        }
      }
    });

    let gongTranscripts: any[] = [];
    let gongCallCount = 0;
    let debugGongStatus: number | null = 200;
    let debugGongError = "";

    if (gongAccessKey && gongSecretKey) {
      const authHeader = "Basic " + btoa(`${gongAccessKey}:${gongSecretKey}`);

      const gongData = await fetchGongData(
        accountName,
        autoDomains,
        effectiveDaysBack,
        authHeader
      );

      gongTranscripts = Array.isArray(gongData?.transcripts) ? gongData.transcripts : [];
      gongCallCount = gongTranscripts.length;
      debugGongStatus = gongData?.debugGongStatus ?? 200;
      debugGongError = gongData?.debugGongError ?? "";
    } else {
      debugGongStatus = 401;
      debugGongError = "Missing GONG_ACCESS_KEY or GONG_SECRET_KEY in environment secrets.";
    }

    return new Response(
      JSON.stringify({
        accountName,
        daysBack: effectiveDaysBack,
        supportCaseCount: cases?.length || 0,
        gongCallCount,
        transcriptCount: gongTranscripts.length,
        gongHttpStatus: debugGongStatus,
        gongErrorMessage: debugGongError,
        autoDomains: Array.from(autoDomains),
        cases: cases || [],
        salesforceCases: cases || [],
        transcripts: gongTranscripts,
        gongData: gongTranscripts,
        ebstaData,
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