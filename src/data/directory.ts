export type EscalationLevel = {
  level: string;
  who: string;
  when: string;
  cdr: string;
};

export type Department = {
  id: string;
  num: number;
  name: string;
  short: string;
  internalOnly?: boolean;
  owner: string;
  updated: string;
  criticalRule?: { title: string; body: string };
  triggersIntro?: string;
  triggers: string[];
  outOfScope: { need: string; goTo: string }[];
  intake: { title: string; note?: string; steps?: string[]; bullets?: string[] };
  contacts: { label: string; value: string }[];
  escalation: EscalationLevel[];
  placeholders: string[];
  extras?: { title: string; items: string[] }[];
};

export const SLA_MATRIX = [
  {
    priority: "P1 Critical",
    description: "Production down, all users affected, no workaround",
    success: "1 hour",
    successPlus: "<1 hour",
    signature: "<1 hour",
    coverage: "24/7 incl. weekends & holidays",
  },
  {
    priority: "P2 Urgent",
    description: "Major functionality issue, many users affected, no workaround",
    success: "2 hours",
    successPlus: "1 hour",
    signature: "1 hour",
    coverage: "24/7 incl. weekends & holidays",
  },
  {
    priority: "P3 High",
    description: "Performance issue, some users affected, workaround available",
    success: "4 hours",
    successPlus: "2 hours",
    signature: "2 hours",
    coverage: "Local business hours only",
  },
  {
    priority: "P4 Medium",
    description: "Routine technical issue, workaround available",
    success: "8 hours",
    successPlus: "4 hours",
    signature: "4 hours",
    coverage: "Local business hours only",
  },
];

export const CASE_STATUSES = [
  { status: "New", meaning: "Case submitted, awaiting pickup" },
  { status: "In Progress", meaning: "Support is actively investigating" },
  { status: "Awaiting Feedback", meaning: "Waiting on customer info (CDR should push customer)" },
  { status: "Escalated", meaning: "Escalated within Support or to another team" },
  { status: "On Hold", meaning: "Paused, waiting on a third party or fix" },
  { status: "Closed", meaning: "Issue resolved" },
];

