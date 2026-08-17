import { useEffect, useState } from "react";
import { Link2, ExternalLink, Plus, Search, Trash2 } from "lucide-react";
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
  submitted_by?: string;
}

const INITIAL_LINKS: LinkItem[] = [
  {
    id: "l1",
    title: "Copado Product Documentation",
    category: "Product & Docs",
    url: "https://docs.copado.com",
    description: "Official documentation for Copado DevOps, CRT, and Salesforce tools.",
  },
  {
    id: "l2",
    title: "Support Escalation SLA Matrix",
    category: "Support & Operations",
    url: "https://success.copado.com",
    description: "Standard support ticket response targets and escalation triggers.",
  },
];

export function LinkBank() {
  const { isAdmin } = useAdmin();
  const [links, setLinks] = useState<LinkItem[]>(INITIAL_LINKS);
  const [query, setQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Support & Operations");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");

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

    const newLink = {
      title: title.trim(),
      category,
      url: url.trim(),
      description: description.trim(),
    };

    const { data, error } = await supabase.from("link_bank").insert([newLink]).select();
    if (!error && data && data[0]) {
      setLinks((prev) => [data[0] as LinkItem, ...prev]);
      setTitle("");
      setUrl("");
      setDescription("");
      setShowAdd(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this link?")) return;
    setLinks((prev) => prev.filter((l) => l.id !== id));
    await supabase.from("link_bank").delete().eq("id", id);
  }

  const filtered = links.filter(
    (l) =>
      l.title.toLowerCase().includes(query.toLowerCase()) ||
      l.description.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Link2 className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Centralized CSM Link Bank</h2>
              <p className="text-xs text-muted-foreground">
                Single repository for official forms, intake portals, and internal resources.
              </p>
            </div>
          </div>
          <Button onClick={() => setShowAdd(!showAdd)} size="sm" className="text-xs gap-1.5">
            <Plus className="size-4" /> Add Link
          </Button>
        </div>

        {showAdd ? (
          <form onSubmit={handleAddLink} className="mt-4 pt-4 border-t border-border grid gap-3 sm:grid-cols-2">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Resource Title *" className="text-xs h-9" required />
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="URL (https://...)" className="text-xs h-9" required />
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs">
              <option value="Support & Operations">Support &amp; Operations</option>
              <option value="Product & Docs">Product &amp; Docs</option>
              <option value="Sales & Contracts">Sales &amp; Contracts</option>
            </select>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short Description" className="text-xs h-9" />
            <div className="sm:col-span-2 flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowAdd(false)} className="text-xs">Cancel</Button>
              <Button type="submit" size="sm" className="text-xs">Save Link</Button>
            </div>
          </form>
        ) : null}

        <div className="mt-4 relative max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search link bank..." className="pl-9 h-9 text-xs" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {filtered.map((item) => (
          <div key={item.id} className="rounded-xl border border-border bg-card p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Badge variant="secondary" className="text-[10px]">{item.category}</Badge>
                {isAdmin ? (
                  <button onClick={() => handleDelete(item.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="size-3.5" />
                  </button>
                ) : null}
              </div>
              <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
              <p className="text-xs text-muted-foreground mb-3">{item.description}</p>
            </div>
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
            >
              Open Resource <ExternalLink className="size-3" />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}