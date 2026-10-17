export type RefKind = "issue" | "enh" | "adr";

const pad3 = (n: number): string => String(n).padStart(3, "0");

/** Canonical ID for a plain reference, or null when the value is a wikilink, a path, a full note name or prose. */
export function normalizeId(kind: RefKind, raw: string): string | null {
  const v = raw.trim();
  if (v.startsWith("[[")) return null;
  const bare = /^#?(\d+)$/.exec(v);
  if (kind === "issue") {
    const m = /^issue-(\d+)$/i.exec(v);
    if (m) return `issue-${Number(m[1])}`;
    if (bare) return `issue-${Number(bare[1])}`;
    return null;
  }
  if (kind === "enh") {
    const m = /^ENH-(\d+)$/i.exec(v);
    if (m) return `ENH-${pad3(Number(m[1]))}`;
    if (bare) return `ENH-${pad3(Number(bare[1]))}`;
    return null;
  }
  const m = /^ADR-(\d+)$/i.exec(v);
  if (m) return `ADR-${pad3(Number(m[1]))}`;
  if (bare) return `ADR-${pad3(Number(bare[1]))}`;
  return null;
}
