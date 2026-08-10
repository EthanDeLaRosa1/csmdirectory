import { useCallback, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Banknote,
  Building2,
  Compass,
  FileSignature,
  LifeBuoy,
  Lightbulb,
  Search,
  Server,
  ShieldCheck,
  TrendingUp,
  UserCog,
} from "lucide-react";
import type { Department } from "@/data/directory";
import { DepartmentView } from "@/components/directory/department-view";
import { FeedbackBoard } from "@/components/directory/feedback-board";
import { LinkBank } from "@/components/directory/link-bank";

import { NotSureAssistant } from "@/components/directory/not-sure-assistant";
import { ThemeToggle } from "@/components/directory/theme-toggle";
import { deptTheme } from "@/data/dept-theme";
import { DirectoryStoreProvider, useDirectoryStore } from "@/lib/directory-store";
import { smartSearch } from "@/lib/smart-search";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CSM Internal Escalation & Resource Directory" },
      {
        name: "description",
        content:
          "Who to go to for what: triggers, intake channels, SLAs, and 3-tier escalation paths across 9 internal Copado teams.",
      },
      { property: "og:title", content: "CSM Internal Escalation & Resource Directory" },
      {
        property: "og:description",
        content:
          "Search triggers, out-of-scope routing, SLA matrices, and escalation tiers for all nine internal departments.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DirectoryRoute,
});

const ICONS: Record<string, typeof LifeBuoy> = {
  "customer-support": LifeBuoy,
  tam: UserCog,
  "professional-services": Compass,
  infrastructure: Server,
  "product-management": Lightbulb,
  "sales-ae": TrendingUp,
  "finance-billing": Banknote,
  "security-infosec": ShieldCheck,
  "legal-contracts": FileSignature,
};

function DirectoryRoute() {
  return (
    <DirectoryStoreProvider>
      <DirectoryPage />
    </DirectoryStoreProvider>
  );
}

type ViewId = "directory" | "links" | "feedback";

