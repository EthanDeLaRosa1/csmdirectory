import { useState } from "react";
import { ArrowRight, Compass, Loader2, Sparkles } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { askDirectory } from "@/lib/assistant.functions";
import { smartSearch } from "@/lib/smart-search";
import { deptTheme } from "@/data/dept-theme";
import type { Department } from "@/data/directory";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

const EXAMPLES = [
  "Customer needs a SOC 2 report before signing",
  "Logs are older than 14 days and we need them back",
  "Customer wants a custom SOW scoping call",
  "They're asking when a roadmap feature ships",
];

export function NotSureAssistant({
  departments,
  onGoTo,
}: {
  departments: Department[];
  onGoTo: (deptId: string, section?: string) => void;
}) {
  const ask = useServerFn(askDirectory);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    deptId: string | null;
    answer: string;
    steps: string[];
  } | null>(null);

  const fallback = smartSearch(question, departments).slice(0, 4);

  async function run(q: string) {
    const text = q.trim();
    if (text.length < 3) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await ask({ data: { question: text } });
      setResult(res);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "The assistant couldn't answer — try the matches below.",
      );
    } finally {
      setLoading(false);
    }
  }

  const suggested = result?.deptId ? departments.find((d) => d.id === result.deptId) : undefined;

  return (
    <section
      id="sec-not-sure"
      className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/8 to-transparent p-5"
    >
      <div className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Compass className="size-4" />
        </span>
        <div>
          <h2 className="text-sm font-semibold">Not sure? Let us point you</h2>
          <p className="text-xs text-muted-foreground">
            Describe the situation in plain English — we'll suggest the owning team and next steps.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <Textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void run(question);
          }}
          rows={3}
          placeholder="e.g. Customer's sandbox refresh failed after upgrade and their go-live is Friday…"
          className="bg-background"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => void run(question)} disabled={loading || question.trim().length < 3}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {loading ? "Thinking…" : "Point me somewhere"}
          </Button>
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => {
                setQuestion(ex);
                void run(ex);
              }}
              className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-lg border border-destructive/40 bg-danger-soft/40 p-3 text-sm text-foreground/90">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="mt-4 rounded-xl border border-border bg-background p-4">
          {suggested ? (
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge className={deptTheme(suggested.id).badge}>{suggested.name}</Badge>
              <Button size="sm" variant="outline" onClick={() => onGoTo(suggested.id)}>
                Open department <ArrowRight className="size-3.5" />
              </Button>
            </div>
          ) : null}
          <p className="text-sm text-foreground/90">{result.answer}</p>
          {result.steps.length ? (
            <ol className="mt-3 space-y-1.5 text-sm">
              {result.steps.map((s, i) => (
                <li key={s} className="flex gap-2">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded bg-secondary text-[11px] font-semibold">
                    {i + 1}
                  </span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      ) : null}

      {!result && !loading && fallback.length ? (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Closest matches in the directory
          </p>
          {fallback.map((h, i) => (
            <button
              key={`${h.dept.id}-${i}`}
              onClick={() => onGoTo(h.dept.id, h.section)}
              className="flex w-full items-start gap-2 rounded-lg border border-border bg-background p-2.5 text-left text-sm hover:bg-accent"
            >
              <Badge className={`${deptTheme(h.dept.id).badge} shrink-0 text-[10px]`}>
                {h.dept.short}
              </Badge>
              <span className="flex-1 text-foreground/85">{h.text}</span>
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
