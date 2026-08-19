import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import {
  readConfig,
  writeConfig,
  getPluginRoot,
  CONFIG_PATH,
  mintGraphId,
  writeGraphIdMarker,
  readGraphIdMarker,
  checkGraphPathHealth,
  GraphConfig,
  PathHealth,
} from "../utils.js";
import { resolveGraph, resolvePersonalGraph, PersonalScopeSession, confirmPersonalScopeAccess } from "../resolution.js";
import {
  resolveInteractionMode,
  STUB_ASK_TIMEOUT_MS,
  stubAsk,
  gate,
  requireInput,
  InteractionMode,
  InputRequiredError,
} from "../interaction.js";
import { resolveEffectiveCwd } from "../platform-cwd.js";
import { handleVersion } from "./version.js";

// ── Types ────────────────────────────────────────────────────────────────────

interface UpgradeItem {
  category: string;
  description: string;
  details?: string;
}

interface WarningItem {
  category: string;
  description: string;
  flaggedLines?: string[];
}

interface InspectResult {
  upgrades: UpgradeItem[];
  warnings: WarningItem[];
}

const APPLY_ORDER = [
  "status-schema",      // ADR-067 Task 8.1: reconcile old .active/legacy schema before anything else touches the registry
  "config-location",   // must run before anything else reads config from the new path
  "directories",
  "config",
  "starter-relocation",   // must run BEFORE templates
  "templates",
  "stray-knowledge-dir",
  "capture-corruption",   // issue-46 backfix: content repair, order-independent of the others
  "platform-split",
];

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parse YAML frontmatter from a file and return key-value pairs.
 * Only reads the first 30 lines to keep it cheap.
 */
function parseFrontmatter(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};
  const lines = fs.readFileSync(filePath, "utf-8").split("\n");
  const result: Record<string, string> = {};
  if (lines[0]?.trim() !== "---") return result;
  for (let i = 1; i < Math.min(lines.length, 30); i++) {
    const line = lines[i];
    if (line.trim() === "---") break;
    const match = line.match(/^(\w[\w-]*):\s*(.*)$/);
    if (match) {
      result[match[1]] = match[2].trim();
    }
  }
  return result;
}

// issue-46 backfix: existing users' knowledge/ may already contain files
// corrupted by the filename-double-prepend / frontmatter-double-embed bugs
// (fixed going forward in capture.ts and the agent templates, but already-
// written files stay broken until migrated). This section detects and
// repairs both signatures. Conservative by design (ADR-063/ADR-040 precedent
// in this file, see applyStrayKnowledgeDir above): only merges frontmatter
// blocks when there is no field disagreement between them; a real conflict
// (same key, different value) is reported for manual review, never guessed.

interface RawFrontmatterBlock {
  /** 0-indexed line of the opening `---` */
  startLine: number;
  /** 0-indexed line of the closing `---` */
  endLine: number;
  /** top-level key -> its raw source lines (key line + any indented continuation lines) */
  fields: Map<string, string[]>;
  /** insertion order of keys, for stable output */
  order: string[];
  /**
   * True iff every non-blank line in the block is a `key:` line or an
   * indented continuation of one — i.e. the block plausibly IS frontmatter,
   * not prose that merely happens to contain a colon-prefixed line (e.g. a
   * "Note: ..." or "TODO: ..." line at column 0). Fable review (2026-08-18)
   * found `order.length > 0` alone still false-positives on exactly this
   * shape: a single stray `key:`-looking prose line among otherwise
   * non-matching lines was enough to pass the old guard.
   */
  looksLikeYaml: boolean;
}

function parseFrontmatterBlockRaw(lines: string[], startIdx: number): RawFrontmatterBlock | null {
  if (lines[startIdx]?.trim() !== "---") return null;
  let end = -1;
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") { end = i; break; }
  }
  if (end === -1) return null;
  const fields = new Map<string, string[]>();
  const order: string[] = [];
  let currentKey: string | null = null;
  let looksLikeYaml = true;
  for (let i = startIdx + 1; i < end; i++) {
    const line = lines[i];
    const topMatch = line.match(/^([A-Za-z_][\w-]*):(.*)$/);
    if (topMatch) {
      currentKey = topMatch[1];
      fields.set(currentKey, [line]);
      order.push(currentKey);
    } else if (currentKey && /^\s/.test(line)) {
      fields.get(currentKey)!.push(line);
    } else if (line.trim() !== "") {
      // A non-blank line that's neither a `key:` nor an indented
      // continuation of one — real frontmatter never contains this; it's
      // prose. Once seen, this block can never look like YAML, even if a
      // later line happens to also match the key: pattern.
      currentKey = null;
      looksLikeYaml = false;
    } else {
      currentKey = null; // a blank line ends continuation eligibility
    }
  }
  return { startLine: startIdx, endLine: end, fields, order, looksLikeYaml };
}

/**
 * True only when the line immediately after block1's closing `---` is
 * itself a bare `---` (the doubled-frontmatter signature) AND the region
 * between that opening line and the next `---` actually parses as YAML in
 * full — every non-blank line is a `key:` field or an indented
 * continuation, not just "at least one" (see `looksLikeYaml`). A single
 * frontmatter block followed by a `---` used as a body horizontal rule
 * (e.g. a session snapshot that opens its body with a divider before a
 * "## Section" heading, possibly containing a "Note: ..."-shaped prose
 * line) has the same zero-gap shape but isn't real YAML — that's prose,
 * not a second frontmatter block, and must never be treated as one
 * (confirmed live data-loss bug, issue-46 backfix hardening: see
 * knowledge/sessions/2026-05/2026-05-25-*.md for a real-world example of
 * this exact shape).
 */
function detectDoubledFrontmatter(lines: string[]): { block1: RawFrontmatterBlock; block2: RawFrontmatterBlock } | null {
  const block1 = parseFrontmatterBlockRaw(lines, 0);
  if (!block1) return null;
  const block2 = parseFrontmatterBlockRaw(lines, block1.endLine + 1);
  if (!block2) return null;
  if (block2.order.length === 0 || !block2.looksLikeYaml) return null;
  return { block1, block2 };
}

/**
 * Union-merge two frontmatter blocks. Matching keys with identical raw text
 * are deduped; matching keys with different raw text are a genuine
 * disagreement (e.g. two different `status:` or `date:` values) and abort
 * the merge for this file rather than silently picking one — same
 * never-guess-on-real-conflict rule as applyStrayKnowledgeDir.
 */
function mergeFrontmatterBlocks(
  block1: RawFrontmatterBlock,
  block2: RawFrontmatterBlock
): { mergedLines: string[] } | { conflicts: string[] } {
  const conflicts: string[] = [];
  const fields = new Map<string, string[]>();
  const order: string[] = [];
  for (const key of block1.order) {
    fields.set(key, block1.fields.get(key)!);
    order.push(key);
  }
  for (const key of block2.order) {
    const incoming = block2.fields.get(key)!;
    if (fields.has(key)) {
      const existing = fields.get(key)!.join("\n");
      if (existing !== incoming.join("\n")) conflicts.push(key);
      continue;
    }
    fields.set(key, incoming);
    order.push(key);
  }
  if (conflicts.length > 0) return { conflicts };
  const out: string[] = ["---"];
  for (const key of order) out.push(...fields.get(key)!);
  out.push("---");
  return { mergedLines: out };
}

/** Exact-duplicate date prefix only, e.g. `2026-08-06-2026-08-06-main.md` ->
 *  `2026-08-06-main.md`. A near-duplicate (midnight rollover, e.g.
 *  `2026-07-12-2026-07-11-main.md`) is a different date, not a clean strip —
 *  those are reported for manual review rather than guessed at. */
const DOUBLED_DATE_FILENAME = /^(\d{4}-\d{2}-\d{2})-\1-(.+\.md)$/;
/** Looser signature (any two adjacent YYYY-MM-DD segments) used only to
 *  surface a manual-review note for the rollover case above — never renamed
 *  automatically. */
const NEAR_DOUBLED_DATE_FILENAME = /^(\d{4}-\d{2}-\d{2})-(\d{4}-\d{2}-\d{2})-(.+\.md)$/;
/** Same doubling, ADR side: `ADR-046-adr-046-{slug}.md` -> `ADR-046-{slug}.md`.
 *  `\2` requires the second ADR number to exactly match the first — without
 *  it, a file legitimately referencing a *different* ADR in its slug (e.g.
 *  `ADR-050-adr-046-followup-fix.md`) would be wrongly treated as doubled
 *  and stripped of that reference. */
const DOUBLED_ADR_FILENAME = /^(ADR-(\d+))-adr-\2-(.+\.md)$/i;

