import { useState } from "react";
import { GraduationCap, ExternalLink, Search, Copy, Check, Video } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface CsmuGuide {
  id: string;
  title: string;
  category: "Onboarding" | "Product Enablement" | "CSM Process" | "Best Practices";
  description: string;
  url: string;
  lastUpdated: string;
}

const DEFAULT_GUIDES: CsmuGuide[] = [
  {
    id: "1",
    title: "Proactive CSM Strategy with ChurnZero",
    category: "CSM Process",
    description: "Session on leveraging ChurnZero to shift from reactive firefighting to a proactive Customer Success Management strategy.",
    url: "https://drive.google.com/file/d/1_EpsgZH-KbG3zp3CPAekkBvr_nJ0-O8L/view",
    lastUpdated: "Aug 2026",
  },
  {
    id: "2",
    title: "Copado Robotic Testing (CRT) Deep Dive",
    category: "Product Enablement",
    description: "Video session featuring a Senior Sales Engineer exploring key themes, features, and demonstration points in CRT.",
    url: "https://drive.google.com/file/d/1a3FqZgMkGkqnOphu9W3fLUuL550hF_q7/view?t=12.375",
    lastUpdated: "Aug 2026",
  },
  {
    id: "3",
    title: "Managing Customer Accounts, Cases & Resources",
    category: "CSM Process",
    description: "Walkthrough of managing customer accounts, case routing, and internal resources within the Copado environment.",
    url: "https://drive.google.com/file/d/1e4eUshBaYHApsiau7fbp7RLgzj8fBhC0/view?t=0.555",
    lastUpdated: "Aug 2026",
  },
  {
    id: "4",
    title: "Git Branching, Merge Conflicts & Salesforce Environments",
    category: "Product Enablement",
    description: "Overview of Git branching, merge conflicts, and navigating complex Salesforce environment management with Copado tools.",
    url: "https://drive.google.com/file/d/1jpFEeDuoW0sWHQ3o4u3lmRTo7MiF4Le5/view",
    lastUpdated: "Aug 2026",
  },
  {
    id: "5",
    title: "Copado Troubleshooting & CSM Triage Best Practices",
    category: "Best Practices",
    description: "Best practices for effective issue triage, building client self-sufficiency, and identifying recurring customer training needs.",
    url: "https://drive.google.com/file/d/1LeDxZnU61DUO2B_eynfO0jB_HIY0-xs7/view",
    lastUpdated: "Aug 2026",
  },
  {
    id: "6",
    title: "Conducting Effective EBRs & QBRs at Copado",
    category: "Best Practices",
    description: "Comprehensive guide outlining the purpose, value, deck structure, and step-by-step execution for EBRs and QBRs.",
    url: "https://drive.google.com/file/d/1ujRCoiMnFs8LLKyJiraVbE0estn4UUWZ/view",
    lastUpdated: "Aug 2026",
  },
];

export function CsmuGuides() {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categories = ["All", "CSM Process", "Product Enablement", "Best Practices"];

  const filteredGuides = DEFAULT_GUIDES.filter((guide) => {
    const matchesCategory = selectedCategory === "All" || guide.category === selectedCategory;
    const matchesSearch =
      guide.title.toLowerCase().includes(query.toLowerCase()) ||
      guide.description.toLowerCase().includes(query.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleCopy = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <GraduationCap className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold">CSM University (CSMU) Video Library</h2>
            <p className="text-xs text-muted-foreground">
              Official video training sessions, product enablement walkthroughs, and CSM playbooks.
            </p>
          </div>
        </div>

        {/* Search & Category Filter */}
        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search CSMU training recordings..."
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-muted-foreground hover:bg-accent"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Guide Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {filteredGuides.map((guide) => (
          <div
            key={guide.id}
            className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/50"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <Badge variant="secondary" className="text-[10px]">
                  {guide.category}
                </Badge>
                <span className="text-[10px] text-muted-foreground">{guide.lastUpdated}</span>
              </div>
              <h3 className="font-semibold text-sm mb-1">{guide.title}</h3>
              <p className="text-xs text-muted-foreground line-clamp-3 mb-4">{guide.description}</p>
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-border/50">
              <a
                href={guide.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Video className="size-3.5" />
                Watch Recording
                <ExternalLink className="size-3" />
              </a>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs"
                title="Copy Link"
                onClick={() => handleCopy(guide.url, guide.id)}
              >
                {copiedId === guide.id ? (
                  <Check className="size-3.5 text-emerald-500" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {filteredGuides.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-xs text-muted-foreground">
          No training videos match your search query.
        </div>
      )}
    </div>
  );
}