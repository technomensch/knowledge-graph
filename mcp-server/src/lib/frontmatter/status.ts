export type StatusCategory = "backlog" | "pending" | "started" | "done" | "cancelled";

const TABLE: Record<string, StatusCategory> = {
  proposed: "backlog", draft: "backlog", stub: "backlog", deferred: "backlog",
  open: "pending", tracked: "pending", defined: "pending",
  "tracked-not-implemented": "pending", // documented in commands/kmg-start-issue-tracking.md; alias flagged for review in the plan
  "in-progress": "started", designed: "started", "partially-implemented": "started",
  resolved: "done", implemented: "done", closed: "done", fixed: "done", accepted: "done",
  withdrawn: "cancelled", superseded: "cancelled",
};

export function normalizeStatus(raw: string): string {
  let s = raw.trim().replace(/^["']|["']$/g, "").toLowerCase();
  const paren = s.indexOf(" (");
  if (paren >= 0) s = s.slice(0, paren);
  return s.trim().replace(/\s+/g, "-");
}

/** Unrecognized values map to "pending", never to a terminal category (approved safety rule). */
export function categoryFor(raw: string): { category: StatusCategory; recognized: boolean } {
  const hit = TABLE[normalizeStatus(raw)];
  return hit ? { category: hit, recognized: true } : { category: "pending", recognized: false };
}