/** De-doubles a filename via whichever pattern matches, or null if neither does. */
function deDoubledFilename(entry: string): string | null {
  const dateMatch = entry.match(DOUBLED_DATE_FILENAME);
  if (dateMatch) return `${dateMatch[1]}-${dateMatch[2]}`;
  const adrMatch = entry.match(DOUBLED_ADR_FILENAME);
  if (adrMatch) return `${adrMatch[1]}-${adrMatch[3]}`;
  return null;
}

function captureCorruptionDirs(kgPath: string): string[] {
  const dirs: string[] = [];
  const sessionsRoot = path.join(kgPath, "sessions");
  if (fs.existsSync(sessionsRoot)) {
    for (const ym of fs.readdirSync(sessionsRoot)) {
      const full = path.join(sessionsRoot, ym);
      if (fs.statSync(full).isDirectory()) dirs.push(full);
    }
  }
  const decisionsRoot = path.join(kgPath, "decisions");
  if (fs.existsSync(decisionsRoot)) dirs.push(decisionsRoot);
  const lessonsRoot = path.join(kgPath, "lessons-learned");
  if (fs.existsSync(lessonsRoot)) {
    for (const cat of fs.readdirSync(lessonsRoot)) {
      const full = path.join(lessonsRoot, cat);
      if (fs.statSync(full).isDirectory()) dirs.push(full);
    }
  }
  return dirs;
}

/**
 * Check g — issue-46 backfix. Scans sessions/decisions/lessons-learned for
 * files already corrupted by the filename-double-prepend and
 * frontmatter-double-embed bugs (fixed prospectively elsewhere; this is the
 * retroactive repair for files written before the fix).
 */
function checkCaptureCorruption(kgPath: string): UpgradeItem[] {
  let doubledFrontmatter = 0;
  let doubledFilenames = 0;
  let nearDoubledFilenames = 0;

  for (const dir of captureCorruptionDirs(kgPath)) {
    for (const entry of fs.readdirSync(dir)) {
      if (!entry.endsWith(".md")) continue;
      if (deDoubledFilename(entry)) doubledFilenames++;
      else if (NEAR_DOUBLED_DATE_FILENAME.test(entry)) nearDoubledFilenames++;
      const full = path.join(dir, entry);
      if (!fs.statSync(full).isFile()) continue;
      const lines = fs.readFileSync(full, "utf-8").split("\n");
      if (detectDoubledFrontmatter(lines)) doubledFrontmatter++;
    }
  }

  // Stale README index links: a link may reference a doubled filename that
  // no longer exists on disk (already renamed by hand, or by a prior
  // capture-corruption apply run) — this is the exact gap found in this
  // repo's own decisions/README.md for ADR-046. Only counts as a finding
  // when the de-doubled candidate actually exists (see applyCaptureCorruption
  // pass 3); otherwise there's nothing this migration could safely do.
  let staleReadmeLinks = 0;
  for (const readmeRelPath of ["sessions/README.md", "decisions/README.md", "lessons-learned/README.md"]) {
    const readmePath = path.join(kgPath, readmeRelPath);
    if (!fs.existsSync(readmePath)) continue;
    const content = fs.readFileSync(readmePath, "utf-8");
    for (const m of content.matchAll(/\]\(([^)]+\.md)\)/g)) {
      const linkTarget = m[1];
      const base = path.basename(linkTarget);
      const target = deDoubledFilename(base);
      if (!target) continue;
      const dedoubledLink = linkTarget.slice(0, linkTarget.length - base.length) + target;
      if (fs.existsSync(path.join(path.dirname(readmePath), dedoubledLink))) staleReadmeLinks++;
    }
  }

  if (doubledFrontmatter === 0 && doubledFilenames === 0 && nearDoubledFilenames === 0 && staleReadmeLinks === 0) return [];

  const parts: string[] = [];
  if (doubledFrontmatter > 0) parts.push(`${doubledFrontmatter} file(s) with a duplicated frontmatter block`);
  if (doubledFilenames > 0) parts.push(`${doubledFilenames} file(s) with an exact doubled date/ADR-number filename prefix`);
  if (nearDoubledFilenames > 0) parts.push(`${nearDoubledFilenames} file(s) with a near-doubled filename (different adjacent dates — needs manual review, not auto-renamed)`);
  if (staleReadmeLinks > 0) parts.push(`${staleReadmeLinks} README index link(s) pointing at a doubled filename`);

  return [{
    category: "capture-corruption",
    description: `issue-46: ${parts.join("; ")}`,
    details:
      `These were written before the capture.ts filename/frontmatter-ownership fix (issue-46) and stay ` +
      `corrupted until repaired. Run with apply: ["capture-corruption"], confirmBackfix: true to fix the ` +
      `unambiguous cases automatically (exact-duplicate filenames stripped; frontmatter blocks merged only ` +
      `when the two blocks don't disagree on any field). Anything ambiguous (a real field conflict, or a ` +
      `near-doubled filename from a midnight rollover) is reported, never guessed at — you'll get a list to ` +
      `resolve by hand.`,
  }];
}

/**
 * Apply g — issue-46 backfix. Conservative by construction: exact-duplicate
 * filenames are stripped (skipped with a report if the target name is
 * somehow already taken); frontmatter blocks are merged only when clean
 * (no key disagreement). Anything else is reported, not guessed.
 */
function applyCaptureCorruption(kgPath: string): string {
  let mergedCount = 0;
  let renamedCount = 0;
  const reviewNeeded: string[] = [];

  // Pass 1: frontmatter merges (in place, same filename)
  for (const dir of captureCorruptionDirs(kgPath)) {
    for (const entry of fs.readdirSync(dir)) {
      if (!entry.endsWith(".md")) continue;
      const full = path.join(dir, entry);
      if (!fs.statSync(full).isFile()) continue;
      const raw = fs.readFileSync(full, "utf-8");
      const lines = raw.split("\n");
      const doubled = detectDoubledFrontmatter(lines);
      if (!doubled) continue;
      const result = mergeFrontmatterBlocks(doubled.block1, doubled.block2);
      if ("conflicts" in result) {
        reviewNeeded.push(`${path.relative(kgPath, full)}: frontmatter fields disagree (${result.conflicts.join(", ")}) — not auto-merged`);
        continue;
      }
      const rest = lines.slice(doubled.block2.endLine + 1);
      const newContent = [...result.mergedLines, ...rest].join("\n");
      fs.writeFileSync(`${full}.bak`, raw, "utf-8");
      fs.writeFileSync(full, newContent, "utf-8");
      mergedCount++;
    }
  }

  // Pass 2: exact-duplicate filename renames (separate pass so a file
  // needing both operations gets its content fixed before its path moves).
  // Covers both the session/date pattern and the ADR-number pattern.
  for (const dir of captureCorruptionDirs(kgPath)) {
    for (const entry of fs.readdirSync(dir)) {
      if (!entry.endsWith(".md")) continue;
      const target = deDoubledFilename(entry);
      if (!target) {
        if (NEAR_DOUBLED_DATE_FILENAME.test(entry)) {
          reviewNeeded.push(`${path.relative(kgPath, path.join(dir, entry))}: near-doubled filename (different adjacent dates, likely a midnight rollover) — not auto-renamed, resolve manually`);
        }
        continue;
      }
      const targetFull = path.join(dir, target);
      const srcFull = path.join(dir, entry);
      if (fs.existsSync(targetFull)) {
        reviewNeeded.push(`${path.relative(kgPath, srcFull)}: target filename ${target} already exists — not auto-renamed`);
        continue;
      }
      fs.renameSync(srcFull, targetFull);
      renamedCount++;
    }
  }

  // Pass 3: fix README index links pointing at a doubled filename — whether
  // that file was just renamed above, or was already renamed by hand
  // earlier (leaving only the index stale, the exact case found in this
  // repo's own decisions/README.md for ADR-046). A link is only rewritten
  // when the de-doubled target actually exists on disk; otherwise it's
  // reported, never guessed at.
  let readmeLinksFixed = 0;
  for (const readmeRelPath of ["sessions/README.md", "decisions/README.md", "lessons-learned/README.md"]) {
    const readmePath = path.join(kgPath, readmeRelPath);
    if (!fs.existsSync(readmePath)) continue;
    let content = fs.readFileSync(readmePath, "utf-8");
    let changed = false;
    content = content.replace(/\]\(([^)]+\.md)\)/g, (whole, linkTarget: string) => {
      const base = path.basename(linkTarget);
      const target = deDoubledFilename(base);
      if (!target) return whole;
      const dedoubledLink = linkTarget.slice(0, linkTarget.length - base.length) + target;
      const candidateFull = path.join(path.dirname(readmePath), dedoubledLink);
      if (!fs.existsSync(candidateFull)) {
        reviewNeeded.push(`${readmeRelPath}: link to ${linkTarget} looks doubled but ${dedoubledLink} doesn't exist — not auto-fixed`);
        return whole;
      }
      changed = true;
      readmeLinksFixed++;
      return `](${dedoubledLink})`;
    });
    if (changed) fs.writeFileSync(readmePath, content, "utf-8");
  }

  const parts = [
    `${mergedCount} frontmatter block(s) merged` + (mergedCount > 0 ? " (.bak backup written for each)" : ""),
    `${renamedCount} filename(s) de-duplicated`,
    `${readmeLinksFixed} README link(s) repointed`,
  ];
  if (reviewNeeded.length > 0) {
    parts.push(`${reviewNeeded.length} item(s) need manual review:\n  - ${reviewNeeded.join("\n  - ")}`);
  }
  return parts.join("; ");
}

