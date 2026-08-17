import { useEffect, useState } from "react";
import { Link2, ExternalLink, Plus, Search, Trash2, Pencil, Check, X, Clock, User, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { useAdmin } from "@/lib/admin-store";

interface LinkItem {
  id: string;
  title: string;
  category: string;
  url: string;
  description: string;
  updated_at?: string;
  updated_by?: string;
}

const INITIAL_LINKS: LinkItem[] = [
  {
    id: "l1",
    title: "Customer Support Escalation Portal",
    category: "Customer Support",
    url: "https://success.copado.com",
    description: "Official portal for submitting tickets, tracking SLAs, and escalating P1/P2 support cases.",
    updated_at: "2026-08-01T00:00:00Z",
    updated_by: "CS Ops",
  },
  {
    id: "l2",
    title: "TAM Engagement Request Form",
    category: "Technical Account Managers",
    url: "https://copado.service-now.com/tam_request",
    description: "Form to request dedicated TAM allocation or technical architecture assistance.",
    updated_at: "2026-08-01T00:00:00Z",
    updated_by: "CS Ops",
  },
  {
    id: "l3",
    title: "Professional Services SOW & Scope Intake",
    category: "Professional Services",
    url: "https://copado.com/ps-sow-request",
    description: "Scope drafting and SOW generation for custom DevOps implementation projects.",
    updated_at: "2026-08-01T00:00:00Z",
    updated_by: "CS Ops",
  },
  {
    id: "l4",
    title: "Copado Infrastructure & Trust Status Page",
    category: "Infrastructure & Cloud Ops",
    url: "https://trust.copado.com",
    description: "Real-time system health, scheduled maintenance windows, and uptime metrics.",
    updated_at: "2026-08-01T00:00:00Z",
    updated_by: "Cloud Ops",
  },
  {
    id: "l5",
    title: "Product Feedback & Roadmap Portal",
    category: "Product Management",
    url: "https://ideas.copado.com",
    description: "Submit feature enhancements, vote on roadmap items, and review product release notes.",
    updated_at: "2026-08-01T00:00:00Z",
    updated_by: "Product Team",
  },
  {
    id: "l6",
    title: "Deal Desk & AE Co-Selling Request",
    category: "Sales & AE Co-Selling",
    url: "https://salesforce.com/dealdesk",
    description: "Intake form for expansion opportunities, license additions, and AE co-selling assistance.",
    updated_at: "2026-08-01T00:00:00Z",
    updated_by: "Sales Enablement",
  },
  {
    id: "l7",
    title: "Finance & Invoice Inquiry Portal",
    category: "Finance & Billing",
    url: "https://billing.copado.com",
    description: "Submit billing disputes, request invoice copies, or update payment terms.",
    updated_at: "2026-08-01T00:00:00Z",
    updated_by: "Finance Dept",
  },
  {
    id: "l8",
    title: "InfoSec & Compliance Questionnaire Portal",
    category: "Security & InfoSec",
    url: "https://trust.copado.com/security",
    description: "Access SOC 2 Type II reports, ISO certifications, and security vendor assessment packets.",
    updated_at: "2026-08-01T00:00:00Z",
    updated_by: "InfoSec",
  },
  {
    id: "l9",
    title: "Legal & Contract Redline Review Intake",
    category: "Legal & Contracts",
    url: "https://legal.copado.com/intake",
    description: "Submit custom MSAs, NDAs, and customer contract redlines for legal team review.",
    updated_at: "2026-08-01T00:00:00Z",
    updated_by: "Legal Team",
  },
];

const CATEGORIES = [
  "Customer Support",
  "Technical Account Managers",
  "Professional Services",
  "Infrastructure & Cloud Ops",
  "Product Management",
  "Sales & AE Co-Selling",
  "Finance & Billing",
  "Security & InfoSec",
  "Legal & Contracts",
  "Enablement & Training",
  "CSM Resources",
];

function formatDate(dateStr?: string) {
  if (!dateStr) return "Aug 2026";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

export function LinkBank() {
  const { isAdmin } = useAdmin();
  const [links, setLinks] = useState<LinkItem[]>(INITIAL_LINKS);
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Customer Support");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [editorName, setEditorName] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editEditorName, setEditEditorName] = useState("");

  const categories = ["All", ...Array.from(new Set(links.map((l) => l.category)))];

  useEffect(() => {
    fetchLinks();
  }, []);

  async function fetchLinks() {
    try {
      const { data, error } = await supabase.from("link_bank").select("*");
      if (!error && data && data.length > 0) {
        setLinks([...INITIAL_LINKS, ...(data as LinkItem[])]);
      }
    } catch {
      /* fallback */
    }
  }

  async function handleAddLink(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !url.trim()) return;

    setSaving(true);
    const authorStr = editorName.trim() || "CSM Team Member";
    const nowIso = new Date().toISOString();

    const payload = {
      title: title.trim(),
      category,
      url: url.trim(),
      description: description.trim(),
      updated_at: nowIso,
      updated_by: authorStr,
    };

    try {
      const { data, error } = await supabase.from("link_bank").insert([payload]).select();
      if (error) {
        const fallback: LinkItem = { id: "temp-" + Date.now(), ...payload };
        setLinks((prev) => [fallback, ...prev]);
      } else if (data && data[0]) {
        setLinks((prev) => [data[0] as LinkItem, ...prev]);
      }
    } catch {
      const fallback: LinkItem = { id: "temp-" + Date.now(), ...payload };
      setLinks((prev) => [fallback, ...prev]);
    } finally {
      setSaving(false);
      setTitle("");
      setUrl("");
      setDescription("");
      setEditorName("");
      setShowAdd(false);
    }
  }

  function startEditing(item: LinkItem) {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditCategory(item.category);
    setEditUrl(item.url);
    setEditDescription(item.description);
    setEditEditorName(item.updated_by || "");
  }

  async function handleSaveEdit(id: string) {
    const authorStr = editEditorName.trim() || "CSM Team Member";
    const nowIso = new Date().toISOString();

    const updatedData = {
      title: editTitle.trim(),
      category: editCategory,
      url: editUrl.trim(),
      description: editDescription.trim(),
      updated_at: nowIso,
      updated_by: authorStr,
    };

    setLinks((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...updatedData } : l))
    );
    setEditingId(null);

    try {
      await supabase.from("link_bank").update(updatedData).eq("id", id);
    } catch {
      /* ignore */
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this resource link?")) return;
    setLinks((prev) => prev.filter((l) => l.id !== id));
    await supabase.from("link_bank").delete().eq("id", id);
  }

  const filtered = links.filter((l) => {
    const matchesCategory = selectedCategory === "All" || l.category === selectedCategory;
    const matchesQuery =
      l.title.toLowerCase().includes(query.toLowerCase()) ||
      l.description.toLowerCase().includes(query.toLowerCase()) ||
      l.category.toLowerCase().includes(query.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Link2 className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Centralized CSM Link Bank</h2>
              <p className="text-xs text-muted-foreground">
                Single repository for official intake forms, portals, and internal resources across all teams.
              </p>
            </div>
          </div>
          <Button onClick={() => setShowAdd(!showAdd)} size="sm" className="text-xs gap-1.5 shrink-0">
            <Plus className="size-4" /> Add New Link
          </Button>
        </div>

        {showAdd ? (
          <form onSubmit={handleAddLink} className="mt-4 pt-4 border-t border-border grid gap-3 sm:grid-cols-2">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Resource Title *"
              className="text-xs h-9"
              required
            />
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="URL (https://...)"
              className="text-xs h-9"
              required
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <Input
              value={editorName}
              onChange={(e) => setEditorName(e.target.value)}
              placeholder="Your Name / Team"
              className="text-xs h-9"
            />
            <div className="sm:col-span-2">
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short Description of resource"
                className="text-xs h-9"
              />
            </div>
            <div className="sm:col-span-2 flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowAdd(false)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" size="sm" className="text-xs gap-1.5" disabled={saving}>
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
                {saving ? "Saving..." : "Save Link"}
              </Button>
            </div>
          </form>
        ) : null}

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search link bank by keyword or team..."
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {categories.slice(0, 5).map((cat) => (
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

      <div className="grid gap-4 sm:grid-cols-2">
        {filtered.map((item) => {
          const isEditing = editingId === item.id;

          if (isEditing) {
            return (
              <div key={item.id} className="rounded-xl border border-primary bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary">Editing Link Resource</span>
                  <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:text-foreground">
                    <X className="size-4" />
                  </button>
                </div>
                <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Title" className="text-xs h-8" />
                <Input value={editUrl} onChange={(e) => setEditUrl(e.target.value)} placeholder="URL" className="text-xs h-8" />
                <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="w-full rounded-md border border-input bg-background px-2.5 py-1 text-xs">
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Description" className="text-xs h-8" />
                <Input value={editEditorName} onChange={(e) => setEditEditorName(e.target.value)} placeholder="Updated By (Your Name)" className="text-xs h-8" />
                <div className="flex justify-end gap-2 pt-1">
                  <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setEditingId(null)}>Cancel</Button>
                  <Button size="sm" className="text-xs h-7 gap-1" onClick={() => handleSaveEdit(item.id)}>
                    <Check className="size-3" /> Save Changes
                  </Button>
                </div>
              </div>
            );
          }

          return (
            <div
              key={item.id}
              className="rounded-xl border border-border bg-card p-4 flex flex-col justify-between transition-all hover:border-primary/40"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="secondary" className="text-[10px]">
                    {item.category}
                  </Badge>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => startEditing(item)} className="text-muted-foreground hover:text-primary transition-colors p-1" title="Edit Link Details">
                      <Pencil className="size-3.5" />
                    </button>
                    {isAdmin ? (
                      <button onClick={() => handleDelete(item.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1" title="Admin: Delete Link">
                        <Trash2 className="size-3.5" />
                      </button>
                    ) : null}
                  </div>
                </div>

                {/* Hyperlinked Title */}
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group inline-flex items-center gap-1.5 font-semibold text-sm hover:text-primary transition-colors mb-1"
                >
                  <span>{item.title}</span>
                  <ExternalLink className="size-3.5 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
                </a>

                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{item.description}</p>
              </div>

              <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-3 mt-3 border-t border-border/40">
                <span className="flex items-center gap-1">
                  <Clock className="size-3" /> {formatDate(item.updated_at)}
                </span>
                <span className="flex items-center gap-1">
                  <User className="size-3" /> {item.updated_by || "CS Ops"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}