export const DEPARTMENTS: Department[] = [
  {
    id: "customer-support",
    num: 1,
    name: "Customer Support",
    short: "Support",
    owner: "Atravian",
    updated: "August 6, 2026",
    criticalRule: {
      title: "Support is almost always the first stop. Not the CSM, not Infrastructure, not PM.",
      body: "When a customer has a product issue, the answer is almost always: open a Support case first. Do not troubleshoot it yourself, do not route it to another team, and do not have the customer email someone directly. The case is the paper trail — everything else flows from it.",
    },
    triggersIntro:
      "Open a Support case when a customer has a product-related issue that needs investigation or resolution:",
    triggers: [
      "Product functionality issues and troubleshooting",
      "Installation or upgrade assistance",
      "Root Cause Analysis (RCA) requests for prior support interactions (P1 RCAs post to the Copado Status page automatically)",
      "Any backend investigation required before escalating to Infrastructure",
    ],
    outOfScope: [
      { need: "Customizations built on top of Copado", goTo: "Customer's own development team" },
      { need: "DevOps Exchange listings from third parties or Copado Labs", goTo: "The listing owner directly" },
      { need: "Orgs running packages older than current or previous version", goTo: "Customer must upgrade first" },
      { need: "Issues older than 14 days (logs expired)", goTo: "Notify Support immediately if logs need retaining" },
      { need: "Maintenance window delays", goTo: "Check the Copado Status page" },
      { need: "Salesforce-native errors", goTo: "Salesforce Support directly" },
      { need: "Best practice or how-to questions", goTo: "CSM / Success Team" },
    ],
    intake: {
      title: "Support has no single named POC — the channel IS the contact method.",
      bullets: [
        "Standard Copado Support: submit cases via the Copado Success Community",
        "Essentials Support: chat widget on the Essentials landing page",
        "CRT (Copado Robotic Testing): support widget in CRT org or email copadorobotictesting@copado.com",
      ],
      steps: [
        "Go to the Copado Success Community",
        "Submit a case with: Org ID, Detailed Description, Steps to Reproduce, and Promotion Branch Name",
        "Open a separate case for each unique issue",
        "Add collaborators if needed (max 5 per case)",
      ],
    },
    contacts: [
      { label: "Copado Success Community", value: "Primary case intake channel" },
      { label: "CRT Support Email", value: "copadorobotictesting@copado.com" },
      { label: "Support Call Scheduling", value: "Case first → agent sends Calendly link → never invite Support to unagreed calls" },
    ],
    escalation: [
      { level: "Level 1", who: "Support Case Owner", when: "Case submitted and active", cdr: "Monitor case status" },
      { level: "Level 2", who: "Support Lead / Manager", when: "SLA missed, customer blocked, go-live at risk", cdr: "Escalate via case record or CSM" },
      { level: "Level 3", who: "VP of Support / Executive", when: "Unresolved P1, executive involved, contract risk", cdr: "Escalate through CSM manager alignment" },
    ],
    placeholders: ["Level 2 Support Lead contact name [CONFIRM]", "Account Super User lookup process [CONFIRM]"],
  },
  {
    id: "tam",
    num: 2,
    name: "Technical Account Management (TAM)",
    short: "TAM",
    owner: "Atravian",
    updated: "August 6, 2026",
    criticalRule: {
      title: "TAM access is contract-dependent. Not every customer has a TAM.",
      body: "Confirm their contract tier includes TAM engagement before making any referral. Pointing a customer to an inaccessible resource erodes trust.",
    },
    triggersIntro:
      "Engage TAM when a customer needs deep, ongoing technical advisory beyond standard CSM scope:",
    triggers: [
      "Complex architecture reviews or technical design sessions (branching strategy, pipeline design, org architecture)",
      "Deep technical enablement for customer internal teams",
      "Ongoing technical advisory across multiple sessions",
      "Hands-on technical guidance for building complex setups on Copado",
    ],
    outOfScope: [
      { need: "Standard product bug or broken functionality", goTo: "Customer Support" },
      { need: "Best practice or general how-to questions", goTo: "CSM / Success Team" },
      { need: "Contract or billing questions", goTo: "AE or Finance" },
      { need: "Custom build requiring a SOW", goTo: "Professional Services (PS)" },
    ],
    intake: {
      title: "TAM requests are CSM-facilitated.",
      steps: [
        "Confirm TAM contract tier entitlement",
        "Identify assigned TAM in CRM",
        "Document context, goals, and expected session count",
        "Contact TAM via team channel / intake form",
      ],
    },
    contacts: [
      { label: "Primary TAM POC", value: "[CONFIRM WITH MANAGER / CRM]" },
      { label: "Backup TAM POC", value: "[CONFIRM WITH MANAGER]" },
      { label: "Email Alias / Slack", value: "[CONFIRM ALIAS / SLACK CHANNEL]" },
      { label: "Intake Form Link", value: "[CONFIRM LINK]" },
    ],
    escalation: [
      { level: "Level 1", who: "Account TAM", when: "Architecture review, deep enablement", cdr: "Facilitate request with context" },
      { level: "Level 2", who: "TAM Manager / Lead", when: "No SLA response, customer blocked on technical decision", cdr: "Flag to CSM Manager & TAM Manager" },
      { level: "Level 3", who: "VP of Technical Services", when: "Executive involved, blocker threatening go-live/renewal", cdr: "Escalate through CSM manager alignment" },
    ],
    placeholders: [
      "Primary & Backup TAM POC names [CONFIRM]",
      "Internal Slack channel & intake form link [CONFIRM]",
      "List of contract tiers that include TAM access [CONFIRM]",
    ],
  },
  {
    id: "professional-services",
    num: 3,
    name: "Professional Services / Implementation",
    short: "Professional Services",
    owner: "[YOUR NAME]",
    updated: "August 6, 2026",
    criticalRule: {
      title: "No work begins until the SOW is signed.",
      body: "PS intake is AE-led or CSM-led — never self-service. Requests without an active SOW must loop in the AE first.",
    },
    triggersIntro:
      "Engage PS when a customer's need goes beyond standard configuration or CSM guidance:",
    triggers: [
      "Custom build requests requiring custom code or configuration outside standard product scope",
      "Complex migrations (org merges, metadata migrations, environment restructuring)",
      "New implementation scoping for fresh customers needing structured onboarding",
      "SOW-required engagements demanding a formal Statement of Work before work starts",
    ],
    outOfScope: [
      { need: "Product bug or troubleshooting", goTo: "Customer Support" },
      { need: "Best practice guidance", goTo: "CSM / Success Team" },
      { need: "Architecture review or technical advisory", goTo: "TAM (if contract tier includes it)" },
      { need: "Requests without an active SOW", goTo: "Loop in AE first" },
    ],
    intake: {
      title: "Intake is AE-led or CSM-led. NOT self-service.",
      steps: [
        "Confirm request falls within PS scope",
        "Loop in Account Executive (AE) for commercial agreement",
        "PS scopes work and generates Statement of Work (SOW)",
        "No work begins until SOW is signed",
      ],
    },
    contacts: [
      { label: "Primary PS POC", value: "[CONFIRM WITH MANAGER]" },
      { label: "Backup PS POC", value: "[CONFIRM WITH MANAGER]" },
      { label: "Email Alias / Slack Channel", value: "[CONFIRM ALIAS / CHANNEL]" },
      { label: "Intake Form Link", value: "[CONFIRM LINK]" },
    ],
    escalation: [
      { level: "Level 1", who: "PS Lead / Account POC", when: "No response within SLA or scope confusion", cdr: "Facilitate; flag to AE and PS Lead" },
      { level: "Level 2", who: "PS Manager or Team Lead", when: "Level 1 unresolved, go-live risk, SOW dispute", cdr: "Loop in AE; document impact" },
      { level: "Level 3", who: "VP of Professional Services", when: "Executive escalation, contract/reputational risk", cdr: "Escalate via AE & CSM manager alignment" },
    ],
    placeholders: [
      "Primary & Backup PS POC names [CONFIRM]",
      "Intake email alias & Slack channel [CONFIRM]",
      "Intake form URL [CONFIRM]",
    ],
  },
  {
    id: "infrastructure",
    num: 4,
    name: "Infrastructure / Platform Engineering",
    short: "Infrastructure",
    internalOnly: true,
    owner: "[YOUR NAME]",
    updated: "August 6, 2026",
    criticalRule: {
      title: "This team is NOT customer-facing.",
      body: "Customers and CDRs do NOT contact Infrastructure directly. There is no direct contact to share with customers. Route all requests through Support or CSM.",
    },
    triggersIntro:
      "Infrastructure involvement is needed when backend issues cannot be resolved at Support level:",
    triggers: [
      "Backend environment issues requiring backend access / intervention",
      "GovCloud environment requests",
      "Dedicated backend needs (isolated infrastructure)",
      "Log retention requests beyond 14 days (default retention is 14 days — notify Support immediately)",
    ],
    outOfScope: [
      { need: "Product bug or troubleshooting", goTo: "Customer Support" },
      { need: "Best practice questions", goTo: "CSM / Success Team" },
      { need: "Feature requests / roadmap", goTo: "Product Management" },
    ],
    intake: {
      title: "Routed strictly through Support or CSM.",
      steps: [
        "Open Support case first",
        "Support investigates and escalates internally if backend intervention is required",
        "For log retention: notify Support immediately to flag Infrastructure before logs purge",
      ],
    },
    contacts: [
      { label: "Internal Slack Channel", value: "[CONFIRM SLACK CHANNEL NAME]" },
      { label: "Internal Ticketing Process", value: "[CONFIRM WITH MANAGER]" },
    ],
    escalation: [
      { level: "Level 1", who: "Customer Support (Case Owner)", when: "Issue open and active", cdr: "Monitor case status" },
      { level: "Level 2", who: "CSM escalation to Support / Infra lead", when: "No progress, customer blocked, go-live risk", cdr: "Flag internally with business impact" },
      { level: "Level 3", who: "VP of Support / Cross-functional Exec", when: "Executive involved, P1 down, contract risk", cdr: "Escalate via manager alignment" },
    ],
    placeholders: [
      "Internal Infrastructure Slack channel name [CONFIRM]",
      "Internal escalation ticketing process [CONFIRM]",
      "Infrastructure team lead name [CONFIRM]",
    ],
  },
  {
    id: "product-management",
    num: 5,
    name: "Product Management (PM)",
    short: "Product Management",
    owner: "[YOUR NAME]",
    updated: "August 6, 2026",
    criticalRule: {
      title: "PM is NOT a direct customer-facing team in most cases.",
      body: "All feature requests, roadmap inquiries, and Known Issue tracking go through CSM first.",
    },
    triggersIntro: "Involve PM when customer needs pertain to product roadmap or feature requests:",
    triggers: [
      "Formal feature requests (new functionality not existing today)",
      "Roadmap inquiries (what is coming and when)",
      "Known Issue tracking & status updates",
    ],
    outOfScope: [
      { need: "Product bug or broken feature", goTo: "Customer Support" },
      { need: "Best practice or how-to questions", goTo: "CSM / Success Team" },
      { need: "Custom build request", goTo: "Professional Services (PS)" },
    ],
    intake: {
      title: "CSM-mediated unless confirmed otherwise.",
      steps: [
        "Confirm it's a feature request (new idea) and not a bug",
        "Document user problem, use case, and business justification",
        "Submit via designated feature request form or PM Slack channel",
        "For Known Issues: check the Known Issues page before reaching out",
      ],
    },
    contacts: [
      { label: "Primary PM POC", value: "[CONFIRM WITH MANAGER]" },
      { label: "Email Alias / Slack", value: "[CONFIRM ALIAS / CHANNEL]" },
      { label: "Feature Request Form Link", value: "[CONFIRM LINK]" },
      { label: "Known Issues Page Link", value: "[CONFIRM LINK]" },
    ],
    escalation: [
      { level: "Level 1", who: "Product Manager (Area Lead)", when: "No acknowledgment after SLA, Known Issue update missing", cdr: "CSM follows up in PM channel" },
      { level: "Level 2", who: "PM Manager / Team Lead", when: "Level 1 unresolved, customer blocked, renewal risk", cdr: "CSM escalates via manager & AE" },
      { level: "Level 3", who: "VP of Product", when: "Executive involved, core workflow blocked", cdr: "Executive escalation via manager alignment" },
    ],
    placeholders: [
      "Primary & Backup PM POC names [CONFIRM]",
      "Feature Request form link & Known Issues URL [CONFIRM]",
    ],
  },
  {
    id: "sales-ae",
    num: 6,
    name: "Sales / Account Executive (AE)",
    short: "Sales / AE",
    owner: "[YOUR NAME]",
    updated: "August 6, 2026",
    criticalRule: {
      title: "AE owns the commercial relationship; CSM owns the success relationship.",
      body: "Do not handle pricing, contract, or expansion commitments. Identify signals and hand off cleanly.",
    },
    triggersIntro: "Loop in AE whenever conversations have commercial implications:",
    triggers: [
      "Contract renewals (pricing, terms, renewal dates)",
      "Upsell / cross-sell conversations (adding licenses or products)",
      "Product demos / evaluations for products not currently owned",
      "Contract reductions / downsize intent (URGENT retention risk)",
      "PS engagement initiation",
    ],
    outOfScope: [
      { need: "Product bug or troubleshooting", goTo: "Customer Support" },
      { need: "Custom build with a signed SOW", goTo: "Professional Services (PS)" },
      { need: "Invoice or billing dispute detail", goTo: "Finance / Billing (AE-mediated)" },
    ],
    intake: {
      title: "Look up the AE in CRM under \"Account Owner\" or \"Account Executive\".",
      steps: [
        "Identify commercial signal",
        "Acknowledge customer interest without making pricing commitments",
        "Notify AE immediately via Slack/Email with context and urgency",
        "Log note in CRM",
      ],
    },
    contacts: [
      { label: "Assigned AE lookup", value: "CRM → Account Owner / Account Executive field [CONFIRM FIELD NAME]" },
      { label: "AE Manager", value: "[CONFIRM WITH MANAGER]" },
    ],
    escalation: [
      { level: "Level 1", who: "Assigned AE", when: "Commercial signal, upcoming renewal", cdr: "Identify and hand off cleanly" },
      { level: "Level 2", who: "AE Manager / Sales Director", when: "AE unresponsive, high-risk renewal", cdr: "Flag to CSM Manager & Sales Director" },
      { level: "Level 3", who: "VP of Sales", when: "Major churn risk, executive escalation", cdr: "Escalation via CSM Manager alignment" },
    ],
    placeholders: [
      "Specific CRM field name where AE assignment is listed [CONFIRM]",
      "AE Manager contact name [CONFIRM]",
    ],
  },
  {
    id: "finance-billing",
    num: 7,
    name: "Finance / Billing",
    short: "Finance / Billing",
    owner: "Atravian",
    updated: "August 6, 2026",
    criticalRule: {
      title: "Finance conversations almost always need the AE involved.",
      body: "Loop in AE before routing directly to Finance — billing disputes carry commercial implications.",
    },
    triggersIntro: "Involve Finance when requests concern money, invoices, or payments:",
    triggers: [
      "Invoice disputes (incorrect billing or rates)",
      "Credit adjustments",
      "Payment terms questions or schedule negotiation",
      "Billing discrepancies between contract and invoice",
    ],
    outOfScope: [
      { need: "Pricing, renewal terms, or expansion", goTo: "Account Executive (AE)" },
      { need: "Contract language or amendments", goTo: "Legal / Contracts (via AE)" },
      { need: "Product issue affecting usage", goTo: "Customer Support" },
    ],
    intake: {
      title: "AE-mediated or CSM-mediated.",
      steps: [
        "Document customer discrepancy, invoice numbers, and supporting docs",
        "Loop in AE",
        "Submit to Finance via team alias or Slack channel",
      ],
    },
    contacts: [
      { label: "Primary Finance POC", value: "[CONFIRM WITH MANAGER]" },
      { label: "Email Alias", value: "[CONFIRM ALIAS]" },
      { label: "Internal Slack Channel", value: "[CONFIRM SLACK CHANNEL]" },
    ],
    escalation: [
      { level: "Level 1", who: "Finance / Billing POC", when: "Dispute, credit request, payment question", cdr: "Loop in AE; route to Finance" },
      { level: "Level 2", who: "Finance Manager & AE Manager", when: "No SLA response, customer withholding payment", cdr: "Flag to CSM Manager & AE" },
      { level: "Level 3", who: "VP of Finance", when: "Executive involved, dispute threatening renewal", cdr: "Executive escalation via manager alignment" },
    ],
    placeholders: [
      "Primary Finance POC name & email alias [CONFIRM]",
      "Turnaround SLA for billing requests [CONFIRM]",
    ],
  },
  {
    id: "security-infosec",
    num: 8,
    name: "Security / InfoSec",
    short: "Security / InfoSec",
    owner: "[YOUR NAME]",
    updated: "August 6, 2026",
    criticalRule: {
      title: "Never post vulnerability details in public Slack channels.",
      body: "Direct security vulnerability reports immediately to the official responsible disclosure link or security@copado.com.",
    },
    triggersIntro:
      "Involve Security when customers have security compliance, audit, or vulnerability concerns:",
    triggers: [
      "Security questionnaires for procurement / compliance",
      "Penetration test results review",
      "Vulnerability disclosures",
      "Compliance documentation requests (SOC 2, ISO, HIPAA)",
    ],
    outOfScope: [
      { need: "Product bug or error message", goTo: "Customer Support" },
      { need: "Contractual security terms / DPA", goTo: "Legal / Contracts (via AE)" },
      { need: "Backend or environment isolation requests", goTo: "Infrastructure (via Support)" },
    ],
    intake: {
      title: "Trust Portal first, then Security intake.",
      bullets: [
        "Questionnaires: direct to the public Trust Portal first; submit custom forms via Security intake",
        "Responsible disclosure: report immediately via the official disclosure link or security@copado.com",
        "Do NOT post vulnerability details in public Slack channels",
      ],
    },
    contacts: [
      { label: "Security Alias", value: "security@copado.com [CONFIRM]" },
      { label: "Trust Portal Link", value: "[CONFIRM LINK]" },
      { label: "Responsible Disclosure Link", value: "[CONFIRM LINK]" },
    ],
    escalation: [
      { level: "Level 1", who: "InfoSec Intake / Security Alias", when: "Questionnaire submitted, security inquiry", cdr: "Send request via channel with deadline" },
      { level: "Level 2", who: "Security Manager / CISO Office", when: "Urgent questionnaire blocking deal, active vulnerability", cdr: "Flag urgency to CSM Manager & Security Lead" },
      { level: "Level 3", who: "CISO", when: "Active breach allegation or compliance crisis", cdr: "Immediate executive escalation" },
    ],
    placeholders: [
      "Public Trust / Compliance portal URL [CONFIRM]",
      "Responsible Disclosure URL [CONFIRM]",
    ],
  },
  {
    id: "legal-contracts",
    num: 9,
    name: "Legal / Contracts",
    short: "Legal / Contracts",
    owner: "Atravian",
    updated: "August 6, 2026",
    criticalRule: {
      title: "AE owns the Legal relationship; CDRs do NOT contact Legal directly.",
      body: "All Legal requests must go through the AE first. Direct inquiries will be redirected back.",
    },
    triggersIntro:
      "Involve Legal when requests require reviewing, executing, or modifying legal language:",
    triggers: [
      "Data Processing Agreement (DPA) requests (GDPR / data privacy)",
      "NDA execution before formal evaluations",
      "Contract amendments or addendums",
      "Reviewing customer legal paper / templates",
    ],
    outOfScope: [
      { need: "Pricing or renewal negotiation", goTo: "Account Executive (AE)" },
      { need: "Security questionnaires / compliance docs", goTo: "Security / InfoSec" },
      { need: "Invoice or payment terms", goTo: "Finance / Billing (via AE)" },
    ],
    intake: {
      title: "AE-led process.",
      steps: [
        "Document customer request and deadline",
        "Notify AE immediately with document attachments",
        "Do NOT comment on legal substance or terms to the customer",
        "AE submits request to Legal",
      ],
    },
    contacts: [
      { label: "Legal Alias", value: "legal@copado.com [CONFIRM]" },
      { label: "Process", value: "AE-mediated" },
      { label: "DPA / NDA Review SLA", value: "[CONFIRM SLA WITH AE TEAM]" },
    ],
    escalation: [
      { level: "Level 1", who: "Account AE", when: "DPA, NDA, or amendment needed", cdr: "Hand off to AE with documentation" },
      { level: "Level 2", who: "AE Manager & Legal Manager", when: "Missed SLA, compliance deadline at risk", cdr: "Flag to CSM Manager & AE" },
      { level: "Level 3", who: "VP of Legal", when: "Executive involved, contract risk", cdr: "Executive escalation via manager alignment" },
    ],
    placeholders: [
      "Primary Legal POC name [CONFIRM]",
      "Legal review SLA turnaround times [CONFIRM]",
    ],
  },
];

export const hasPlaceholder = (text: string) =>
  /\[CONFIRM[^\]]*\]|\[YOUR NAME\]/i.test(text);
