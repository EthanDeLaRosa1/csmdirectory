import { useState } from "react";
import { MessageSquarePlus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { today, useFeedback, type FeedbackEntry } from "@/lib/workspace-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const schema = z.object({
  name: z.string().trim().min(2, "Add your name").max(80),
  topic: z.string().trim().min(3, "Describe the guide or tool you need").max(160),
  urgency: z.string().trim().min(1),
  notes: z.string().trim().max(800),
});

const URGENCY_STYLE: Record<string, string> = {
  High: "bg-destructive/15 text-destructive ring-1 ring-destructive/30",
  Medium: "bg-warning-soft text-warning-foreground",
  Low: "bg-secondary text-secondary-foreground",
};

export function FeedbackBoard() {
  const { feedback, addFeedback, removeFeedback } = useFeedback();
  const [form, setForm] = useState({ name: "", topic: "", urgency: "Medium", notes: "" });
  const set = (k: keyof typeof form) => (v: string) => setForm((s) => ({ ...s, [k]: v }));

  return (
    <section className="space-y-6 pb-16">
      <header>
        <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
          <Sparkles className="size-5 text-primary" /> CSM Feedback &amp; Wishlist
        </h2>
        <p className="text-sm text-muted-foreground">
          Missing a scenario guide, shortcut or tool? Tell us and it goes on the build list.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <form
          className="space-y-4 rounded-xl border border-border bg-card p-5"
          onSubmit={(e) => {
            e.preventDefault();
            const parsed = schema.safeParse(form);
            if (!parsed.success) {
              toast.error(parsed.error.issues[0]!.message);
              return;
            }
            addFeedback({
              ...parsed.data,
              urgency: parsed.data.urgency as FeedbackEntry["urgency"],
              date: today(),
            });
            setForm({ name: form.name, topic: "", urgency: "Medium", notes: "" });
            toast.success("Thanks — added to the wishlist");
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="f-name">CSM name</Label>
            <Input
              id="f-name"
              maxLength={80}
              value={form.name}
              onChange={(e) => set("name")(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="f-topic">Requested topic / guide</Label>
            <Input
              id="f-topic"
              maxLength={160}
              value={form.topic}
              onChange={(e) => set("topic")(e.target.value)}
              placeholder="e.g. Playbook for mid-contract GovCloud migrations"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="f-urgency">Urgency</Label>
            <Select value={form.urgency} onValueChange={set("urgency")}>
              <SelectTrigger id="f-urgency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Low">Low — nice to have</SelectItem>
                <SelectItem value="Medium">Medium — slows me down weekly</SelectItem>
                <SelectItem value="High">High — blocking customer work</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="f-notes">Notes</Label>
            <Textarea
              id="f-notes"
              maxLength={800}
              rows={4}
              value={form.notes}
              onChange={(e) => set("notes")(e.target.value)}
              placeholder="Context, examples, links you already use…"
            />
          </div>
          <Button type="submit" className="w-full">
            <MessageSquarePlus className="size-4" /> Submit feedback
          </Button>
        </form>

        <div className="space-y-3">
          {feedback.map((f) => (
            <article key={f.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={`text-[10px] ${URGENCY_STYLE[f.urgency] ?? ""}`}>
                  {f.urgency}
                </Badge>
                <h3 className="flex-1 text-sm font-semibold">{f.topic}</h3>
                <button
                  type="button"
                  aria-label={`Remove ${f.topic}`}
                  onClick={() => removeFeedback(f.id)}
                  className="text-muted-foreground transition-colors hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
              {f.notes ? (
                <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{f.notes}</p>
              ) : null}
              <p className="mt-2 text-[11px] text-muted-foreground">
                {f.name} · {f.date}
              </p>
            </article>
          ))}
          {feedback.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              No requests yet. Senior CSM input lands here.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
