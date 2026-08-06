import { useMemo, useState } from "react";
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
import { DEPARTMENTS, hasPlaceholder, type Department } from "@/data/directory";
import { DepartmentView } from "@/components/directory/department-view";
import { ThemeToggle } from "@/components/directory/theme-toggle";
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
  component: DirectoryPage,
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

function deptText(d: Department) {
  return [
    d.name,
    d.short,
    d.owner,
    d.criticalRule?.title,
    d.criticalRule?.body,
    d.triggersIntro,
    ...d.triggers,
    ...d.outOfScope.flatMap((o) => [o.need, o.goTo]),
    d.intake.title,
    ...(d.intake.steps ?? []),
    ...(d.intake.bullets ?? []),
    ...d.contacts.flatMap((c) => [c.label, c.value]),
    ...d.escalation.flatMap((e) => [e.level, e.who, e.when, e.cdr]),
    ...d.placeholders,
  ]
    .filter(Boolean)
    .join(" \n ")
    .toLowerCase();
}

function unverifiedCount(d: Department) {
  return (
    d.placeholders.length +
    d.contacts.filter((c) => hasPlaceholder(c.value)).length +
    (hasPlaceholder(d.owner) ? 1 : 0)
  );
}

function DirectoryPage() {
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState(DEPARTMENTS[0]!.id);
  const [placeholdersOnly, setPlaceholdersOnly] = useState(false);

  const q = query.trim().toLowerCase();

  const matches = useMemo(() => {
    if (!q) return null;
    return DEPARTMENTS.map((d) => {
      const text = deptText(d);
      const lines = [
        ...d.triggers.map((t) => ({ kind: "Trigger", text: t })),
        ...d.outOfScope.map((o) => ({ kind: "Out of scope", text: `${o.need} → ${o.goTo}` })),
        ...d.contacts.map((c) => ({ kind: "Contact", text: `${c.label}: ${c.value}` })),
        ...d.escalation.map((e) => ({ kind: e.level, text: `${e.who} — ${e.when}` })),
        ...(d.intake.steps ?? []).map((s) => ({ kind: "Intake", text: s })),
        ...(d.intake.bullets ?? []).map((s) => ({ kind: "Intake", text: s })),
        ...d.placeholders.map((p) => ({ kind: "Placeholder", text: p })),
      ].filter((l) => l.text.toLowerCase().includes(q));
      return { dept: d, hit: text.includes(q), lines };
    }).filter((m) => m.hit);
  }, [q]);

  const active = DEPARTMENTS.find((d) => d.id === activeId)!;
  const totalUnverified = DEPARTMENTS.reduce((n, d) => n + unverifiedCount(d), 0);

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
              placeholder="Search departments, triggers, contacts, escalation tiers…"
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
            {DEPARTMENTS.map((d) => {
              const Icon = ICONS[d.id]!;
              const isActive = d.id === activeId && !q;
              const count = unverifiedCount(d);
              return (
                <li key={d.id}>
                  <button
                    onClick={() => {
                      setActiveId(d.id);
                      setQuery("");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      isActive
                        ? "bg-secondary font-medium text-secondary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="flex-1 truncate">{d.short}</span>
                    {d.internalOnly ? (
                      <Badge variant="destructive" className="text-[9px]">
                        Internal
                      </Badge>
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
          <div className="mb-6 flex gap-2 overflow-x-auto pb-1 lg:hidden">
            {DEPARTMENTS.map((d) => (
              <button
                key={d.id}
                onClick={() => {
                  setActiveId(d.id);
                  setQuery("");
                }}
                className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs ${
                  d.id === activeId && !q
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground"
                }`}
              >
                {d.short}
              </button>
            ))}
          </div>

          {q ? (
            <div className="space-y-6 pb-16">
              <p className="text-sm text-muted-foreground">
                {matches?.length ?? 0} department{matches?.length === 1 ? "" : "s"} match “{query}”
              </p>
              {matches?.map(({ dept, lines }) => {
                const Icon = ICONS[dept.id]!;
                return (
                  <div key={dept.id} className="rounded-xl border border-border bg-surface p-5">
                    <button
                      onClick={() => {
                        setActiveId(dept.id);
                        setQuery("");
                      }}
                      className="flex items-center gap-2 text-left text-base font-semibold hover:underline"
                    >
                      <Icon className="size-4 text-primary" />
                      {dept.name}
                    </button>
                    <ul className="mt-3 space-y-2">
                      {lines.slice(0, 8).map((l, i) => (
                        <li key={`${l.kind}-${i}`} className="flex flex-wrap items-start gap-2 text-sm">
                          <Badge variant="outline" className="text-[10px] uppercase">
                            {l.kind}
                          </Badge>
                          <span className="flex-1 text-foreground/85">{l.text}</span>
                        </li>
                      ))}
                      {lines.length === 0 ? (
                        <li className="text-sm text-muted-foreground">
                          Matched in department overview.
                        </li>
                      ) : null}
                    </ul>
                  </div>
                );
              })}
              {matches?.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                  No results. Try “SOW”, “P1”, “DPA”, or “log retention”.
                </p>
              ) : null}
            </div>
          ) : (
            <DepartmentView dept={active} placeholdersOnly={placeholdersOnly} />
          )}
        </main>
      </div>
    </div>
  );
}