/**
 * Check a — verify required KG subdirectories exist.
 */
function checkDirectories(kgPath: string): UpgradeItem[] {
  const required = [
    "templates",        // was "knowledge" — project/knowledge/knowledge/ is nonsensical
    "lessons-learned",
    "decisions",
    "sessions",
    "chat-history",
    "tmp",
  ];
  const missing = required.filter((d) => !fs.existsSync(path.join(kgPath, d)));
  if (missing.length === 0) return [];
  return [
    {
      category: "directories",
      description: `Missing directories: ${missing.join(", ")}`,
      details: `Run with apply: ["directories"] to create them under ${kgPath}`,
    },
  ];
}

/**
 * Check b — verify required config fields are present for the active graph.
 */
function checkConfig(kgPath: string, graphName: string): UpgradeItem[] {
  const config = readConfig();
  if (!config.graphs[graphName]) return [];
  const graph = config.graphs[graphName] as unknown as Record<string, unknown>;

  const requiredFields: Array<{ field: string; defaultValue: unknown }> = [
    { field: "platforms", defaultValue: [] },
    { field: "notification", defaultValue: "none" },
    { field: "type", defaultValue: "project-local" },
  ];

  const missing = requiredFields.filter(({ field }) => graph[field] === undefined);
  if (missing.length === 0) return [];

  return [
    {
      category: "config",
      description: `Config missing fields: ${missing.map((f) => f.field).join(", ")}`,
      details: missing
        .map((f) => `  ${f.field}: ${JSON.stringify(f.defaultValue)}`)
        .join("\n"),
    },
  ];
}

/**
 * Check c — compare core/default-templates files against deployed KG files.
 * Returns items for files that differ or are missing.
 */
function checkTemplates(kgPath: string): UpgradeItem[] {
  const pluginRoot = getPluginRoot();
  const templateRoot = path.join(pluginRoot, "core", "default-templates");
  if (!fs.existsSync(templateRoot)) return [];

  const results: UpgradeItem[] = [];

  // Subdirectory mappings: template subdir → kg subdir
  const mappings: Array<{ templateSub: string; kgSub: string; files: string[] }> = [
    // Index files — stay in concepts/
    {
      templateSub: "concepts",
      kgSub: "concepts",
      files: ["entry-template.md", "kg-category-index.md"],
    },
    // Content templates — go to templates/ (was missing entirely)
    {
      templateSub: "concepts/templates",
      kgSub: "templates",
      files: ["architecture.md", "concepts.md", "gotchas.md", "patterns.md", "workflows.md"],
    },
    // entry-template.md also deployed to templates/ as starter reference (ENH-022)
    {
      templateSub: "concepts",
      kgSub: "templates",
      files: ["entry-template.md"],
    },
    // READMEs stay in live dirs
    {
      templateSub: "lessons-learned",
      kgSub: "lessons-learned",
      files: ["README.md"],
    },
    {
      templateSub: "decisions",
      kgSub: "decisions",
      files: ["README.md"],
    },
    // Starters go to templates/ (not live dirs)
    {
      templateSub: "lessons-learned",
      kgSub: "templates",
      files: ["lesson-template.md"],
    },
    {
      templateSub: "decisions",
      kgSub: "templates",
      files: ["ADR-template.md"],
    },
    {
      templateSub: "sessions",
      kgSub: "templates",
      files: ["session-template.md"],
    },
  ];

  for (const { templateSub, kgSub, files } of mappings) {
    for (const file of files) {
      const srcPath = path.join(templateRoot, templateSub, file);
      const destPath = path.join(kgPath, kgSub, file);
      if (!fs.existsSync(srcPath)) continue;

      if (!fs.existsSync(destPath)) {
        results.push({
          category: "templates",
          description: `Missing template file: ${kgSub}/${file}`,
          details: `Source exists at ${srcPath}; deploy with apply: ["templates"]`,
        });
        continue;
      }

      const srcContent = fs.readFileSync(srcPath, "utf-8");
      const destContent = fs.readFileSync(destPath, "utf-8");
      if (srcContent !== destContent) {
        // Provide a brief before/after snippet (first differing line)
        const srcLines = srcContent.split("\n");
        const destLines = destContent.split("\n");
        let diffLine = -1;
        for (let i = 0; i < Math.max(srcLines.length, destLines.length); i++) {
          if (srcLines[i] !== destLines[i]) { diffLine = i; break; }
        }
        const snippet =
          diffLine >= 0
            ? `First diff at line ${diffLine + 1}: template="${(srcLines[diffLine] ?? "").substring(0, 60)}" vs deployed="${(destLines[diffLine] ?? "").substring(0, 60)}"`
            : "Files differ (whitespace/encoding)";
        results.push({
          category: "templates",
          description: `Outdated template: ${kgSub}/${file}`,
          details: snippet,
        });
      }
    }
  }

  return results;
}

/**
 * Check d — platform-split contamination check.
 * Returns a WarningItem if rules.md contains platform-specific directives
 * and kmgraph_schema < 2.
 */
function checkPlatformSplit(kgPath: string): WarningItem | null {
  const rulesPath = path.join(kgPath, "knowledge", "rules.md");
  if (!fs.existsSync(rulesPath)) return null;

  const fm = parseFrontmatter(rulesPath);
  const schemaVersion = parseInt(fm["kmgraph_schema"] ?? "0", 10);
  if (schemaVersion >= 2) return null; // Already migrated — skip

  const content = fs.readFileSync(rulesPath, "utf-8");
  const lines = content.split("\n");

  const CONTAMINATION_PATTERN =
    /(use|prefer|avoid|never use|always use|do not use|switch to|stop using).{0,80}(\bGlob\b|\bGrep\b|context-mode|\bsubagent\b|\.jsonl)|(\bGlob\b|\bGrep\b|context-mode|\bsubagent\b|\.jsonl).{0,80}(use|prefer|avoid|instead|only|never)/i;

  const flagged: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (CONTAMINATION_PATTERN.test(lines[i])) {
      flagged.push(`line ${i + 1}: ${lines[i].substring(0, 120)}`);
    }
  }

  if (flagged.length === 0) return null;

  return {
    category: "platform-split",
    description:
      "rules.md contains platform-specific tool directives that should be migrated to CLAUDE.md",
    flaggedLines: flagged,
  };
}

// ── Apply helpers ────────────────────────────────────────────────────────────

function applyDirectories(kgPath: string): string {
  const required = [
    "templates",        // was "knowledge" — project/knowledge/knowledge/ is nonsensical
    "lessons-learned",
    "decisions",
    "sessions",
    "chat-history",
    "tmp",
  ];
  const created: string[] = [];
  for (const d of required) {
    const full = path.join(kgPath, d);
    if (!fs.existsSync(full)) {
      fs.mkdirSync(full, { recursive: true });
      created.push(d);
    }
  }
  return created.length > 0
    ? `Created directories: ${created.join(", ")}`
    : "All directories already exist";
}

function applyConfig(graphName: string): string {
  const config = readConfig();
  if (!config.graphs[graphName]) {
    return "No graph to update config for";
  }
  const graph = config.graphs[graphName] as unknown as Record<string, unknown>;
  const defaults: Record<string, unknown> = {
    platforms: [],
    notification: "none",
    type: "project-local",
  };
  const added: string[] = [];
  for (const [field, defaultValue] of Object.entries(defaults)) {
    if (graph[field] === undefined) {
      graph[field] = defaultValue;
      added.push(field);
    }
  }
  if (added.length > 0) {
    writeConfig(config);
  }
  return added.length > 0
    ? `Added missing config fields: ${added.join(", ")}`
    : "Config already up to date";
}

