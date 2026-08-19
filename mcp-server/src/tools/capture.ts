import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { readConfig, writeConfig, KgConfig } from "../utils.js";
import { rebuildIndex } from "./fts5.js";
import {
  resolveGraph,
  resolveGraphOutcome,
  GatedResolution,
  ResolutionResult,
  parseScopeMarker,
  PersonalScopeSession,
  confirmPersonalScopeAccess,
  resolvePersonalGraph,
} from "../resolution.js";
import { resolveInteractionMode, InteractionMode, GateResult, STUB_ASK_TIMEOUT_MS, gate, stubAsk } from "../interaction.js";
import { confirmFirstWrite } from "./config.js";
import { resolveEffectiveCwd } from "../platform-cwd.js";

export interface CaptureRequest {
  content: string;
  type: "lesson" | "session" | "adr";
  metadata: {
    title: string;
    category?: string;
    tags?: string[];
    git?: {
      branch?: string;
      commit?: string;
      commit_short?: string;
      author?: string;
      email?: string;
      pr?: string | null;
      issue?: string | null;
    };
    version?: string;
    existingFile?: string;
    // session-only: update-in-place header fields (issue-46 Manifestation B)
    as_of_commit?: string;
    last_updated?: string;
    // adr-only: full frontmatter fields (issue-46 Manifestation B), matching
    // core/default-templates/decisions/ADR-template.md's canonical shape
    status?: string;
    number?: number;
    implements?: string | null;
    related?: {
      adrs?: string[];
      lessons?: string[];
      kg_entries?: string[];
    };
    search_aliases?: string[];
  };
}

export interface CaptureResponse {
  status: "created" | "updated";
  filePath: string;
  relativePath: string;
  indexResult: Record<string, unknown>;
  notice?: string;
}

export interface CaptureError {
  error: "KG_MISMATCH" | "VALIDATION_ERROR" | "IO_ERROR" | "CONFLICT" | "KMG_INPUT_REQUIRED";
  activeKg?: string;
  activeKgRoot?: string;
  cwd?: string;
  message?: string;
  reason?: string;
  resolveWith?: { param: string; accepts?: string[] };
  detail?: unknown;
}

// Maps a GateResult (answered/declined/cancelled/InputRequiredError) that
// resolveGraphOutcome couldn't resolve into a CaptureError. "answered" never
// reaches here -- resolveGraphOutcome only returns kind: "gated" when there
// was no usable answer.
function gateResultToCaptureError(result: GateResult): CaptureError {
  if ("answer" in result) {
    // Unreachable: resolveGraphOutcome only returns kind: "gated" when there
    // was no usable answer. Guarded here purely to keep the type total.
    return { error: "KMG_INPUT_REQUIRED", reason: "unexpected_answered_state", message: "Internal error: gate() answered but resolveGraphOutcome treated it as unresolved." };
  }
  if ("error" in result) {
    return {
      error: "KMG_INPUT_REQUIRED",
      reason: result.reason,
      resolveWith: result.resolveWith,
      detail: result.detail,
      message: `Input required: ${result.reason}`,
    };
  }
  if ("declined" in result) {
    return { error: "KMG_INPUT_REQUIRED", reason: "declined", message: "Resolution question was declined." };
  }
  return { error: "KMG_INPUT_REQUIRED", reason: "cancelled", message: "Resolution question was cancelled." };
}

