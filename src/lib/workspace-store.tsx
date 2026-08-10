import { useCallback, useEffect, useState } from "react";
import { DEPARTMENTS } from "@/data/directory";

export type LinkEntry = {
  id: string;
  name: string;
  deptId: string;
  url: string;
  notes: string;
  by: string;
  date: string;
};

export type FeedbackEntry = {
  id: string;
  name: string;
  topic: string;
  urgency: "Low" | "Medium" | "High";
  notes: string;
  date: string;
};

const LINKS_KEY = "csm-directory-links-v1";
const FEEDBACK_KEY = "csm-directory-feedback-v1";

export const today = () =>
  new Date().toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

/** Links already referenced inside the department dataset (intake portals, forms, aliases). */
export function seedLinks(): LinkEntry[] {
  const out: LinkEntry[] = [];
  for (const d of DEPARTMENTS) {
    for (const c of d.contacts) {
      if (!/https?:\/\/|\.com\//i.test(c.value) || /\[CONFIRM/i.test(c.value)) continue;
      out.push({
        id: `seed-${d.id}-${c.label}`,
        name: `${d.short} — ${c.label}`,
        deptId: d.id,
        url: c.value,
        notes: d.intake.title,
        by: "Directory source",
        date: d.updated,
      });
    }
  }
  return out;
}

function useLocalList<T>(key: string, seed: T[]) {
  const [items, setItems] = useState<T[]>(seed);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) setItems(JSON.parse(raw) as T[]);
    } catch {
      /* ignore */
    }
  }, [key]);

  const save = useCallback(
    (next: T[]) => {
      setItems(next);
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* ignore */
      }
    },
    [key],
  );

  return [items, save] as const;
}

export function useLinkBank() {
  const [links, save] = useLocalList<LinkEntry>(LINKS_KEY, seedLinks());
  return {
    links,
    addLink: (l: Omit<LinkEntry, "id">) =>
      save([{ ...l, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }, ...links]),
    removeLink: (id: string) => save(links.filter((l) => l.id !== id)),
  };
}

export function useFeedback() {
  const [feedback, save] = useLocalList<FeedbackEntry>(FEEDBACK_KEY, []);
  return {
    feedback,
    addFeedback: (f: Omit<FeedbackEntry, "id">) =>
      save([{ ...f, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }, ...feedback]),
    removeFeedback: (id: string) => save(feedback.filter((f) => f.id !== id)),
  };
}