function applyTemplates(kgPath: string): string {
  const pluginRoot = getPluginRoot();
  const templateRoot = path.join(pluginRoot, "core", "default-templates");
  if (!fs.existsSync(templateRoot)) return "Template root not found; skipped";

  const mappings: Array<{ templateSub: string; kgSub: string; files: string[] }> = [
    // Index files — stay in concepts/
    {
      templateSub: "concepts",
      kgSub: "concepts",
      files: ["entry-template.md", "kg-category-index.md"],
    },
    // Content templates — go to templates/ (was missing entirely)
    {
      templateSub: "concepts/templates",
      kgSub: "templates",
      files: ["architecture.md", "concepts.md", "gotchas.md", "patterns.md", "workflows.md"],
    },
    // entry-template.md also deployed to templates/ as starter reference (ENH-022)
    {
      templateSub: "concepts",
      kgSub: "templates",
      files: ["entry-template.md"],
    },
    // READMEs stay in live dirs
    {
      templateSub: "lessons-learned",
      kgSub: "lessons-learned",
      files: ["README.md"],
    },
    {
      templateSub: "decisions",
      kgSub: "decisions",
      files: ["README.md"],
    },
    // Starters go to templates/ (not live dirs)
    {
      templateSub: "lessons-learned",
      kgSub: "templates",
      files: ["lesson-template.md"],
    },
    {
      templateSub: "decisions",
      kgSub: "templates",
      files: ["ADR-template.md"],
    },
    {
      templateSub: "sessions",
      kgSub: "templates",
      files: ["session-template.md"],
    },
  ];

  const copied: string[] = [];
  const skipped: string[] = [];
  for (const { templateSub, kgSub, files } of mappings) {
    for (const file of files) {
      const src = path.join(templateRoot, templateSub, file);
      const dest = path.join(kgPath, kgSub, file);
      if (fs.existsSync(src)) {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        if (fs.existsSync(dest)) {
          const normalize = (s: string) => s.replace(/\r\n/g, "\n");
          const srcContent = normalize(fs.readFileSync(src, "utf-8"));
          const destContent = normalize(fs.readFileSync(dest, "utf-8"));
          if (srcContent !== destContent) {
            skipped.push(`${kgSub}/${file} (user content detected — manual review required)`);
            continue;
          }
          // Identical: already up to date, skip silently
          continue;
        }
        fs.copyFileSync(src, dest);
        copied.push(`${kgSub}/${file}`);
      }
    }
  }
  const parts: string[] = [];
  if (copied.length > 0) parts.push(`Deployed: ${copied.join(", ")}`);
  if (skipped.length > 0) parts.push(`Skipped (user content): ${skipped.join(", ")}`);
  return parts.length > 0 ? parts.join(" | ") : "No templates to deploy";
}

function checkStarterRelocation(kgPath: string): UpgradeItem[] {
  const starters = [
    { dir: "decisions", file: "ADR-template.md" },
    { dir: "lessons-learned", file: "lesson-template.md" },
    { dir: "sessions", file: "session-template.md" },
  ];
  const found = starters.filter(({ dir, file }) =>
    fs.existsSync(path.join(kgPath, dir, file))
  );
  if (found.length === 0) return [];
  return [{
    category: "starter-relocation",
    description: `${found.length} starter file(s) in live dirs should move to templates/`,
    details: found.map(({ dir, file }) => `  ${dir}/${file} → templates/${file}`).join("\n"),
  }];
}

function applyStarterRelocation(kgPath: string): string {
  const starters = [
    { dir: "decisions", file: "ADR-template.md" },
    { dir: "lessons-learned", file: "lesson-template.md" },
    { dir: "sessions", file: "session-template.md" },
  ];
  fs.mkdirSync(path.join(kgPath, "templates"), { recursive: true });
  const moved: string[] = [];
  const skipped: string[] = [];
  for (const { dir, file } of starters) {
    const src = path.join(kgPath, dir, file);
    const dest = path.join(kgPath, "templates", file);
    if (!fs.existsSync(src)) continue;
    // ADR-040: never silently overwrite user-modified files
    if (fs.existsSync(dest)) {
      const srcContent = fs.readFileSync(src, "utf-8");
      const destContent = fs.readFileSync(dest, "utf-8");
      if (srcContent !== destContent) {
        skipped.push(`${dir}/${file} (already exists in templates/ with different content — manual review required)`);
        continue;
      }
      // Identical content: remove live-dir copy, dest already correct
      fs.unlinkSync(src);
      moved.push(`${dir}/${file} (duplicate removed)`);
      continue;
    }
    fs.copyFileSync(src, dest);
    fs.unlinkSync(src);
    moved.push(`${dir}/${file} → templates/${file}`);
  }
  const parts: string[] = [];
  if (moved.length > 0) parts.push(`Relocated: ${moved.join(", ")}`);
  if (skipped.length > 0) parts.push(`Skipped: ${skipped.join(", ")}`);
  return parts.join(". ") || "No starters to relocate";
}

function checkStrayKnowledgeDir(kgPath: string, kgType: string | undefined): UpgradeItem[] {
  if (kgType !== "project-local") return [];
  const strayDir = path.join(kgPath, "knowledge");
  if (!fs.existsSync(strayDir)) return [];
  return [{
    category: "stray-knowledge-dir",
    description: "knowledge/ subdirectory exists inside kgPath (nonsensical nesting from pre-v0.5.0 init)",
    details:
      `Found an old leftover folder: ${strayDir}\n\n` +
      `This is a small mix-up from how this knowledge graph was originally set up — a few starter files ` +
      `(patterns, gotchas, etc.) ended up nested one folder too deep instead of living in concepts/ where ` +
      `they belong.\n\n` +
      `Fixing this is safe: any file that's identical in both places just gets tidied up automatically. ` +
      `If a file is genuinely different in both places, nothing gets touched — you'll see exactly which ` +
      `files differ so you can look at them yourself and decide what to keep. Nothing is ever deleted or ` +
      `overwritten without you saying so.`,
  }];
}

/**
 * Check e — flag a kg-config.json still at the legacy ~/.claude/ location
 * when the platform-neutral ~/.kmgraph/ location hasn't been migrated to yet.
 * Skipped entirely when KG_CONFIG_PATH env var is set (explicit override in play).
 *
 * Final review finding I-1 (2026-08-02): as of ADR-067 Task 2.2, `readConfig()`
 * write-forwards the legacy file's content to `newPath` on its very first call
 * in any process. By the time `handleUpgrade()` reaches this function it has
 * already called `readConfig()` once, so `fs.existsSync(newPath)` below is true
 * on essentially every real invocation -- this category is effectively dead by
 * construction. Task 8.1 must NOT key its legacy detection off "new path
 * missing"; it must key off "does the legacy file still exist on disk"
 * (`fs.existsSync(oldPath)` alone), since that's the only thing Task 2.2 leaves
 * unresolved -- the content copy, not the leftover file.
 */
function checkConfigLocation(): UpgradeItem[] {
  if (process.env.KG_CONFIG_PATH) return [];
  const homeDir = process.env.HOME || os.homedir();
  const oldPath = path.join(homeDir, ".claude", "kg-config.json");
  const newPath = path.join(homeDir, ".kmgraph", "kg-config.json");
  if (!fs.existsSync(oldPath) || fs.existsSync(newPath)) return [];
  return [
    {
      category: "config-location",
      description: `kg-config.json still at legacy path: ${oldPath}`,
      details: `Run with apply: ["config-location"] to copy it to the platform-neutral location: ${newPath}. Old file is left in place.`,
    },
  ];
}

/**
 * Check f — ADR-067 Task 8.1: detect a registry still shaped with the
 * pre-ADR-067 schema (top-level `active` key, and/or graph entries missing
 * status/statusChangedAt/graphId), and/or a leftover legacy
 * ~/.claude/kg-config.json file still physically present on disk.
 *
 * Task 2.2 already write-forwards the legacy file's *content* into the
 * primary path on first read, so this is not a "which file is authoritative"
 * question -- it's "the shape of what's already been read" plus "the
 * physical leftover file's continued existence" (findings doc #5, final
 * review finding I-1).
 *
 * Final review finding 2 (Phase 8 final review): matches
 * checkConfigLocation()/applyConfigLocation() -- when KG_CONFIG_PATH is set,
 * readConfig() (utils.ts) deliberately does NOT write-forward legacy content
 * into the overridden path, so the legacy file at ~/.claude/kg-config.json
 * has nothing to do with that active config. Detecting/backing up/deleting
 * it here would be acting on a file that was never actually migrated into
 * the config in play. Skip legacy-file handling entirely in that case; the
 * schema-shape check for the (overridden-path) config itself still runs.
 */
