import { AlertTriangle, ArrowRight, ChevronRight, CircleDot, Mail, ShieldAlert } from "lucide-react";
import type { Department } from "@/data/directory";
import { CASE_STATUSES, SLA_MATRIX, hasPlaceholder } from "@/data/directory";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function PlaceholderPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-warning-soft px-2.5 py-0.5 text-xs font-medium text-warning-foreground ring-1 ring-warning/50">
      <AlertTriangle className="size-3" />
      {children}
    </span>
  );
}

export function MaybePlaceholder({ text }: { text: string }) {
  if (hasPlaceholder(text)) return <PlaceholderPill>{text}</PlaceholderPill>;
  return <span>{text}</span>;
}

function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-3 flex items-baseline gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
        {children}
      </h2>
      {hint ? <span className="text-xs text-muted-foreground/70">{hint}</span> : null}
    </div>
  );
}

function EscalationStepper({ dept }: { dept: Department }) {
  return (
    <ol className="relative space-y-4 border-l border-border pl-6">
      {dept.escalation.map((step, i) => (
        <li key={step.level} className="relative">
          <span className="absolute -left-[31px] flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground ring-4 ring-background">
            {i + 1}
          </span>
          <Card className="border-border/70 bg-surface">
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="font-mono text-[10px] uppercase tracking-wider">
                  {step.level}
                </Badge>
                <CardTitle className="text-base">
                  <MaybePlaceholder text={step.who} />
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  When to escalate
                </p>
                <p className="mt-1 text-foreground/90">{step.when}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  CDR duty
                </p>
                <p className="mt-1 text-foreground/90">{step.cdr}</p>
              </div>
            </CardContent>
          </Card>
        </li>
      ))}
    </ol>
  );
}

