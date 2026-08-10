import { useMemo, useState } from "react";
import { ExternalLink, Link2, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { DEPARTMENTS } from "@/data/directory";
import { deptTheme } from "@/data/dept-theme";
import { CopyButton } from "@/components/directory/copy-button";
import { today, useLinkBank } from "@/lib/workspace-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const linkSchema = z.object({
  name: z.string().trim().min(2, "Give the resource a name").max(120),
  deptId: z.string().trim().min(1, "Pick a department"),
  url: z.string().trim().url("Enter a full URL (https://…)").max(500),
  notes: z.string().trim().max(500),
  by: z.string().trim().min(2, "Add your name").max(80),
});

const deptName = (id: string) => DEPARTMENTS.find((d) => d.id === id)?.short ?? id;

export function LinkBank() {
  const { links, addLink, removeLink } = useLinkBank();
  const [query, setQuery] = useState("");
  const [dept, setDept] = useState("all");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return links.filter(
      (l) =>
        (dept === "all" || l.deptId === dept) &&
        (!q ||
          [l.name, l.url, l.notes, l.by, deptName(l.deptId)]
            .join(" ")
            .toLowerCase()
            .includes(q)),
    );
  }, [links, query, dept]);

  return (
    <section className="space-y-5 pb-16">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <Link2 className="size-5 text-primary" /> Centralized Link Bank
          </h2>
          <p className="text-sm text-muted-foreground">
            Every official guide, intake form and portal across all nine departments — searchable in
            one table.
          </p>
        </div>
        <AddLinkDialog open={open} onOpenChange={setOpen} onAdd={addLink} />
      </header>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter links by name, department, owner…"
            className="pl-9"
            aria-label="Filter links"
          />
        </div>
        <Select value={dept} onValueChange={setDept}>
          <SelectTrigger className="w-[220px]" aria-label="Filter by department">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {DEPARTMENTS.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.short}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Resource</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>URL</TableHead>
              <TableHead className="hidden lg:table-cell">Notes</TableHead>
              <TableHead>Last updated by</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((l) => {
              const theme = deptTheme(l.deptId);
              return (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.name}</TableCell>
                  <TableCell>
                    <Badge className={`text-[10px] ${theme.badge}`}>{deptName(l.deptId)}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <a
                        href={l.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex max-w-[240px] items-center gap-1 truncate text-sm text-primary hover:underline"
                      >
                        {l.url.replace(/^https?:\/\//, "")}
                        <ExternalLink className="size-3 shrink-0" />
                      </a>
                      <CopyButton value={l.url} label={l.name} />
                    </div>
                  </TableCell>
                  <TableCell className="hidden max-w-[280px] text-sm text-muted-foreground lg:table-cell">
                    {l.notes || "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {l.by}
                    <span className="block">{l.date}</span>
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      aria-label={`Remove ${l.name}`}
                      onClick={() => {
                        removeLink(l.id);
                        toast("Link removed");
                      }}
                      className="text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  No links yet — add the first one with “Add / Submit New Link”.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

function AddLinkDialog({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdd: (l: {
    name: string;
    deptId: string;
    url: string;
    notes: string;
    by: string;
    date: string;
  }) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    deptId: "customer-support",
    url: "",
    notes: "",
    by: "",
  });
  const set = (k: keyof typeof form) => (v: string) => setForm((s) => ({ ...s, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" /> Add / Submit New Link
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a resource to the link bank</DialogTitle>
          <DialogDescription>
            Shared instantly with every CSM using this directory.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="l-name">Resource / link name</Label>
            <Input
              id="l-name"
              maxLength={120}
              value={form.name}
              onChange={(e) => set("name")(e.target.value)}
              placeholder="Creating Opportunities in Salesforce Guide"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="l-dept">Target department</Label>
            <Select value={form.deptId} onValueChange={set("deptId")}>
              <SelectTrigger id="l-dept">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.short}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="l-url">URL</Label>
            <Input
              id="l-url"
              maxLength={500}
              value={form.url}
              onChange={(e) => set("url")(e.target.value)}
              placeholder="https://sites.google.com/copado.com/customersuccess/…"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="l-notes">Description / notes</Label>
            <Textarea
              id="l-notes"
              maxLength={500}
              value={form.notes}
              onChange={(e) => set("notes")(e.target.value)}
              placeholder="What it's for and when to use it"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="l-by">Submitted / last updated by</Label>
              <Input
                id="l-by"
                maxLength={80}
                value={form.by}
                onChange={(e) => set("by")(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="l-date">Date</Label>
              <Input id="l-date" value={today()} readOnly className="text-muted-foreground" />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={() => {
              const parsed = linkSchema.safeParse(form);
              if (!parsed.success) {
                toast.error(parsed.error.issues[0]!.message);
                return;
              }
              onAdd({ ...parsed.data, date: today() });
              setForm({ name: "", deptId: "customer-support", url: "", notes: "", by: form.by });
              onOpenChange(false);
              toast.success("Link added to the bank");
            }}
          >
            Submit link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