function checkStatusSchema(): UpgradeItem[] {
  const config = readConfig();
  const rawConfig = config as unknown as Record<string, unknown>;
  const hasTopLevelActive = rawConfig.active !== undefined;

  const graphsNeedingMigration = Object.entries(config.graphs)
    .filter(([, g]) => {
      const graph = g as unknown as Record<string, unknown>;
      return graph.status === undefined || graph.statusChangedAt === undefined || graph.graphId === undefined;
    })
    .map(([name]) => name);

  const homeDir = process.env.HOME || os.homedir();
  const legacyPath = path.join(homeDir, ".claude", "kg-config.json");
  const legacyFileExists = !process.env.KG_CONFIG_PATH && fs.existsSync(legacyPath);

  if (!hasTopLevelActive && graphsNeedingMigration.length === 0 && !legacyFileExists) return [];

  const reasons: string[] = [];
  if (hasTopLevelActive) reasons.push("top-level 'active' key still present");
  if (graphsNeedingMigration.length > 0) {
    reasons.push(`${graphsNeedingMigration.length} graph(s) missing status/statusChangedAt/graphId: ${graphsNeedingMigration.join(", ")}`);
  }
  if (legacyFileExists) reasons.push(`legacy config file still exists at ${legacyPath}`);

  return [
    {
      category: "status-schema",
      description: `ADR-067 schema migration needed: ${reasons.join("; ")}`,
      details:
        `Run with apply: ["status-schema"] and confirmMigration: true (interactive callers will instead ` +
        `be asked to confirm) to migrate every graph to the status/graphId schema and remove the legacy ` +
        `config file. A backup of both files is written to ${path.join(path.dirname(CONFIG_PATH), "backups")} ` +
        `before any change, regardless of whether migration is ultimately confirmed.`,
    },
  ];
}

/**
 * ADR-063 pattern (see performRegistryMerge/backupConfigFromDisk in
 * tools/config.ts): backs up the real on-disk bytes of both the primary
 * config and the legacy config (if present) before any destructive step.
 * Unconditional -- runs before the consent gate below, not after.
 */
