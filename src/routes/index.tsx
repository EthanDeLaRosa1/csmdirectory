import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CsmuGuides } from "@/components/directory/csmu-guides";
import {
  Banknote,
  Building2,
  Compass,
  FileSignature,
  LifeBuoy,
  Lightbulb,
  BookOpen,
  Link2,
  MessageSquarePlus,
  LayoutGrid,
  Server,
  ShieldCheck,
  TrendingUp,
  UserCog,
  GraduationCap,
} from "lucide-react";
import type { Department } from "@/data/directory";
import { DepartmentView } from "@/components/directory/department-view";
import { FeedbackBoard } from "@/components/directory/feedback-board";
import { LinkBank } from "@/components/directory/link-bank";
import { GlossaryFinder } from "@/components/directory/glossary-finder";

import { AdminPinDialog, AdminToggle } from "@/components/directory/admin-controls";
import { AdminProvider } from "@/lib/admin-store";
import { NotSureAssistant } from "@/components/directory/not-sure-assistant";
import { ThemeToggle } from "@/components/directory/theme-toggle";
import { deptTheme } from "@/data/dept-theme";
import { DirectoryStoreProvider, useDirectoryStore } from "@/lib/directory-store";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CSM Directory | Copado" },
      {
        name: "description",
        content:
          "Who to go to for what: triggers, intake channels, SLAs, and 3-tier escalation paths across 9 internal Copado teams.",
      },
      { property: "og:title", content: "CSM Escalation & Resource Directory" },
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
    <AdminProvider>
      <DirectoryStoreProvider>
        <DirectoryPage />
        <AdminPinDialog />
      </DirectoryStoreProvider>
    </AdminProvider>
  );
}

type ViewId = "directory" | "links" | "csmu" | "glossary" | "feedback";

function DirectoryPage() {
  const { departments, verificationOf, unverifiedItems } = useDirectoryStore();

  const [view, setView] = useState<ViewId>("directory");
  const [activeId, setActiveId] = useState<string>(departments[0]!.id);
  const [placeholdersOnly, setPlaceholdersOnly] = useState(false);
  const [pulseSection, setPulseSection] = useState<string | null>(null);

  // Restore saved view and active department safely after hydration
  useEffect(() => {
    try {
      const savedView = localStorage.getItem("csm_directory_active_view");
      if (savedView && ["directory", "links", "csmu", "glossary", "feedback"].includes(savedView)) {
        setView(savedView as ViewId);
      }
      const savedDept = localStorage.getItem("csm_directory_active_dept");
      if (savedDept && departments.some((d) => d.id === savedDept)) {
        setActiveId(savedDept);
      }
    } catch {
      /* ignore storage errors */
    }
  }, [departments]);

  const handleTabChange = (newView: ViewId) => {
    setView(newView);
    try {
      localStorage.setItem("csm_directory_active_view", newView);
    } catch {
      /* ignore */
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goTo = useCallback((deptId: string, section?: string) => {
    setActiveId(deptId);
    setView("directory");

    try {
      localStorage.setItem("csm_directory_active_dept", deptId);
      localStorage.setItem("csm_directory_active_view", "directory");
    } catch {
      /* ignore */
    }

    setPulseSection(section ?? null);
    requestAnimationFrame(() => {
      const el = section ? document.getElementById(section) : null;
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      else window.scrollTo({ top: 0, behavior: "smooth" });
    });
    if (section) window.setTimeout(() => setPulseSection(null), 2600);
  }, []);

  const active = departments.find((d) => d.id === activeId) ?? departments[0]!;
  const totalUnverified = departments.reduce((n, d) => n + unverifiedItems(d).length, 0);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Streamlined Header Bar with Live Indicator */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-5 py-2.5">
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Building2 className="size-4" />
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-tight">CSM Directory</span>
              <span className="hidden sm:inline-block rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Copado CS Ops
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3 rounded-full border border-border/80 bg-muted/40 px-3.5 py-1 text-xs">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-medium text-muted-foreground">
              Internal Escalation Paths &amp; SLAs Active
            </span>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-1">
              <Switch
                id="placeholders"
                checked={placeholdersOnly}
                onCheckedChange={setPlaceholdersOnly}
              />
              <Label htmlFor="placeholders" className="cursor-pointer text-xs select-none">
                Unverified
              </Label>
              <Badge className="bg-warning-soft text-warning-foreground text-[10px] px-1.5 py-0">
                {totalUnverified}
              </Badge>
            </div>
            <AdminToggle />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1500px] gap-8 px-5">
        <nav className="sticky top-[53px] hidden h-[calc(100vh-53px)] w-64 shrink-0 overflow-y-auto py-5 lg:block pr-2">
          <div className="flex items-center gap-2.5 px-3 mb-6">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Building2 className="size-4" />
            </span>
            <div className="min-w-0">
              <h1 className="text-xs font-bold leading-none truncate">CSM Directory</h1>
              <p className="text-[10px] text-muted-foreground leading-tight mt-1 truncate">
                Copado CS Ops
              </p>
            </div>
          </div>

          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            Departments
          </p>
          <ul className="space-y-1">
            {departments.map((d) => {
              const Icon = ICONS[d.id]!;
              const isActive = d.id === activeId && view === "directory";
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
                ["directory", "Department Directory", LayoutGrid],
                ["links", "Centralized Link Bank", Link2],
                ["csmu", "CSMU Guides", GraduationCap],
                ["glossary", "Glossary & Acronym Finder", BookOpen],
                ["feedback", "CSM Feedback & Wishlist", MessageSquarePlus],
              ] as [ViewId, string, typeof LifeBuoy][]
            ).map(([id, label, TabIcon]) => (
              <button
                key={id}
                onClick={() => handleTabChange(id)}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm ${
                  view === id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <TabIcon className="size-4" />
                {label}
              </button>
            ))}
          </div>

          {view === "directory" ? (
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

          {view === "links" ? (
            <LinkBank />
          ) : view === "csmu" ? (
            <CsmuGuides />
          ) : view === "glossary" ? (
            <GlossaryFinder />
          ) : view === "feedback" ? (
            <FeedbackBoard />
          ) : (
            <div className="space-y-10 pb-4">
              <DepartmentView
                dept={active}
                placeholdersOnly={placeholdersOnly}
                pulseSection={pulseSection}
                onGoTo={goTo}
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