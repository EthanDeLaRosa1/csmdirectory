import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CsmuGuides } from "@/components/directory/csmu-guides";
import {
  Banknote,
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
  Zap,
  Star,
  MessageSquareCode,
} from "lucide-react";

import { DepartmentView } from "@/components/directory/department-view";
import { FeedbackBoard } from "@/components/directory/feedback-board";
import { LinkBank } from "@/components/directory/link-bank";
import { GlossaryFinder } from "@/components/directory/glossary-finder";

import { AdminPinDialog, AdminToggle } from "@/components/directory/admin-controls";
import { AdminProvider } from "@/lib/admin-store";
import { NotSureAssistant } from "@/components/directory/not-sure-assistant";
import { ThemeToggle } from "@/components/directory/theme-toggle";
import { ColorThemePicker } from "@/components/directory/color-theme-picker";
import { SlackIntakeModal } from "@/components/directory/slack-intake-dialog";
import { DirectoryStoreProvider, useDirectoryStore } from "@/lib/directory-store";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
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
  const { departments } = useDirectoryStore();

  const [view, setView] = useState<ViewId>("directory");
  const [activeId, setActiveId] = useState<string>(departments[0]!.id);
  const [pulseSection, setPulseSection] = useState<string | null>(null);
  const [starredDepts, setStarredDepts] = useState<string[]>([]);
  const [slackModalOpen, setSlackModalOpen] = useState(false);

  // Restore saved view, department, and starred items after hydration
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
      const savedStarred = localStorage.getItem("csm_starred_departments");
      if (savedStarred) setStarredDepts(JSON.parse(savedStarred));
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
  };

  const toggleStar = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = starredDepts.includes(id)
      ? starredDepts.filter((d) => d !== id)
      : [...starredDepts, id];
    setStarredDepts(next);
    localStorage.setItem("csm_starred_departments", JSON.stringify(next));
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header Bar */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-5 py-2.5">
          {/* Brand Logo */}
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold shadow-sm">
              <Zap className="size-4 fill-current" />
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-tight">Copado CS Command Center</span>
              <span className="hidden sm:inline-block rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Mission Control
              </span>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <ColorThemePicker />
            <AdminToggle />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1500px] gap-8 px-5">
        {/* Sidebar Navigation */}
        <nav className="sticky top-[53px] hidden h-[calc(100vh-53px)] w-64 shrink-0 overflow-y-auto py-5 lg:block pr-2">
          {starredDepts.length > 0 ? (
            <div className="mb-4">
              <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-500 flex items-center gap-1">
                <Star className="size-3 fill-amber-500" /> Pinned Favorites
              </p>
              <ul className="space-y-1">
                {starredDepts.map((id) => {
                  const d = departments.find((item) => item.id === id);
                  if (!d) return null;
                  const Icon = ICONS[d.id]!;
                  return (
                    <li key={`starred-${d.id}`}>
                      <button
                        onClick={() => goTo(d.id)}
                        className={`flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                          d.id === activeId && view === "directory"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            : "text-muted-foreground hover:bg-accent"
                        }`}
                      >
                        <Icon className="size-3.5 shrink-0" />
                        <span className="flex-1 truncate text-left">{d.short}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="my-3 border-b border-border/60" />
            </div>
          ) : null}

          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            Departments
          </p>
          <ul className="space-y-1">
            {departments.map((d) => {
              const Icon = ICONS[d.id]!;
              const isActive = d.id === activeId && view === "directory";
              const isStarred = starredDepts.includes(d.id);
              return (
                <li key={d.id}>
                  <button
                    onClick={() => goTo(d.id)}
                    className={`group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      isActive
                        ? "bg-secondary font-medium text-secondary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="flex-1 truncate">{d.short}</span>
                    <button
                      onClick={(e) => toggleStar(d.id, e)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-muted-foreground hover:text-amber-500"
                      title={isStarred ? "Unpin Favorite" : "Pin to Favorites"}
                    >
                      <Star className={`size-3.5 ${isStarred ? "fill-amber-500 text-amber-500 opacity-100" : ""}`} />
                    </button>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Main Workspace */}
        <main className="min-w-0 flex-1 py-6">
          {/* Main Navigation Bar */}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card p-1">
            <div className="flex flex-wrap gap-1">
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
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    view === id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent"
                  }`}
                >
                  <TabIcon className="size-4" />
                  {label}
                </button>
              ))}
            </div>

            {view === "directory" ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSlackModalOpen(true)}
                className="text-xs gap-1.5"
              >
                <MessageSquareCode className="size-3.5 text-sky-500" /> Copy Slack Intake
              </Button>
            ) : null}
          </div>

          {/* Tab Views */}
          {view === "links" ? (
            <LinkBank />
          ) : view === "csmu" ? (
            <CsmuGuides />
          ) : view === "glossary" ? (
            <GlossaryFinder />
          ) : view === "feedback" ? (
            <FeedbackBoard />
          ) : (
            <div className="space-y-8 pb-4">
              {/* Prominent Landing Hero: AI Smart Routing Assistant */}
              <NotSureAssistant departments={departments} onGoTo={goTo} />

              {/* Department Escalation View */}
              <DepartmentView
                dept={active}
                placeholdersOnly={false}
                pulseSection={pulseSection}
                onGoTo={goTo}
              />
            </div>
          )}
        </main>
      </div>

      {/* Slack Escalation Snippet Modal */}
      <SlackIntakeModal
        deptName={active.name}
        isOpen={slackModalOpen}
        onClose={() => setSlackModalOpen(false)}
      />
    </div>
  );
}