function backupStatusSchemaFiles(): { configBackupPath: string; legacyBackupPath?: string } {
  const backupDir = path.join(path.dirname(CONFIG_PATH), "backups");
  fs.mkdirSync(backupDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");

  const configBackupPath = path.join(backupDir, `kg-config-${ts}.json`);
  const onDiskBytes = fs.existsSync(CONFIG_PATH)
    ? fs.readFileSync(CONFIG_PATH)
    : Buffer.from("{}", "utf-8"); // no prior config on disk yet — back up an empty placeholder rather than throw
  fs.writeFileSync(configBackupPath, onDiskBytes);

  const homeDir = process.env.HOME || os.homedir();
  const legacyPath = path.join(homeDir, ".claude", "kg-config.json");
  let legacyBackupPath: string | undefined;
  if (fs.existsSync(legacyPath)) {
    legacyBackupPath = path.join(backupDir, `kg-config-legacy-${ts}.json`);
    fs.writeFileSync(legacyBackupPath, fs.readFileSync(legacyPath));
  }

  return { configBackupPath, legacyBackupPath };
}

/**
 * Consent gate for the status-schema migration (spec §12): automated callers
 * must pass confirmMigration:true explicitly; interactive callers are asked
 * via gate(), matching every other gate() call site in this codebase. An
 * explicit confirmMigration is honored directly in either mode (mirrors
 * config.ts's confirmBroadRegistration/confirmMerge "real answer bypasses
 * the ask" pattern) so a caller that already has the user's answer never
 * hits the no-transport stubAsk() timeout.
 */
async function confirmStatusSchemaMigration(opts: {
  mode: InteractionMode;
  confirmMigration?: boolean;
  timeoutMs?: number;
}): Promise<{ confirmed: true } | InputRequiredError> {
  if (opts.confirmMigration === true) return { confirmed: true };
  if (opts.mode === "automated") {
    return requireInput("status_schema_migration", "confirmMigration");
  }
  const gated = await gate({
    mode: opts.mode,
    reason: "status_schema_migration",
    param: "confirmMigration",
    accepts: ["yes", "no"],
    timeoutMs: opts.timeoutMs,
    ask: stubAsk, // no real ask() transport yet, same pattern as every other gate() stub in this plan
  });
  if ("error" in gated) return gated;
  if (!("answer" in gated) || gated.answer !== "yes") {
    return requireInput("status_schema_migration", "confirmMigration", ["yes", "no"]);
  }
  return { confirmed: true };
}

/**
 * Shared consent gate for kg_upgrade's "backfix" categories (c5 / v0.7.2):
 * repairs applied to files already corrupted by a prior bug, as opposed to
 * routine structural upgrades. Generalizes confirmStatusSchemaMigration()
 * above by reason/param instead of hardcoding one category. An explicit
 * `confirmed: true` is honored in either mode (same "real answer bypasses
 * the ask" pattern); automated mode with no explicit answer returns
 * requireInput(...); interactive mode calls gate() via the same no-real-
 * transport stubAsk() every other gate() site in this file already uses.
 *
 * Decision: one shared boolean per call, not per-category granularity --
 * every current/planned consumer (capture-corruption, platform-split,
 * future plan-status-drift) is a batch repair with no per-item ask needed.
 * `confirmed` here and `confirm_platform_split` (platform-split's own
 * pre-existing param, preserved for backward compatibility) are two
 * independent knobs, not aliases -- passing one does not bypass the other.
 */
async function confirmBackfixCategory(opts: {
  reasonCode: string; // stable machine token -- gate()/requireInput() suffix it directly (e.g. "${reasonCode}_timeout"), so this must be a token, not prose
  detail?: unknown; // human-readable prose + counts go here, not in reasonCode
  param: string; // the bypass param name this category answers to, e.g. "confirmBackfix"
  mode: InteractionMode;
  confirmed?: boolean; // explicit bypass value for whatever `param` names; strict === true check below treats false/undefined identically as "not yet answered", never as "declined" -- load-bearing for confirm_platform_split's zod .default(false)
  timeoutMs?: number; // callers MUST pass STUB_ASK_TIMEOUT_MS
  skipAsk?: boolean; // Step 6.5: once an earlier gated category in the same apply loop already came back unconfirmed, later ones short-circuit straight to requireInput() instead of stacking another stubAsk() timeout in interactive mode. No-op in automated mode, which already returns immediately.
}): Promise<{ confirmed: true } | InputRequiredError> {
  if (opts.confirmed === true) return { confirmed: true };
  if (opts.skipAsk || opts.mode === "automated") {
    return requireInput(opts.reasonCode, opts.param, ["yes", "no"], opts.detail);
  }
  try {
    const gated = await gate({
      mode: opts.mode,
      reason: opts.reasonCode,
      param: opts.param,
      accepts: ["yes", "no"],
      timeoutMs: opts.timeoutMs,
      detail: opts.detail,
      ask: stubAsk,
    });
    if ("error" in gated) return gated;
    if (!("answer" in gated) || gated.answer !== "yes") {
      return requireInput(opts.reasonCode, opts.param, ["yes", "no"], opts.detail);
    }
    return { confirmed: true };
  } catch {
    // interaction.ts:117-122: an ask() rejection propagates out of gate()
    // unmapped. Moot today (stubAsk never rejects) but this helper is meant
    // to outlive the stub and serve multiple categories -- catch here once
    // rather than leaving every future caller to rediscover the gap.
    return requireInput(`${opts.reasonCode}_ask_failed`, opts.param, ["yes", "no"], opts.detail);
  }
}

/**
 * Applies the schema migration: every graph missing status/statusChangedAt/
 * graphId gets them (status:"active" -- spec §3 has no single "the active
 * graph" concept anymore, so every non-deleted legacy graph activates
 * rather than only whatever the old `.active` pointer named); mints a fresh
 * graphId + marker for any graph lacking one (reusing an existing on-disk
 * marker instead of minting a second id, if one is somehow already there);
 * removes the top-level `active` key; and deletes the legacy config file
 * outright (spec §14 -- retire the legacy path, don't leave an unreconciled
 * duplicate). Caller must have already gated consent and written the backup.
 *
 * Interfaces item (4) draws a line between non-orphaned and orphaned/
 * unreachable graphs: only a graph whose path is actually reachable
 * (Task 1.4's checkGraphPathHealth returns "ok") gets auto-activated. A
 * graph with an unhealthy path is deliberately left without a status --
 * NOT silently activated, NOT auto-decided to some other status either --
 * and is reported back in the migration summary so the user can resolve it
 * (move/restore the path, or remove the stale registry entry) and re-run
 * the migration. Its still-missing status also means checkStatusSchema()
 * continues to flag it as unmigrated until that happens.
 */
function performStatusSchemaMigration(): string {
  const config = readConfig();

  const migratedGraphs: string[] = [];
  const needsAttention: Array<{ name: string; health: PathHealth }> = [];
  for (const [name, g] of Object.entries(config.graphs)) {
    const graph = g as unknown as Record<string, unknown>;
    let touched = false;

    if (graph.status === undefined) {
      const health = checkGraphPathHealth(g as GraphConfig);
      if (health === "ok") {
        graph.status = "active";
        graph.statusChangedAt = new Date().toISOString();
        touched = true;
      } else {
        needsAttention.push({ name, health });
      }
    } else if (graph.statusChangedAt === undefined) {
      graph.statusChangedAt = new Date().toISOString();
      touched = true;
    }
    if (graph.graphId === undefined) {
      const kgPath = (graph.path as string).replace(/^~/, os.homedir());
      const pathExists = fs.existsSync(kgPath);
      const existingMarker = pathExists ? readGraphIdMarker(kgPath) : null;
      const graphId = existingMarker ?? mintGraphId();
      graph.graphId = graphId;
      if (pathExists) {
        try {
          writeGraphIdMarker(kgPath, graphId);
        } catch {
          // Marker already present with a different id than what we just read
          // (concurrent writer) -- the registry field is still updated above;
          // Task 1.4's path-health machinery surfaces the mismatch separately.
        }
      }
      touched = true;
    }

    if (touched) migratedGraphs.push(name);
  }

  const rawConfig = config as unknown as Record<string, unknown>;
  const hadTopLevelActive = rawConfig.active !== undefined;
  delete rawConfig.active;

  writeConfig(config);

  const homeDir = process.env.HOME || os.homedir();
  const legacyPath = path.join(homeDir, ".claude", "kg-config.json");
  let legacyRemoved = false;
  // Final review finding 2 (Phase 8 final review): matches checkStatusSchema()
  // above and applyConfigLocation()/checkConfigLocation() -- when
  // KG_CONFIG_PATH is set, readConfig() never forwarded the legacy file's
  // content into it, so this migration has nothing to do with that legacy
  // file. Leave it untouched rather than deleting a file whose content was
  // never actually migrated into the active (overridden) config.
  if (!process.env.KG_CONFIG_PATH && fs.existsSync(legacyPath)) {
    fs.unlinkSync(legacyPath);
    legacyRemoved = true;
  }

  const parts: string[] = [];
  parts.push(
    migratedGraphs.length > 0
      ? `Migrated schema for: ${migratedGraphs.join(", ")}`
      : "All graphs already on current schema"
  );
  if (hadTopLevelActive) parts.push("Removed top-level 'active' key");
  if (legacyRemoved) parts.push(`Removed legacy config file at ${legacyPath}`);
  if (needsAttention.length > 0) {
    parts.push(
      `Needs attention -- NOT auto-activated (path unhealthy, status left unset, resolve and re-run): ` +
        needsAttention.map((n) => `${n.name} (${n.health})`).join(", ")
    );
  }
  return parts.join(". ");
}

// Files that belong in concepts/ if found in the stray knowledge/ dir
const STRAY_KNOWLEDGE_TEMPLATE_FILES = [
  "architecture.md",
  "concepts.md",
  "gotchas.md",
  "patterns.md",
  "workflows.md",
];

function applyStrayKnowledgeDir(kgPath: string): string {
  const strayDir = path.join(kgPath, "knowledge");
  if (!fs.existsSync(strayDir)) return "No stray knowledge/ dir found; skipped";

  const pluginRoot = getPluginRoot();
  const sourceDir = path.join(pluginRoot, "core", "default-templates", "concepts", "templates");
  const destConcepts = path.join(kgPath, "concepts");
  fs.mkdirSync(destConcepts, { recursive: true });

  const moved: string[] = [];
  const skipped: string[] = [];
  const ignored: string[] = [];

  for (const entry of fs.readdirSync(strayDir)) {
    const src = path.join(strayDir, entry);
    if (!fs.statSync(src).isFile()) continue;

    if (!STRAY_KNOWLEDGE_TEMPLATE_FILES.includes(entry)) {
      // Not a known template file — do not touch (could be user content)
      ignored.push(entry);
      continue;
    }

    const srcContent = fs.readFileSync(src, "utf-8");

    // ADR-063: never destroy known-good state, and never auto-resolve a real
    // conflict on the tool's own judgment — this always reports for a human
    // decision, even when the stray file is provably blank boilerplate. The
    // tool's job is to explain what it found and why it stopped, not to act
    // on the human's behalf.
    const dest = path.join(destConcepts, entry);
    if (fs.existsSync(dest)) {
      const destContent = fs.readFileSync(dest, "utf-8");
      if (srcContent !== destContent) {
        skipped.push(`${entry} (both knowledge/${entry} and concepts/${entry} contain different content — manual review required, neither touched)`);
        continue;
      }
      // Destination already has identical content — just remove the stray duplicate.
      fs.unlinkSync(src);
      moved.push(`${entry} (duplicate removed, concepts/${entry} unchanged)`);
      continue;
    }

    const canonicalSrc = path.join(sourceDir, entry);
    if (fs.existsSync(canonicalSrc)) {
      const canonContent = fs.readFileSync(canonicalSrc, "utf-8");
      if (srcContent !== canonContent) {
        // ADR-040: user modified — warn, do not auto-overwrite
        skipped.push(`${entry} (modified — manual review required before moving to concepts/)`);
        continue;
      }
    }

    fs.copyFileSync(src, dest);
    fs.unlinkSync(src);
    moved.push(entry);
  }

  // Remove stray dir only if empty (ignored/skipped files may still be in it)
  const remaining = fs.readdirSync(strayDir);
  if (remaining.length === 0) {
    fs.rmdirSync(strayDir);
  }

  const parts: string[] = [];
  if (moved.length > 0) parts.push(`Moved to concepts/: ${moved.join(", ")}`);
  if (skipped.length > 0) parts.push(`Skipped (needs manual review): ${skipped.join(", ")}`);
  if (ignored.length > 0) parts.push(`Ignored (not template files): ${ignored.join(", ")}`);
  if (remaining.length > 0) parts.push(`knowledge/ not removed — ${remaining.length} item(s) remain`);
  return parts.join(". ") || "Nothing to move";
}

function applyConfigLocation(): string {
  // Match checkConfigLocation(): an explicit KG_CONFIG_PATH override means the
  // legacy-location migration is not in play — skip entirely.
  if (process.env.KG_CONFIG_PATH) return "KG_CONFIG_PATH override set; config-location migration skipped";
  const homeDir = process.env.HOME || os.homedir();
  const oldPath = path.join(homeDir, ".claude", "kg-config.json");
  const newPath = path.join(homeDir, ".kmgraph", "kg-config.json");
  if (!fs.existsSync(oldPath)) return "No legacy kg-config.json found; skipped";
  if (fs.existsSync(newPath)) return "Platform-neutral kg-config.json already exists; skipped";
  fs.mkdirSync(path.dirname(newPath), { recursive: true });
  fs.copyFileSync(oldPath, newPath);
  return `Copied kg-config.json to ${newPath} (legacy file at ${oldPath} left untouched)`;
}

function applyPlatformSplit(kgPath: string): string {
  // Remove platform-specific lines from rules.md and bump schema version
  const rulesPath = path.join(kgPath, "knowledge", "rules.md");
  if (!fs.existsSync(rulesPath)) return "rules.md not found; skipped";

  const CONTAMINATION_PATTERN =
    /(use|prefer|avoid|never use|always use|do not use|switch to|stop using).{0,80}(\bGlob\b|\bGrep\b|context-mode|\bsubagent\b|\.jsonl)|(\bGlob\b|\bGrep\b|context-mode|\bsubagent\b|\.jsonl).{0,80}(use|prefer|avoid|instead|only|never)/i;

  const original = fs.readFileSync(rulesPath, "utf-8");
  const lines = original.split("\n");
  const kept: string[] = [];
  const removed: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (CONTAMINATION_PATTERN.test(lines[i])) {
      removed.push(`line ${i + 1}: ${lines[i].substring(0, 80)}`);
    } else {
      kept.push(lines[i]);
    }
  }

  // Update or add kmgraph_schema: 2 in frontmatter (CRLF-safe)
  let updated = kept.join("\n");
  if (updated.startsWith("---\r\n") || updated.startsWith("---\n")) {
    updated = updated.replace(/^(---\r?\n)([\s\S]*?)(---\r?\n)/, (_m, open, body, close) => {
      // Normalize to LF for consistent output
      const normalizedBody = body.replace(/\r\n/g, "\n");
      if (/kmgraph_schema:/.test(normalizedBody)) {
        return "---\n" + normalizedBody.replace(/kmgraph_schema:\s*\d+/, "kmgraph_schema: 2") + "---\n";
      }
      return "---\n" + normalizedBody + "kmgraph_schema: 2\n" + "---\n";
    });
  }

  fs.writeFileSync(rulesPath, updated, "utf-8");
  return `Platform-split applied. Removed ${removed.length} line(s). kmgraph_schema set to 2.\n${removed.slice(0, 5).join("\n")}`;
}

