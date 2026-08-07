import { ChevronRight, CircleDot, Lightbulb, TriangleAlert } from "lucide-react";
import type { Department } from "@/data/directory";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

/** Derive expandable context for a trigger from the department's own routing data. */
function triggerDetail(dept: Department, trigger: string) {
  const firstStep = dept.intake.steps?.[0] ?? dept.intake.bullets?.[0] ?? dept.intake.title;
  const edge = dept.outOfScope[0];
  const l1 = dept.escalation[0];
  const keyword = trigger.split(/[(,—-]/)[0]!.trim().toLowerCase();

  return {
    what: `${trigger}. Confirm this is genuinely in ${dept.short}'s scope before routing — if it is closer to "${edge?.need ?? "another team's remit"}", send it to ${edge?.goTo ?? "the owning team"} instead.`,
    edge: dept.criticalRule
      ? dept.criticalRule.title
      : `${dept.short} intake requires context up front: ${firstStep}`,
    example: `A CSM hears: "we need help with ${keyword}." Capture the account, business impact and deadline, then start with: ${firstStep}. First responder is ${l1?.who ?? "the team POC"}.`,
  };
}

export function TriggerAccordion({ dept }: { dept: Department }) {
  return (
    <Accordion type="multiple" className="w-full">
      {dept.triggers.map((t) => {
        const d = triggerDetail(dept, t);
        return (
          <AccordionItem key={t} value={t} className="border-border/70">
            <AccordionTrigger className="gap-2 py-3 text-left text-sm hover:no-underline">
              <span className="flex flex-1 gap-2">
                <ChevronRight className="mt-0.5 size-4 shrink-0 text-success" />
                <span>{t}</span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-3 pl-6 text-sm">
              <div className="flex gap-2">
                <CircleDot className="mt-0.5 size-3.5 shrink-0 text-success" />
                <p className="text-foreground/85">{d.what}</p>
              </div>
              <div className="flex gap-2">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-warning" />
                <p className="text-foreground/85">
                  <span className="font-medium">Edge case: </span>
                  {d.edge}
                </p>
              </div>
              <div className="flex gap-2 rounded-lg bg-secondary/60 p-3">
                <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-primary" />
                <p className="text-foreground/85">
                  <span className="font-medium">Real-world CSM example: </span>
                  {d.example}
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