async function resolveKgOutcome(
  config: KgConfig,
  resolution: ResolutionResult,
  mode: InteractionMode,
  cwd: string
): Promise<{ kgPath: string; resolvedKgName: string; notice?: string } | CaptureError> {
  const outcome: GatedResolution = await resolveGraphOutcome(config, resolution, cwd, mode);
  if (outcome.kind === "resolved") {
    return {
      kgPath: outcome.graph.path.replace(/^~/, os.homedir()),
      resolvedKgName: outcome.name,
      notice: outcome.notice,
    };
  }
  if (outcome.kind === "no-graph-in-cwd") {
    return { error: "KG_MISMATCH", activeKgRoot: undefined, cwd };
  }
  if (outcome.kind === "not-registered") {
    return { error: "VALIDATION_ERROR", message: `Unknown KG name: "${outcome.name}".` };
  }
  return gateResultToCaptureError(outcome.result);
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// issue-46 Manifestation B defensive backstop: generateFrontmatter() is the
// sole owner of the frontmatter block written to disk. If content already
// starts with one (a caller template not yet updated, or a hand-composed
// kg_capture call), strip it here rather than stacking two blocks. Fixing
// caller templates (agents/session-summary-agent.md,
// agents/create-adr-agent.md) is the primary fix; this is the enforcement
// backstop for callers this fix doesn't reach.
// Every key generateFrontmatter() above can emit, at either nesting level,
// plus legacy template keys (`deciders`) that appear in already-written files.
// Stripping is gated on recognizing at least one of these — see the
// false-positive note in stripLeadingFrontmatterOnce().
const GENERATED_FRONTMATTER_KEYS = new Set([
  "title", "created", "updated", "date", "author", "email",
  "git", "branch", "commit", "commit_short",
  "tags", "category", "version", "status", "number",
  "as_of_commit", "last_updated", "implements",
  "related", "adrs", "lessons", "kg_entries",
  "search_aliases", "deciders", "pr", "issue",
]);

// Strips at most ONE leading frontmatter block. Callers want the fixed-point
// wrapper below, not this.
function stripLeadingFrontmatterOnce(content: string): string {
  if (!content.startsWith("---")) return content;
  const newlineAfterOpen = content.indexOf("\n");
  if (newlineAfterOpen === -1) return content;
  if (content.slice(0, newlineAfterOpen).trim() !== "---") return content;

  // Scan line-by-line for the closing `---` and whether the block in
  // between is entirely real YAML — every non-blank line must be a
  // `key:` field or an indented continuation of one, not just "at least
  // one" field present. A body that merely opens with a markdown
  // horizontal rule (or a longer dash run like `----`) is real content,
  // not frontmatter, and must not be stripped.
  //
  // "All lines look key-shaped" is still not enough on its own: a prose
  // region whose every line happens to be colon-prefixed (e.g. a region
  // containing only "Note: deferred X.") passes that test and gets silently
  // deleted — Fable review (2026-08-19) reproduced this live against the
  // previous hardening. So also require at least one key the server itself
  // would have emitted (GENERATED_FRONTMATTER_KEYS). Same false-positive
  // class as upgrade.ts's detectDoubledFrontmatter/looksLikeYaml.
  let hasKnownKey = false;
  let sawNonBlank = false;
  let looksLikeYaml = true;
  let prevWasKey = false;
  let lineStart = newlineAfterOpen + 1;
  let closeLineEnd = -1;
  while (lineStart <= content.length) {
    let lineEnd = content.indexOf("\n", lineStart);
    if (lineEnd === -1) lineEnd = content.length;
    const line = content.slice(lineStart, lineEnd);
    if (line.trim() === "---") {
      closeLineEnd = lineEnd;
      break;
    }
    const topKey = /^([A-Za-z_][\w-]*):/.exec(line);
    if (topKey) {
      sawNonBlank = true;
      if (GENERATED_FRONTMATTER_KEYS.has(topKey[1].toLowerCase())) hasKnownKey = true;
      prevWasKey = true;
    } else if (prevWasKey && /^\s/.test(line)) {
      // indented continuation of the previous key — still valid YAML. A
      // nested `  branch:`/`  adrs:` counts toward the known-key gate too.
      sawNonBlank = true;
      const nestedKey = /^\s+([A-Za-z_][\w-]*):/.exec(line);
      if (nestedKey && GENERATED_FRONTMATTER_KEYS.has(nestedKey[1].toLowerCase())) hasKnownKey = true;
    } else if (line.trim() !== "") {
      sawNonBlank = true;
      looksLikeYaml = false;
      prevWasKey = false;
    } else {
      prevWasKey = false; // blank line ends continuation eligibility
    }
    lineStart = lineEnd + 1;
  }
  if (closeLineEnd === -1 || !looksLikeYaml) return content;
  // A fenced region holding only blank lines is a degenerate/empty
  // frontmatter block. Leaving it in place makes the real block stack on top
  // and writes a file opening with four `---` fences, so strip it. (The only
  // other thing this shape can be is two adjacent horizontal rules, and
  // dropping those still preserves every line of body content.)
  if (sawNonBlank && !hasKnownKey) return content;

  let rest = content.slice(closeLineEnd + 1);
  if (rest.startsWith("\r\n")) rest = rest.slice(2);
  else if (rest.startsWith("\n")) rest = rest.slice(1);
  return rest.replace(/^\s*\n/, "");
}

// Content can arrive with more than one block already stacked — a LEGACY file
// corrupted before this backstop existed, read back and re-submitted through
// the update-in-place path (existingFile), or a caller template that doubled
// on its own. Stripping exactly once leaves a block behind for
// generateFrontmatter() to stack on top of, re-emitting the corruption, so
// run to a fixed point. Terminates: each strip strictly shortens the string.
function stripLeadingFrontmatter(content: string): string {
  let current = content;
  for (;;) {
    const next = stripLeadingFrontmatterOnce(current);
    if (next === current) return current;
    current = next;
  }
}

export function validateMetadata(
  metadata: CaptureRequest["metadata"]
): CaptureRequest["metadata"] | CaptureError {
  if (!metadata.title || metadata.title.trim() === "") {
    return { error: "VALIDATION_ERROR", message: "metadata.title is required" };
  }
  if (!metadata.tags) metadata.tags = [];
  return metadata;
}

// issue-46 Manifestation A server-side enforcement. Manifestation B (embedded
// frontmatter) got the stripLeadingFrontmatter() backstop above; the doubled
// filename/title prefix had only a documented caller contract, so a stale
// cached agent definition or a hand-composed kg_capture call sending
// title: "2026-08-19-main" still reproduced "2026-08-19-2026-08-19-main.md"
// end-to-end. Reject rather than silently strip: deriveFileName() and
// displayTitleFor() own the prefix, and guessing which prefix was intended
// would corrupt a legitimate title that merely looks pre-prefixed.
const TITLE_PREFIX_RULES: Partial<
  Record<CaptureRequest["type"], { pattern: RegExp; label: string }>
> = {
  session: { pattern: /^\d{4}-\d{2}-\d{2}[-\s]/, label: "a date prefix (YYYY-MM-DD-)" },
  adr: { pattern: /^ADR-\d+[:\-\s]/i, label: "an ADR-number prefix (ADR-NNN)" },
};

export function checkTitlePrefix(
  type: CaptureRequest["type"],
  title: string
): CaptureError | null {
  const rule = TITLE_PREFIX_RULES[type];
  if (!rule || !rule.pattern.test(title.trim())) return null;
  return {
    error: "VALIDATION_ERROR",
    message:
      `metadata.title must be bare, but "${title}" already carries ${rule.label} ` +
      `that kg_capture also adds — writing it would produce a doubled prefix ` +
      `(issue-46 Manifestation A). Resend the title without the prefix.`,
  };
}

export function deriveFileName(
  type: CaptureRequest["type"],
  metadata: CaptureRequest["metadata"],
  adrNumber?: number
): string {
  if (type === "lesson") {
    const titlePascal = metadata.title
      .split(/[\s_-]+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join("_");
    if (metadata.category) {
      const catPascal = metadata.category
        .split(/[\s_-]+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join("_");
      return `Lessons_Learned_${catPascal}_${titlePascal}.md`;
    }
    return `Lessons_Learned_${titlePascal}.md`;
  }

  // Caller must pass a bare title (issue-46 Manifestation A) — this function
  // owns all filename prefixing. A caller-supplied date or ADR-number prefix
  // is NOT stripped here; it will double-prepend. handleCapture() rejects such
  // titles up front via checkTitlePrefix(). See knowledge/issues/issue-46/.
  if (type === "session") {
    return `${todayIso()}-${slugify(metadata.title)}.md`;
  }

  if (type === "adr") {
    const num = String(adrNumber ?? 1).padStart(3, "0");
    return `ADR-${num}-${slugify(metadata.title)}.md`;
  }

  return `${slugify(metadata.title)}.md`;
}

export function generateFrontmatter(
  type: CaptureRequest["type"],
  metadata: CaptureRequest["metadata"]
): string {
  const now = new Date().toISOString();
  const today = todayIso();
  const lines: string[] = ["---"];

  if (type === "lesson") {
    lines.push(`title: "${metadata.title.replace(/"/g, '\\"')}"`);
    lines.push(`created: ${now}`);
    lines.push(`updated: ${now}`);
    if (metadata.git?.author) lines.push(`author: ${metadata.git.author}`);
    if (metadata.git) {
      lines.push("git:");
      if (metadata.git.branch) lines.push(`  branch: ${metadata.git.branch}`);
      if (metadata.git.commit) lines.push(`  commit: ${metadata.git.commit}`);
    }
    if (metadata.tags && metadata.tags.length > 0) {
      lines.push(`tags: [${metadata.tags.join(", ")}]`);
    }
    if (metadata.category) lines.push(`category: ${metadata.category}`);
    if (metadata.version) lines.push(`version: "${metadata.version}"`);
  } else if (type === "session") {
    // issue-46 backfix hardening: use the same dated title displayTitleFor()
    // already computes for the README index — a bare title here regresses
    // FTS5 title-ranked search, which relies on the date prefix as signal.
    lines.push(`title: "${displayTitleFor("session", metadata).replace(/"/g, '\\"')}"`);
    lines.push(`date: ${today}`);
    if (metadata.git?.branch) lines.push(`branch: ${metadata.git.branch}`);
    if (metadata.git?.commit_short) lines.push(`commit: ${metadata.git.commit_short}`);
    // issue-46 Manifestation B: these previously lived in a caller-embedded
    // frontmatter block; now sole-owned here, sourced from metadata so the
    // update-in-place path (existingFile) can refresh them.
    if (metadata.as_of_commit) lines.push(`as_of_commit: ${metadata.as_of_commit}`);
    if (metadata.last_updated) lines.push(`last_updated: ${metadata.last_updated}`);
    if (metadata.tags && metadata.tags.length > 0) {
      lines.push(`tags: [${metadata.tags.join(", ")}]`);
    }
  } else if (type === "adr") {
    // issue-46 Manifestation B: full shape matches
    // core/default-templates/decisions/ADR-template.md — previously only a
    // stub (title/status-hardcoded/date/deciders/tags) because callers always
    // embedded their own complete block on top of this one; now sole owner.
    lines.push(`title: "${metadata.title.replace(/"/g, '\\"')}"`);
    if (metadata.number !== undefined) lines.push(`number: ${metadata.number}`);
    lines.push(`created: ${now}`);
    lines.push(`status: ${metadata.status ?? "Proposed"}`);
    if (metadata.git?.author) lines.push(`author: ${metadata.git.author}`);
    if (metadata.git?.email) lines.push(`email: ${metadata.git.email}`);
    if (metadata.git?.branch || metadata.git?.commit || metadata.git?.pr !== undefined || metadata.git?.issue !== undefined) {
      lines.push("git:");
      if (metadata.git?.branch) lines.push(`  branch: ${metadata.git.branch}`);
      if (metadata.git?.commit) lines.push(`  commit: ${metadata.git.commit}`);
      lines.push(`  pr: ${metadata.git?.pr ?? "null"}`);
      lines.push(`  issue: ${metadata.git?.issue ?? "null"}`);
    }
    lines.push(`implements: ${metadata.implements ?? "null"}`);
    lines.push("related:");
    lines.push(`  adrs: [${(metadata.related?.adrs ?? []).join(", ")}]`);
    lines.push(`  lessons: [${(metadata.related?.lessons ?? []).join(", ")}]`);
    lines.push(`  kg_entries: [${(metadata.related?.kg_entries ?? []).join(", ")}]`);
    if (metadata.tags && metadata.tags.length > 0) {
      lines.push(`tags: [${metadata.tags.join(", ")}]`);
    }
    if (metadata.search_aliases && metadata.search_aliases.length > 0) {
      lines.push(`search_aliases: [${metadata.search_aliases.join(", ")}]`);
    }
    if (metadata.category) lines.push(`category: ${metadata.category}`);
  }

  lines.push("---", "");
  return lines.join("\n");
}

function nextAdrNumber(decisionsDir: string): number {
  if (!fs.existsSync(decisionsDir)) return 1;
  let max = 0;
  for (const f of fs.readdirSync(decisionsDir)) {
    const m = f.match(/^ADR-(\d+)-/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > max) max = n;
    }
  }
  return max + 1;
}

export function resolveTargetPath(
  kgPath: string,
  type: CaptureRequest["type"],
  metadata: CaptureRequest["metadata"]
): { dir: string; fileName: string; adrNumber?: number } {
  if (type === "lesson") {
    const subDir = metadata.category ? slugify(metadata.category) : "";
    const dir = subDir
      ? path.join(kgPath, "lessons-learned", subDir)
      : path.join(kgPath, "lessons-learned");
    return { dir, fileName: deriveFileName(type, metadata) };
  }

  if (type === "session") {
    const ym = todayIso().slice(0, 7);
    const dir = path.join(kgPath, "sessions", ym);
    return { dir, fileName: deriveFileName(type, metadata) };
  }

  if (type === "adr") {
    const decisionsDir = path.join(kgPath, "decisions");
    const adrNumber = nextAdrNumber(decisionsDir);
    return { dir: decisionsDir, fileName: deriveFileName(type, metadata, adrNumber), adrNumber };
  }

  return { dir: kgPath, fileName: `${slugify(metadata.title)}.md` };
}

export function checkExistingFile(
  type: CaptureRequest["type"],
  kgPath: string,
  metadata: CaptureRequest["metadata"]
): string | null {
  if (type !== "session") return null;
  const date = todayIso();
  const ym = date.slice(0, 7);
  const sessionDir = path.join(kgPath, "sessions", ym);
  if (!fs.existsSync(sessionDir)) return null;
  for (const f of fs.readdirSync(sessionDir)) {
    if (f.startsWith(date + "-") && f.endsWith(".md")) {
      return path.join(sessionDir, f);
    }
  }
  return null;
}

// issue-46 Manifestation A: metadata.title is now bare (no date/ADR-number
// prefix). README index entries previously got that prefix for free from the
// (buggy) doubled title; reconstruct a display title from type + the
// server-derived prefix instead of regressing to a bare title in the index.
export function displayTitleFor(
  type: CaptureRequest["type"],
  metadata: CaptureRequest["metadata"],
  adrNumber?: number
): string {
  if (type === "adr" && adrNumber !== undefined) {
    return `ADR-${String(adrNumber).padStart(3, "0")}: ${metadata.title}`;
  }
  if (type === "session") {
    return `${todayIso()}-${metadata.title}`;
  }
  return metadata.title;
}

export function updateReadmeIndex(
  indexPath: string,
  entry: { title: string; relativePath: string; description?: string }
): void {
  const line = `- [${entry.title}](${entry.relativePath})${entry.description ? ` — ${entry.description}` : ""}`;

  if (!fs.existsSync(indexPath)) {
    fs.writeFileSync(indexPath, `# Index\n\n${line}\n`, "utf-8");
    return;
  }

  let content = fs.readFileSync(indexPath, "utf-8");
  if (content.includes(entry.relativePath)) return;
  content = content.trimEnd() + "\n" + line + "\n";
  fs.writeFileSync(indexPath, content, "utf-8");
}

export async function handleCapture(
  request: CaptureRequest,
  targetKg?: string,
  interaction?: InteractionMode,
  personalScopeSession: PersonalScopeSession = new PersonalScopeSession(),
  scopeOpts?: { sticky?: boolean; confirmPersonalScope?: boolean; confirmFirstUse?: boolean; scope?: "project" | "user" },
  workspaceRoot?: string,
  toolCallMeta?: Record<string, unknown>
): Promise<CaptureResponse | CaptureError> {
  // Validate metadata
  const validated = validateMetadata(request.metadata);
  if ("error" in validated) return validated as CaptureError;

  // issue-46 Manifestation A: reject an already-prefixed title before any
  // filename is derived or byte written.
  const prefixError = checkTitlePrefix(request.type, request.metadata.title);
  if (prefixError) return prefixError;

  const config = readConfig();
  const mode = resolveInteractionMode({ explicitParam: interaction }).mode;
  const automated = mode === "automated";
  const cwd = resolveEffectiveCwd({ processCwd: process.cwd(), toolCallMeta, workspaceRootParam: workspaceRoot });
  let kgPath: string;
  let resolvedKgName: string;
  let notice: string | undefined;

  // ADR-067 Task 6.3 (spec §11): strip a leading [personal]/[project] marker
  // from the title before it's used for filename/frontmatter generation.
  const { marker, remainder } = parseScopeMarker(request.metadata.title);
  if (marker !== null) request.metadata.title = remainder;

  let effectiveTargetKg = targetKg;
  if (!targetKg && scopeOpts?.scope === "user") {
    // Explicit structured scope:"user" (consistency with kg_search/
    // kg_config_add_category/kg_fts5_status/kg_fts5_rebuild/kg_upgrade, all
    // of which already have this param) -- takes priority over marker
    // inference since it's an explicit signal, not a free-text guess.
    // Reuses the same personal-graph lookup the [personal] marker path
    // below uses; the confirmPersonalScopeAccess gate further down keys off
    // the resolved graph's type, not how it was reached, so this is gated
    // identically to the marker/targetKg paths.
    const personal = resolvePersonalGraph(config);
    if ("error" in personal) return { error: "VALIDATION_ERROR", message: personal.error };
    effectiveTargetKg = personal.name;
  } else if (!targetKg) {
    if (marker !== null && !automated) {
      if (scopeOpts?.sticky !== undefined) {
        personalScopeSession.applyMarker(marker, scopeOpts.sticky);
      } else {
        const gated = await gate({
          mode,
          reason: "personal_scope_marker_sticky",
          param: "sticky",
          accepts: ["one-shot", "sticky"],
          // No real blocking ask() transport exists yet at this layer (spec §12)
          // -- matches every other gate() call site in this file/resolution.ts
          // that has no real interactive transport yet.
          timeoutMs: STUB_ASK_TIMEOUT_MS,
          ask: stubAsk,
        });
        if (!("answer" in gated)) return gateResultToCaptureError(gated);
        personalScopeSession.applyMarker(marker, gated.answer === "sticky");
      }
    }

    // spec §11: "no read/write asymmetry" -- evaluated unconditionally (not
    // just when a marker was present this call) so a scope set sticky by an
    // earlier call (via kg_search or kg_capture, same shared session) still
    // applies here.
    const effectiveScope = personalScopeSession.currentScopeFor(automated);
    if (effectiveScope === "personal") {
      const personal = resolvePersonalGraph(config);
      if ("error" in personal) return { error: "VALIDATION_ERROR", message: personal.error };
      effectiveTargetKg = personal.name;
    }
  }

  if (effectiveTargetKg) {
    // Explicit target KG: resolve by exact name, skip CWD check (intentional
    // user choice). resolveGraph's exact-name branch never scans the
    // filesystem or falls back to cwd, matching the old direct-lookup
    // behavior (ADR-067 Task 1.8).
    const resolution = resolveGraph(config, cwd, effectiveTargetKg);
    if (resolution.kind === "not-registered") {
      return {
        error: "VALIDATION_ERROR",
        message: `Unknown KG name: "${effectiveTargetKg}". Check /kmgraph:status for registered KGs.`,
      };
    }
    // resolved/fuzzy-match/archived/merged (ambiguous-tie/no-graph-in-cwd
    // can't arise from an exact-name lookup): route through the shared
    // gate() logic -- fuzzy-match asks "which of these did you mean" via
    // gate(), same as ambiguous-tie's cwd-resolution path.
    const resolved = await resolveKgOutcome(config, resolution, mode, cwd);
    if ("error" in resolved) return resolved;
    kgPath = resolved.kgPath;
    resolvedKgName = resolved.resolvedKgName;
    notice = resolved.notice;
  } else {
    const resolution = resolveGraph(config, cwd);
    const resolved = await resolveKgOutcome(config, resolution, mode, cwd);
    if ("error" in resolved) return resolved;
    kgPath = resolved.kgPath;
    resolvedKgName = resolved.resolvedKgName;
    notice = resolved.notice;
  }

  // ADR-067 Task 6.4 (spec §7): a "pending" graph (freshly registered via
  // kg_config_init, not yet confirmed) must not silently take its first
  // write -- gate before any file touches disk. Only a confirmed answer
  // (interactive "yes", or automated confirmFirstUse:true) flips it "active";
  // anything else propagates a structured error and leaves the graph pending.
  if (config.graphs[resolvedKgName]?.status === "pending") {
    const confirmedFirstWrite = await confirmFirstWrite(config, resolvedKgName, {
      mode,
      confirmFirstUse: scopeOpts?.confirmFirstUse,
      // No real blocking ask() transport exists yet at this layer (spec §12)
      // -- matches every other gate() call site in this file/resolution.ts.
      timeoutMs: STUB_ASK_TIMEOUT_MS,
      ask: stubAsk,
    });
    if (!("config" in confirmedFirstWrite)) return confirmedFirstWrite as CaptureError;
    writeConfig(confirmedFirstWrite.config);
  }

  // spec §11: confirmPersonalScopeAccess gates every scope:"user" write
  // reachable here, whether it arrived via an explicit targetKg naming a
  // personal-type graph or a resolved [personal] marker -- symmetric with
  // the read-side gate in search.ts.
  if ((config.graphs[resolvedKgName]?.type ?? "project-local") === "personal") {
    const confirmed = await confirmPersonalScopeAccess(personalScopeSession, cwd, {
      confirmPersonalScope: scopeOpts?.confirmPersonalScope,
      mode,
      timeoutMs: STUB_ASK_TIMEOUT_MS,
      ask: stubAsk,
    });
    if (!("confirmed" in confirmed)) return confirmed as CaptureError;
  }

  // Update-in-place path
  if (request.metadata.existingFile) {
    const existing = path.resolve(request.metadata.existingFile);
    const normalizedKgRoot = kgPath.endsWith(path.sep) ? kgPath : kgPath + path.sep;
    if (existing !== kgPath && !existing.startsWith(normalizedKgRoot)) {
      return { error: "IO_ERROR", message: `existingFile path is outside the active knowledge graph: ${existing}` };
    }
    if (!fs.existsSync(existing)) {
      return { error: "IO_ERROR", message: `existingFile not found: ${existing}` };
    }
    try {
      fs.writeFileSync(
        existing,
        generateFrontmatter(request.type, request.metadata) + stripLeadingFrontmatter(request.content),
        "utf-8"
      );
      let indexResult: Record<string, unknown> = {};
      try {
        const kgName = resolvedKgName;
        const kgType = config.graphs[kgName]?.type ?? "project-local";
        indexResult = rebuildIndex(kgPath, kgName, kgType) as unknown as Record<string, unknown>;
      } catch { /* best-effort */ }
      return { status: "updated", filePath: existing, relativePath: path.relative(kgPath, existing), indexResult, notice };
    } catch (err: unknown) {
      return { error: "IO_ERROR", message: err instanceof Error ? err.message : String(err) };
    }
  }

  // Conflict check for sessions
  if (request.type === "session") {
    const conflict = checkExistingFile(request.type, kgPath, request.metadata);
    if (conflict) {
      return {
        error: "CONFLICT",
        message: `Session file already exists for today: ${path.relative(kgPath, conflict)}. Pass existingFile to update in place.`,
      };
    }
  }

  // Resolve target path
  const { dir, fileName, adrNumber } = resolveTargetPath(kgPath, request.type, request.metadata);

  // Create directory if needed
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  } catch (err: unknown) {
    return {
      error: "IO_ERROR",
      message: `Failed to create directory ${dir}: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  const filePath = path.join(dir, fileName);

  // Write file
  try {
    fs.writeFileSync(filePath, generateFrontmatter(request.type, request.metadata) + stripLeadingFrontmatter(request.content), "utf-8");
  } catch (err: unknown) {
    return { error: "IO_ERROR", message: `Failed to write file: ${err instanceof Error ? err.message : String(err)}` };
  }

  // Update README index (best-effort)
  try {
    let readmePath: string;
    if (request.type === "lesson") {
      readmePath = path.join(kgPath, "lessons-learned", "README.md");
    } else if (request.type === "session") {
      readmePath = path.join(kgPath, "sessions", "README.md");
    } else {
      readmePath = path.join(kgPath, "decisions", "README.md");
    }
    updateReadmeIndex(readmePath, {
      title: displayTitleFor(request.type, request.metadata, adrNumber),
      relativePath: path.relative(path.dirname(readmePath), filePath),
    });
  } catch { /* best-effort */ }

  // FTS5 rebuild (in-process, best-effort)
  let indexResult: Record<string, unknown> = {};
  try {
    const kgName = resolvedKgName;
    const kgType = config.graphs[kgName]?.type ?? "project-local";
    indexResult = rebuildIndex(kgPath, kgName, kgType) as unknown as Record<string, unknown>;
  } catch { /* absent if node-sqlite3-wasm not installed */ }

  return {
    status: "created",
    filePath,
    relativePath: path.relative(kgPath, filePath),
    indexResult,
    notice,
  };
}

export function registerCaptureTool(server: McpServer, personalScopeSession: PersonalScopeSession): void {
  server.tool(
    "kg_capture",
    "Write a lesson, session summary, or ADR to a knowledge graph. " +
      "Defaults to the active KG. Pass targetKg to write to a named KG (e.g., a global personal KG). " +
      "metadata.title may start with a [personal] or [project] marker to steer this call's " +
      "(and optionally this session's) scope toward the personal or project-local knowledge graph. " +
      "Handles file naming, frontmatter generation, directory routing, README index update, " +
      "and FTS5 rebuild automatically. Returns KG_MISMATCH error when CWD is outside the active KG root " +
      "(bypassed when targetKg is specified).",
    {
      content: z.string().describe("Full markdown body of the lesson, session summary, or ADR"),
      type: z
        .enum(["lesson", "session", "adr"])
        .describe("Entry type: determines directory routing and frontmatter template"),
      metadata: z
        .object({
          title: z
            .string()
            .describe(
              "Bare title, no date or ADR-number prefix — this tool derives and owns all " +
                "filename/frontmatter prefixing. A pre-prefixed title (session: 'YYYY-MM-DD-...', " +
                "adr: 'ADR-NNN...') is rejected with VALIDATION_ERROR rather than double-prepended."
            ),
          category: z
            .string()
            .optional()
            .describe("Subdirectory routing (architecture, debugging, process, patterns)"),
          tags: z.array(z.string()).optional().describe("Searchability tags"),
          git: z
            .object({
              branch: z.string().optional(),
              commit: z.string().optional(),
              commit_short: z.string().optional(),
              author: z.string().optional(),
              email: z.string().optional(),
              pr: z.string().nullable().optional().describe("adr type only: PR number or null"),
              issue: z.string().nullable().optional().describe("adr type only: issue number or null"),
            })
            .optional()
            .describe("Git context metadata"),
          version: z.string().optional().describe("Version string for updates to existing files"),
          existingFile: z
            .string()
            .optional()
            .describe("Absolute path to existing file for update-in-place"),
          as_of_commit: z
            .string()
            .optional()
            .describe("session type only: short commit hash for the update-in-place header"),
          last_updated: z
            .string()
            .optional()
            .describe("session type only: timestamp for the update-in-place header"),
          status: z.string().optional().describe("adr type only: Proposed|Accepted|Deprecated|Superseded"),
          number: z.number().optional().describe("adr type only: ADR sequential number"),
          implements: z.string().nullable().optional().describe("adr type only: version or feature this ADR applies to"),
          related: z
            .object({
              adrs: z.array(z.string()).optional(),
              lessons: z.array(z.string()).optional(),
              kg_entries: z.array(z.string()).optional(),
            })
            .optional()
            .describe("adr type only: linked ADRs/lessons/KG entries"),
          search_aliases: z.array(z.string()).optional().describe("adr type only: alternate search terms"),
        })
        .describe("Entry metadata"),
      targetKg: z
        .string()
        .optional()
        .describe(
          "Named KG to write to (from kg-config.json). Use for global/personal KG captures. " +
            "If omitted, writes to the active KG. CWD alignment check is skipped when targetKg is set."
        ),
      interaction: z
        .enum(["interactive", "automated"])
        .optional()
        .describe(
          "Overrides auto-detected interaction mode. Automated callers receive a structured " +
            "KMG_INPUT_REQUIRED error (never a blocking question) when resolution is ambiguous."
        ),
      sticky: z
        .boolean()
        .optional()
        .describe(
          "When metadata.title has a [personal]/[project] marker, whether the resulting scope " +
            "should persist for the rest of this session (true) or apply to this call only " +
            "(false). Required to resolve a marker without a blocking question."
        ),
      scope: z
        .enum(["project", "user"])
        .optional()
        .describe(
          "project (default, cwd-resolved) or user (the personal knowledge graph). Consistent " +
            "with kg_search/kg_config_add_category/kg_fts5_status/kg_fts5_rebuild/kg_upgrade's " +
            "scope param. Ignored when targetKg is given; alternative to a [personal] marker."
        ),
      confirmPersonalScope: z
        .boolean()
        .optional()
        .describe(
          "Confirms this repo may write to the personal knowledge graph. Required once per " +
            "process before a personal-scope write is honored for a repo not yet confirmed."
        ),
      confirmFirstUse: z
        .boolean()
        .optional()
        .describe(
          "Confirms this is a legitimate first write to a newly-registered (pending) knowledge " +
            "graph. Required once per graph before its first write is honored."
        ),
      workspaceRoot: z
        .string()
        .optional()
        .describe(
          "Explicit cwd override for clients whose process cwd doesn't reflect the caller's " +
            "actual workspace (e.g. a plugin install path). Falls back to the MCP _meta " +
            "sandboxCwd signal (Codex), then this param, then process.cwd()."
        ),
    },
    async ({ content, type, metadata, targetKg, interaction, sticky, confirmPersonalScope, confirmFirstUse, scope, workspaceRoot }, extra) => {
      const result = await handleCapture(
        { content, type, metadata },
        targetKg,
        interaction,
        personalScopeSession,
        { sticky, confirmPersonalScope, confirmFirstUse, scope },
        workspaceRoot,
        extra?._meta as Record<string, unknown> | undefined
      );
      if ("error" in result) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
          isError: true,
        };
      }
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    }
  );
}