function checkVersionMismatch(
  installedVersion: string,
  kgType: string | undefined,
  config: ReturnType<typeof readConfig>,
  graphName: string
): UpgradeItem[] {
  const graphRecord = config.graphs[graphName] as unknown as Record<string, unknown>;
  const lastApplied = graphRecord.lastAppliedVersion as string | undefined;
  if (!lastApplied || lastApplied === installedVersion) return [];
  return [{
    category: "version-update",
    description: `Installed v${installedVersion} > last applied v${lastApplied} — run apply to update`,
    details: `Apply categories: directories, templates, starter-relocation${kgType === "project-local" ? ", stray-knowledge-dir" : ""}`,
  }];
}

function updateLastAppliedVersion(installedVersion: string, graphName: string): void {
  // Fresh read to avoid clobbering field additions made by applyConfig() in the same apply run
  const config = readConfig();
  const graph = config.graphs[graphName] as unknown as Record<string, unknown>;
  graph.lastAppliedVersion = installedVersion;
  writeConfig(config);
}

// ── Exported handler for direct testing ──────────────────────────────────────

// "version-update" is inspect-only — NOT an apply category; do not add it here
export type ApplyCategory = "status-schema" | "config-location" | "directories" | "config" | "templates" | "platform-split" | "starter-relocation" | "stray-knowledge-dir" | "capture-corruption";

export interface HandleUpgradeParams {
  apply?: ApplyCategory[];
  confirm_platform_split?: boolean;
  scope?: "project" | "user";
  confirmPersonalScope?: boolean;
  // ADR-067 Task 8.1: required (automated mode) to apply "status-schema".
  // Interactive mode is asked via gate() instead; an explicit true here is
  // still honored in either mode (see confirmStatusSchemaMigration).
  confirmMigration?: boolean;
  // c5 (v0.7.2): required (automated mode) to apply any "backfix" category
  // -- currently "capture-corruption" -- that repairs already-corrupted
  // content. Interactive mode is asked via gate() instead; an explicit true
  // here is still honored in either mode (see confirmBackfixCategory).
  confirmBackfix?: boolean;
}