function DirectoryPage() {
  const { departments, verificationOf, unverifiedItems } = useDirectoryStore();
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState(departments[0]!.id);
  const [view, setView] = useState<ViewId>("directory");
  const [placeholdersOnly, setPlaceholdersOnly] = useState(false);
  const [pulseSection, setPulseSection] = useState<string | null>(null);


  const q = query.trim();
  const hits = useMemo(() => smartSearch(q, departments), [q, departments]);

  const goTo = useCallback((deptId: string, section?: string) => {
    setActiveId(deptId);
    setView("directory");
    setQuery("");

    setPulseSection(section ?? null);
    requestAnimationFrame(() => {
      const el = section ? document.getElementById(section) : null;
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      else window.scrollTo({ top: 0, behavior: "smooth" });
    });
    if (section) window.setTimeout(() => setPulseSection(null), 2600);
  }, []);

  const active = departments.find((d) => d.id === activeId)!;
  const totalUnverified = departments.reduce((n, d) => n + unverifiedItems(d).length, 0);

  const grouped = useMemo(() => {
    const map = new Map<Department, typeof hits>();
    for (const h of hits) map.set(h.dept, [...(map.get(h.dept) ?? []), h]);
    return [...map.entries()];
  }, [hits]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-4 px-5 py-3">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Building2 className="size-5" />
            </span>
            <div>
              <h1 className="text-sm font-semibold leading-tight tracking-tight sm:text-base">
                CSM Internal Escalation &amp; Resource Directory
              </h1>
              <p className="text-[11px] text-muted-foreground">
                Owners: [Your Name] &amp; Atravian · Target date: August 15, 2026
              </p>
            </div>
          </div>

          <div className="relative order-last w-full min-w-[240px] flex-1 md:order-none md:w-auto">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && hits[0]) goTo(hits[0].dept.id, hits[0].section);
              }}
              placeholder="Ask in plain English — “customer needs a SOC 2 report”…"
              className="pl-9"
              aria-label="Search the directory"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5">
              <Switch
                id="placeholders"
                checked={placeholdersOnly}
                onCheckedChange={setPlaceholdersOnly}
              />
              <Label htmlFor="placeholders" className="cursor-pointer text-xs">
                Unverified only
              </Label>
              <Badge className="bg-warning-soft text-warning-foreground text-[10px]">
                {totalUnverified}
              </Badge>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1500px] gap-8 px-5">
        <nav className="sticky top-[73px] hidden h-[calc(100vh-73px)] w-64 shrink-0 overflow-y-auto py-6 lg:block">
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Departments
          </p>
          <ul className="space-y-1">
            {departments.map((d) => {
              const Icon = ICONS[d.id]!;
              const isActive = d.id === activeId && !q;
              const count = unverifiedItems(d).length;
              const verified = verificationOf(d);
              const theme = deptTheme(d.id);
              return (
                <li key={d.id}>
                  <button
                    onClick={() => goTo(d.id)}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      isActive
                        ? "bg-secondary font-medium text-secondary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    <span className={`h-5 w-1 shrink-0 rounded-full ${theme.dot}`} />
                    <Icon className="size-4 shrink-0" />
                    <span className="flex-1 truncate">{d.short}</span>
                    {d.internalOnly ? (
                      <Badge variant="destructive" className="text-[9px]">
                        Internal
                      </Badge>
                    ) : null}
                    {verified ? (
                      <span
                        title={`Verified ${verified.date}`}
                        className="size-2 shrink-0 rounded-full bg-success"
                      />
                    ) : count ? (
                      <span className="rounded-full bg-warning-soft px-1.5 text-[10px] text-warning-foreground">
                        {count}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <main className="min-w-0 flex-1 py-6">
          <div className="mb-5 flex flex-wrap gap-1 rounded-xl border border-border bg-card p-1">
            {(
              [
                ["directory", "Department Directory"],
                ["links", "Centralized Link Bank"],
                ["feedback", "CSM Feedback & Wishlist"],
              ] as [ViewId, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => {
                  setView(id);
                  setQuery("");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm ${
                  view === id && !q
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {view === "directory" && !q ? (
            <div className="mb-6 flex gap-2 overflow-x-auto pb-1 lg:hidden">
              {departments.map((d) => (
                <button
                  key={d.id}
                  onClick={() => goTo(d.id)}
                  className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs ${
                    d.id === activeId
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {d.short}
                </button>
              ))}
            </div>
          ) : null}


          {q ? (
            <div className="space-y-6 pb-16">
              <p className="text-sm text-muted-foreground">
                {grouped.length} department{grouped.length === 1 ? "" : "s"} match “{query}” — click a
                result to jump straight to the answer.
              </p>
              {grouped.map(([dept, lines]) => {
                const Icon = ICONS[dept.id]!;
                const theme = deptTheme(dept.id);
                return (
                  <div
                    key={dept.id}
                    className={`rounded-xl border ${theme.ring} ${theme.soft} p-5`}
                  >
                    <button
                      onClick={() => goTo(dept.id)}
                      className="flex items-center gap-2 text-left text-base font-semibold hover:underline"
                    >
                      <Icon className="size-4" />
                      {dept.name}
                    </button>
                    <ul className="mt-3 space-y-2">
                      {lines.slice(0, 6).map((l, i) => (
                        <li key={`${l.kind}-${i}`}>
                          <button
                            onClick={() => goTo(dept.id, l.section)}
                            className="flex w-full flex-wrap items-start gap-2 rounded-lg p-1.5 text-left text-sm hover:bg-accent"
                          >
                            <Badge variant="outline" className="text-[10px] uppercase">
                              {l.kind}
                            </Badge>
                            <span className="flex-1 text-foreground/85">{l.text}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
              {grouped.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                  No results. Try “SOW”, “P1”, “DPA”, or “log retention”.
                </p>
              ) : null}
              <NotSureAssistant departments={departments} onGoTo={goTo} />
            </div>
          ) : view === "links" ? (
            <LinkBank />
          ) : view === "feedback" ? (
            <FeedbackBoard />
          ) : (
            <div className="space-y-10 pb-4">
              <DepartmentView
                dept={active}
                placeholdersOnly={placeholdersOnly}
                pulseSection={pulseSection}
              />
              <NotSureAssistant departments={departments} onGoTo={goTo} />
              <div className="h-10" />
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
