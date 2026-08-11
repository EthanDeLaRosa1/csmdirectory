import { ExternalLink, Link2 } from "lucide-react";
import type { Department } from "@/data/directory";
import { deptTheme } from "@/data/dept-theme";
import { CopyButton } from "@/components/directory/copy-button";
import { useLinkBank } from "@/lib/workspace-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Department-scoped "Quick Links & Key Resources" box.
 * Merges the dataset's own resources with anything submitted to the central Link Bank
 * for this department, so submissions appear in both places.
 */
export function QuickLinks({ dept }: { dept: Department }) {
  const { links } = useLinkBank();
  const theme = deptTheme(dept.id);

  const submitted = links
    .filter((l) => l.deptId === dept.id && !l.id.startsWith("seed-ql-"))
    .map((l) => ({ name: l.name, description: l.notes, url: l.url, submitted: true }));

  const all = [
    ...dept.quickLinks.map((l) => ({ ...l, submitted: false })),
    ...submitted,
  ].filter((l, i, arr) => arr.findIndex((x) => x.url === l.url) === i);

  return (
    <Card className={`${theme.ring} ${theme.soft}`}>
      <CardContent className="space-y-3 pt-5">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Link2 className="size-4 text-primary" /> Quick links &amp; key resources
        </p>
        {all.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No links yet — add one from the Centralized Link Bank tab.
          </p>
        ) : (
          <ul className="space-y-3">
            {all.map((l) => (
              <li
                key={l.url}
                className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border/70 bg-background/60 p-3"
              >
                <div className="min-w-[200px] flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    {l.name}
                    {l.submitted ? (
                      <Badge variant="outline" className="text-[9px] uppercase">
                        CSM submitted
                      </Badge>
                    ) : null}
                  </p>
                  {l.description ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">{l.description}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-1.5">
                  <Button asChild size="sm" variant="outline">
                    <a href={l.url} target="_blank" rel="noreferrer noopener">
                      Open link <ExternalLink className="size-3" />
                    </a>
                  </Button>
                  <CopyButton value={l.url} label={l.name} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