export function DepartmentView({
  dept,
  placeholdersOnly,
}: {
  dept: Department;
  placeholdersOnly: boolean;
}) {
  const unverified = [
    ...dept.placeholders,
    ...dept.contacts.filter((c) => hasPlaceholder(c.value)).map((c) => `${c.label}: ${c.value}`),
    ...(hasPlaceholder(dept.owner) ? [`Entry Owner: ${dept.owner}`] : []),
  ];

  if (placeholdersOnly) {
    return (
      <div className="space-y-6">
        <Header dept={dept} unverifiedCount={unverified.length} />
        <Card className="border-warning/40 bg-warning-soft/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4 text-warning" />
              Unverified placeholders ({unverified.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {unverified.length ? (
              unverified.map((p) => <PlaceholderPill key={p}>{p}</PlaceholderPill>)
            ) : (
              <p className="text-sm text-muted-foreground">
                No unverified placeholders in this department.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <Header dept={dept} unverifiedCount={unverified.length} />

      {dept.criticalRule ? (
        <div
          className={`rounded-xl border p-5 ${
            dept.internalOnly
              ? "border-destructive/50 bg-danger-soft/50"
              : "border-warning/50 bg-warning-soft/40"
          }`}
        >
          <div className="flex gap-3">
            <ShieldAlert
              className={`mt-0.5 size-5 shrink-0 ${dept.internalOnly ? "text-destructive" : "text-warning"}`}
            />
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Critical rule before anything else
              </p>
              <p className="mt-1 font-semibold text-foreground">{dept.criticalRule.title}</p>
              <p className="mt-1.5 text-sm text-foreground/80">{dept.criticalRule.body}</p>
            </div>
          </div>
        </div>
      ) : null}

      <section>
        <SectionTitle hint="Side-by-side routing decision">When to use vs. where to go instead</SectionTitle>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-success/40">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-success">
                <CircleDot className="size-4" /> Trigger scenarios
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dept.triggersIntro ? (
                <p className="mb-3 text-sm text-muted-foreground">{dept.triggersIntro}</p>
              ) : null}
              <ul className="space-y-2 text-sm">
                {dept.triggers.map((t) => (
                  <li key={t} className="flex gap-2">
                    <ChevronRight className="mt-0.5 size-4 shrink-0 text-success" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-destructive/40">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-destructive">
                <AlertTriangle className="size-4" /> Out of scope — route elsewhere
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer need</TableHead>
                    <TableHead>Go here instead</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dept.outOfScope.map((row) => (
                    <TableRow key={row.need}>
                      <TableCell className="align-top text-sm">{row.need}</TableCell>
                      <TableCell className="align-top text-sm font-medium">
                        <span className="inline-flex items-center gap-1.5">
                          <ArrowRight className="size-3.5 text-muted-foreground" />
                          {row.goTo}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </section>

      <section>
        <SectionTitle>Intake & contact</SectionTitle>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{dept.intake.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {dept.intake.bullets ? (
                <ul className="space-y-2 text-sm">
                  {dept.intake.bullets.map((b) => (
                    <li key={b} className="flex gap-2">
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {dept.intake.steps ? (
                <ol className="space-y-2 text-sm">
                  {dept.intake.steps.map((s, i) => (
                    <li key={s} className="flex gap-3">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded bg-secondary text-[11px] font-semibold text-secondary-foreground">
                        {i + 1}
                      </span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ol>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Mail className="size-4 text-muted-foreground" />
                Contact details
                {dept.internalOnly ? (
                  <Badge variant="destructive" className="ml-1 text-[10px]">
                    Internal only
                  </Badge>
                ) : null}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="divide-y divide-border text-sm">
                {dept.contacts.map((c) => (
                  <div key={c.label} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <dt className="text-muted-foreground">{c.label}</dt>
                    <dd className="text-right font-medium">
                      <MaybePlaceholder text={c.value} />
                    </dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        </div>
      </section>

      {dept.id === "customer-support" ? (
        <>
          <section>
            <SectionTitle hint="Response targets by contract tier">Priority & SLA matrix</SectionTitle>
            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Priority</TableHead>
                    <TableHead className="min-w-[240px]">Description</TableHead>
                    <TableHead>Success</TableHead>
                    <TableHead>Success+</TableHead>
                    <TableHead>Signature</TableHead>
                    <TableHead>Coverage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {SLA_MATRIX.map((row) => (
                    <TableRow key={row.priority} className="hover:bg-accent/50">
                      <TableCell className="font-semibold">
                        <Badge
                          variant={row.priority.startsWith("P1") || row.priority.startsWith("P2") ? "destructive" : "secondary"}
                        >
                          {row.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{row.description}</TableCell>
                      <TableCell className="font-mono text-sm">{row.success}</TableCell>
                      <TableCell className="font-mono text-sm">{row.successPlus}</TableCell>
                      <TableCell className="font-mono text-sm">{row.signature}</TableCell>
                      <TableCell className="text-sm">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            row.coverage.startsWith("24/7")
                              ? "bg-success-soft text-success"
                              : "bg-secondary text-secondary-foreground"
                          }`}
                        >
                          <CircleDot className="size-3" />
                          {row.coverage}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </section>

          <section>
            <SectionTitle>Case status definitions</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {CASE_STATUSES.map((s) => (
                <div key={s.status} className="rounded-lg border border-border bg-surface p-3">
                  <p className="text-sm font-semibold">{s.status}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{s.meaning}</p>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : null}

      <section>
        <SectionTitle hint="Level 1 → Level 2 → Level 3">Escalation path</SectionTitle>
        <EscalationStepper dept={dept} />
      </section>

      <section>
        <SectionTitle>Verification tracker</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {unverified.length ? (
            unverified.map((p) => <PlaceholderPill key={p}>{p}</PlaceholderPill>)
          ) : (
            <p className="text-sm text-muted-foreground">All entries verified.</p>
          )}
        </div>
      </section>

      <Separator />
      <p className="pb-10 text-xs text-muted-foreground">
        Last updated {dept.updated} · Entry owner <MaybePlaceholder text={dept.owner} />
      </p>
    </div>
  );
}

function Header({ dept, unverifiedCount }: { dept: Department; unverifiedCount: number }) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="font-mono text-[10px]">
          {String(dept.num).padStart(2, "0")}
        </Badge>
        {dept.internalOnly ? (
          <Badge variant="destructive" className="text-[10px] uppercase tracking-wide">
            Internal only
          </Badge>
        ) : null}
        {unverifiedCount > 0 ? (
          <Badge className="bg-warning-soft text-warning-foreground text-[10px]">
            {unverifiedCount} unverified
          </Badge>
        ) : null}
      </div>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">{dept.name}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Last updated {dept.updated} · Entry owner <MaybePlaceholder text={dept.owner} />
      </p>
    </div>
  );
}