export interface HandleUpgradeResult {
  [x: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  isError?: true;
}

export async function handleUpgrade(
  params: HandleUpgradeParams,
  personalScopeSession: PersonalScopeSession = new PersonalScopeSession(),
  toolCallMeta?: Record<string, unknown>
): Promise<HandleUpgradeResult> {
  // Under Jest/ts-jest __SERVER_VERSION__ is undefined → installedVersion = "0.0.0"
  const installedVersion = handleVersion().installed;
  const config = readConfig();
  const cwd = resolveEffectiveCwd({ processCwd: process.cwd(), toolCallMeta });

  // ADR-067 Task 1.9: resolution is context-derived (resolveGraph), not
  // config.active-derived. Resolution failure no longer short-circuits the
  // whole tool -- config-location is graph-independent (and, per Task 8.1,
  // a future migration category must run before any graph can resolve
  // correctly) and must stay reachable even when no graph resolves.
  const target = params.scope === "user" ? resolvePersonalGraph(config) : (() => {
    const resolution = resolveGraph(config, cwd);
    return resolution.kind === "resolved"
      ? { name: resolution.name, graph: resolution.graph }
      : { error: "No knowledge graph resolved from your current directory. Use kg_config_init first, or pass scope=\"user\"." };
  })();

  // ADR-067 Task 6.4 (spec §11): scope:"user" reaches the personal graph
  // here the same way it does in search.ts/capture.ts/kg_config_add_category/
  // kg_fts5_status/kg_fts5_rebuild -- same gate, closing the interim gap
  // left open by Task 1.9. Only gated when resolution actually succeeded --
  // an unresolved target already short-circuits into its own inspect-only
  // "resolution" warning below and never touches the graph.
  if (params.scope === "user" && !("error" in target)) {
    const mode = resolveInteractionMode({}).mode;
    const confirmed = await confirmPersonalScopeAccess(personalScopeSession, cwd, {
      confirmPersonalScope: params.confirmPersonalScope,
      mode,
      timeoutMs: STUB_ASK_TIMEOUT_MS,
      ask: stubAsk,
    });
    if (!("confirmed" in confirmed)) {
      return { content: [{ type: "text" as const, text: JSON.stringify(confirmed) }], isError: true };
    }
  }

  const applyList = params.apply ?? [];
  const sortedApplyList = [...applyList].sort(
    (a, b) => APPLY_ORDER.indexOf(a) - APPLY_ORDER.indexOf(b)
  );

  if (applyList.length === 0) {
    const result: InspectResult = { upgrades: [], warnings: [] };
    result.upgrades.push(...checkStatusSchema());
    result.upgrades.push(...checkConfigLocation());

    if ("error" in target) {
      // DRIFT GUARD (issue-51): "resolution" is pushed into upgrades[] but is NOT a
      // member of ApplyCategory (see the type declaration above) or the apply Zod
      // enum in registerUpgradeTool — same for "version-update". Any FUTURE category
      // routed into upgrades[] that is likewise not an apply-enum member MUST also be
      // added to the deny-list in commands/kmg-init-shared/kmg-upgrade-inspector.md
      // (Step 0's parse loop and the apply-construction note). Miss it and
      // /kmgraph:kmg-init builds an apply: [...] call that Zod rejects wholesale,
      // failing the user's legitimate fixes too.
      result.upgrades.push({
        category: "resolution",
        description: target.error,
        details: "Graph-dependent checks (directories, config, templates, stray-knowledge-dir, version-update) were skipped.",
      });
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    }

    const kgPath = target.graph.path.replace(/^~/, os.homedir());
    const kgType = target.graph.type as string | undefined;
    if (!fs.existsSync(kgPath)) {
      return {
        content: [{ type: "text" as const, text: `Error: KG path not found: ${kgPath}` }],
        isError: true,
      };
    }

    result.upgrades.push(...checkDirectories(kgPath));
    result.upgrades.push(...checkConfig(kgPath, target.name));
    result.upgrades.push(...checkStarterRelocation(kgPath));
    result.upgrades.push(...checkTemplates(kgPath));
    result.upgrades.push(...checkStrayKnowledgeDir(kgPath, kgType));
    result.upgrades.push(...checkCaptureCorruption(kgPath));
    result.upgrades.push(...checkVersionMismatch(installedVersion, kgType, config, target.name));
    const platformWarning = checkPlatformSplit(kgPath);
    if (platformWarning) result.warnings.push(platformWarning);
    return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
  }

  const results: string[] = [];
  // c5 (v0.7.2) BLOCKER fix: an unconfirmed backfix category (capture-
  // corruption, platform-split -- both LAST in APPLY_ORDER) must not
  // discard earlier categories' already-accumulated `results` text. Each
  // pending InputRequiredError goes here instead of into `results`, and is
  // emitted as its own separate content block below, so it stays
  // independently JSON.parse-able and the prose report survives intact.
  const pending: InputRequiredError[] = [];
  let appliedAnyGraphDependent = false;
  let anyCategoryFailed = false;

  // Opus review (2026-08-02), BLOCKER B-1: the pre-Task-1.9 code checked
  // fs.existsSync(kgPath) once, before branching on applyList, so a
  // deleted/unmounted registry path hard-failed the whole call. The
  // resolveGraph restructure moved that check into the inspect-mode branch
  // only, leaving apply mode free to mkdirSync(..., {recursive:true}) a
  // fresh empty tree at a stale path -- silently resurrecting a directory
  // the user deleted. Re-added here, gated the same way inspect mode is.
  const resolvedKgPathForApply = !("error" in target)
    ? target.graph.path.replace(/^~/, os.homedir())
    : undefined;
  if (resolvedKgPathForApply && !fs.existsSync(resolvedKgPathForApply) && sortedApplyList.some((c) => c !== "config-location" && c !== "status-schema")) {
    return {
      content: [{ type: "text" as const, text: `Error: KG path not found: ${resolvedKgPathForApply}` }],
      isError: true,
    };
  }

  for (const category of sortedApplyList) {
    if (category === "status-schema") {
      // Backup precedes the consent gate (interfaces item 6) -- unconditional,
      // regardless of whether the migration is ultimately confirmed.
      backupStatusSchemaFiles();
      const mode = resolveInteractionMode({}).mode;
      const confirmation = await confirmStatusSchemaMigration({
        mode,
        confirmMigration: params.confirmMigration,
        timeoutMs: STUB_ASK_TIMEOUT_MS,
      });
      if (!("confirmed" in confirmation)) {
        return { content: [{ type: "text" as const, text: JSON.stringify(confirmation) }], isError: true };
      }
      results.push(`[status-schema] ${performStatusSchemaMigration()}`);
      continue;
    }
    if (category === "config-location") {
      results.push(`[config-location] ${applyConfigLocation()}`);
      continue;
    }
    if ("error" in target) {
      results.push(`[${category}] Error: ${target.error}`);
      anyCategoryFailed = true;
      continue;
    }
    const kgPath = target.graph.path.replace(/^~/, os.homedir());
    switch (category) {
      case "directories":
        results.push(`[directories] ${applyDirectories(kgPath)}`);
        appliedAnyGraphDependent = true;
        break;
      case "config":
        results.push(`[config] ${applyConfig(target.name)}`);
        appliedAnyGraphDependent = true;
        break;
      case "templates":
        results.push(`[templates] ${applyTemplates(kgPath)}`);
        appliedAnyGraphDependent = true;
        break;
      case "starter-relocation":
        results.push(`[starter-relocation] ${applyStarterRelocation(kgPath)}`);
        appliedAnyGraphDependent = true;
        break;
      case "stray-knowledge-dir":
        results.push(`[stray-knowledge-dir] ${applyStrayKnowledgeDir(kgPath)}`);
        appliedAnyGraphDependent = true;
        break;
      case "capture-corruption": {
        // c5: retrofitted onto the shared backfix gate -- previously applied
        // unconditionally with no consent check at all (the most severe of
        // the three original gaps this plan closes).
        const mode = resolveInteractionMode({}).mode;
        // Re-scan for an honest per-run count/description rather than a
        // stale one computed at inspect time (checkCaptureCorruption's
        // counts aren't otherwise exposed as structured data). Also lets us
        // skip the ASK (not the apply call itself) when inspect's own scan
        // finds nothing to repair (Opus review, 2026-08-18) -- otherwise a
        // healthy KG gets a hard KMG_INPUT_REQUIRED for a would-be no-op,
        // with no detail explaining what it's even asking about. Still call
        // applyCaptureCorruption() unconditionally below either way (not
        // substituted with a canned message): it has its own independent
        // false-positive guard from inspect's, and several regression tests
        // exist specifically to prove the two guards agree -- shortcutting
        // past the real call here would let them silently diverge again.
        const rescan = checkCaptureCorruption(kgPath);
        const confirmation = rescan.length === 0
          ? { confirmed: true as const }
          : await confirmBackfixCategory({
              reasonCode: "capture_corruption_backfix",
              param: "confirmBackfix",
              mode,
              confirmed: params.confirmBackfix,
              timeoutMs: STUB_ASK_TIMEOUT_MS,
              detail: rescan[0]?.description,
              skipAsk: pending.length > 0,
            });
        if (!("confirmed" in confirmation)) {
          pending.push(confirmation);
          anyCategoryFailed = true;
          break;
        }
        results.push(`[capture-corruption] ${applyCaptureCorruption(kgPath)}`);
        appliedAnyGraphDependent = true;
        break;
      }
      case "platform-split": {
        // c5: migrated from a boolean-flag-only check onto the shared
        // backfix gate for consistency with capture-corruption/status-
        // schema, preserving confirm_platform_split as the bypass param
        // name. Breaking behavior change (named explicitly, not a pure
        // refactor): automated callers that previously got back a non-error
        // warning string now get KMG_INPUT_REQUIRED with isError:true
        // instead when the flag is omitted.
        const mode = resolveInteractionMode({}).mode;
        // NOT given the same "skip the ask when nothing to do" treatment as
        // capture-corruption (reverted after a second Opus review, 2026-08-18,
        // found it was unsafe here): checkPlatformSplit()'s "nothing found"
        // signal is `kmgraph_schema >= 2` -- a stored version marker, not a
        // live re-scan for contamination the way checkCaptureCorruption's is.
        // A file whose schema was already bumped but that still (or again)
        // has flagged lines would report "nothing to do" while
        // applyPlatformSplit() unconditionally deletes those lines anyway --
        // a silent, unconsented content removal, which is exactly the class
        // of gap this plan exists to close. Always gate here; only
        // capture-corruption's check/apply pair was verified to share
        // identical scan logic closely enough to skip the ask safely.
        const confirmation = await confirmBackfixCategory({
          reasonCode: "platform_split_backfix",
          param: "confirm_platform_split",
          mode,
          confirmed: params.confirm_platform_split,
          timeoutMs: STUB_ASK_TIMEOUT_MS,
          detail: "platform-split migration removes content from rules.md.",
          skipAsk: pending.length > 0,
        });
        if (!("confirmed" in confirmation)) {
          pending.push(confirmation);
          anyCategoryFailed = true;
          break;
        }
        results.push(`[platform-split] ${applyPlatformSplit(kgPath)}`);
        appliedAnyGraphDependent = true;
        break;
      }
    }
  }

  // Write lastAppliedVersion sentinel after any successful graph-dependent apply
  if (appliedAnyGraphDependent && !("error" in target)) {
    updateLastAppliedVersion(installedVersion, target.name);
  }

  // Opus review (2026-08-02), SF-1: a resolution failure for a
  // graph-dependent category previously produced a hard isError:true
  // (pre-Task-1.9). The restructure folded the failure into `results` text
  // with no isError flag, so a client saw a "successful" call whose text
  // happened to contain "Error:". Restored here.
  //
  // c5: each pending backfix consent is its own content block (not embedded
  // as a substring of the joined prose) so it stays independently
  // JSON.parse-able, matching every other KMG_INPUT_REQUIRED response shape
  // in this file -- see the `pending` declaration above for why. The prose
  // block is omitted entirely when `results` is empty (found in Opus review,
  // 2026-08-18) rather than emitted as an empty string: every other
  // KMG_INPUT_REQUIRED response in this file puts bare JSON at content[0],
  // and a caller following that existing convention would otherwise hit a
  // JSON.parse SyntaxError against "" for a single-category unconfirmed call.
  // The prose block is included whenever there's real prose OR nothing else
  // to fall back on (an empty `content` array would break every caller that
  // assumes at least one block always exists, e.g. an unrecognized apply
  // category that hits no switch case). It's omitted only when it would
  // otherwise be an empty string sitting in front of a real pending error.
  const content: Array<{ type: "text"; text: string }> = [];
  if (results.length > 0 || pending.length === 0) {
    content.push({ type: "text" as const, text: results.join("\n\n") });
  }
  content.push(...pending.map((e) => ({ type: "text" as const, text: JSON.stringify(e) })));
  return { content, ...(anyCategoryFailed ? { isError: true as const } : {}) };
}

// ── Tool registration ────────────────────────────────────────────────────────

export function registerUpgradeTool(server: McpServer, personalScopeSession: PersonalScopeSession): void {
  server.tool(
    "kg_upgrade",
    "Inspect and apply KMGraph upgrades for MCP-only installations",
    {
      apply: z
        .array(z.enum(["status-schema", "config-location", "directories", "config", "templates", "platform-split", "starter-relocation", "stray-knowledge-dir", "capture-corruption"]))
        .optional()
        .default([])
        .describe(
          'Categories to apply. Omit or pass [] to inspect only. Values: "status-schema", "config-location", "directories", "config", "templates", "platform-split", "starter-relocation", "stray-knowledge-dir", "capture-corruption" (issue-46 backfix: repairs files corrupted by the filename/frontmatter-double-embed bugs)'
        ),
      confirm_platform_split: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          "Must be true to apply platform-split migration (removes content from rules.md)"
        ),
      scope: z
        .enum(["project", "user"])
        .optional()
        .describe("project (default, cwd-resolved) or user (the personal knowledge graph)"),
      confirmPersonalScope: z
        .boolean()
        .optional()
        .describe(
          "Confirms this repo may touch the personal knowledge graph. Required once per " +
            "process before a scope:\"user\" upgrade is honored for a repo not yet confirmed."
        ),
      confirmMigration: z
        .boolean()
        .optional()
        .describe(
          "Must be true (in automated mode) to apply the status-schema migration -- reconciles " +
            "old .active/legacy config into the status/graphId schema and deletes the legacy " +
            "~/.claude/kg-config.json file. Interactive callers are asked to confirm instead."
        ),
      confirmBackfix: z
        .boolean()
        .optional()
        .describe(
          "Must be true (in automated mode) to apply backfix categories that repair already-" +
            "corrupted content -- currently \"capture-corruption\" (issue-46). Interactive callers " +
            "are asked to confirm instead."
        ),
    },
    async ({ apply, confirm_platform_split, scope, confirmPersonalScope, confirmMigration, confirmBackfix }, extra) => {
      return handleUpgrade(
        { apply: apply as ApplyCategory[] | undefined, confirm_platform_split, scope, confirmPersonalScope, confirmMigration, confirmBackfix },
        personalScopeSession,
        extra?._meta as Record<string, unknown> | undefined
      );
    }
  );
}
