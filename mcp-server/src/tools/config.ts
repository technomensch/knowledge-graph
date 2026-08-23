import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { execFileSync } from "child_process";
import {
  readConfig,
  writeConfig,
  updateConfig,
  getPluginRoot,
  mintGraphId,
  writeGraphIdMarker,
  readGraphIdMarker,
  findRegistryEntryByGraphId,
  isMarkerTracked,
  remintGraphIdMarker,
  changeGraphStatus,
  CONFIG_PATH,
  KgConfig,
  GraphConfig,
  GraphStatus,
  CategoryConfig,
} from "../utils.js";
import { hashDirectory, compareFileSets } from "../graph-compare.js";
import {
  resolveGraph,
  resolvePersonalGraph,
  isHomeOrRootCwd,
  isAncestorOrEqual,
  PersonalScopeSession,
  confirmPersonalScopeAccess,
} from "../resolution.js";
import { resolveInteractionMode, gate, InteractionMode, InputRequiredError, STUB_ASK_TIMEOUT_MS, requireInput, stubAsk } from "../interaction.js";
import { resolveEffectiveCwd } from "../platform-cwd.js";

// ── Four-answer duplicate-graphId prompt (Task 4.4, spec §9) ─────────────────

export type DuplicateGraphIdAnswer = "reattach" | "worktree" | "fork" | "decline";

export interface DuplicateGraphIdContext {
  existingName: string;
  existingPath: string;
  newPath: string;
  sameOrigin: boolean; // captured origin URL comparison, ordering signal only
}

// Suggests which of the 4 answers to lead with; never auto-picks -- the
// caller still presents all 4 and waits for an explicit choice. Same git
// remote origin on both sides is the strongest signal this is the same
// project relocated (reattach); anything else defaults to the
// non-identity-mutating option (worktree) rather than assuming a fork.
export function classifyDuplicateSuggestion(ctx: DuplicateGraphIdContext): DuplicateGraphIdAnswer {
  return ctx.sameOrigin ? "reattach" : "worktree";
}

// True iff the two content directories have any diverged or one-sided file
// -- a pure re-point with nothing captured yet (identical or moved-only)
// returns false.
export function hasDivergentContent(existingContentDir: string, newContentDir: string): boolean {
  const comparisons = compareFileSets(hashDirectory(existingContentDir), hashDirectory(newContentDir));
  return comparisons.some((c) => c.category === "diverged" || c.category === "unique-a" || c.category === "unique-b");
}

function getGitOriginUrl(dir: string): string | undefined {
  try {
    return (
      execFileSync("git", ["config", "--get", "remote.origin.url"], { cwd: dir, stdio: ["ignore", "pipe", "ignore"] })
        .toString()
        .trim() || undefined
    );
  } catch {
    return undefined;
  }
}

function markerTrackingWarning(contentDir: string): string {
  return isMarkerTracked(contentDir) === false
    ? `\nWarning: .kmgraph-id is gitignored at ${contentDir} -- duplicate/fork detection is silently disabled for this KG until it's tracked.`
    : "";
}

// ── Dry-run + backup for the "reattach" merge path (Task 4.5, spec §9) ───────

export interface MergePreview {
  losingName: string;
  survivorName: string;
  losingPath: string;
  survivorPath: string;
  losingStatus: GraphStatus;
  willArchive: true;
  willSetMergedInto: string;
}

export function buildMergePreview(
  config: KgConfig,
  losingName: string,
  survivorName: string
): MergePreview {
  const losing = config.graphs[losingName];
  const survivor = config.graphs[survivorName];
  if (!losing || !survivor) {
    throw new Error(`buildMergePreview: unknown graph name(s) '${losingName}'/'${survivorName}'`);
  }
  return {
    losingName,
    survivorName,
    losingPath: losing.path,
    survivorPath: survivor.path,
    losingStatus: losing.status,
    willArchive: true,
    willSetMergedInto: survivorName,
  };
}

function backupConfigFromDisk(): string {
  // Read CONFIG_PATH's actual on-disk bytes — not a re-serialization of
  // whatever in-memory `config` object the caller passed in, which can
  // diverge from disk (stale read, concurrent writer, test-constructed
  // object). The backup's job is "what was really there," which only the
  // file itself can answer (findings doc #10).
  const backupDir = path.join(path.dirname(CONFIG_PATH), "backups");
  fs.mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, `kg-config-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  const onDiskBytes = fs.existsSync(CONFIG_PATH)
    ? fs.readFileSync(CONFIG_PATH)
    : Buffer.from("{}", "utf-8"); // no prior config on disk yet — back up an empty placeholder rather than throw
  fs.writeFileSync(backupPath, onDiskBytes);
  return backupPath;
}

export function performRegistryMerge(
  config: KgConfig,
  losingName: string,
  survivorName: string,
  opts: { skipReview?: boolean }
): { config: KgConfig; backupPath: string; preview?: MergePreview } {
  // Safety (backup) is unconditional — bypassing review must never bypass this.
  const backupPath = backupConfigFromDisk();

  if (!opts.skipReview) {
    // Friction (the review step) is the only thing `skipReview` may skip.
    // Without it, return a preview and do NOT apply the merge yet — the
    // caller (Task 4.4's "reattach" branch, via gate()) shows this to the
    // user and re-calls with skipReview: true only on explicit approval.
    return { config, backupPath, preview: buildMergePreview(config, losingName, survivorName) };
  }

  const updated = changeGraphStatus(config, losingName, "archived");
  updated.graphs[losingName].mergedInto = survivorName;

  return { config: updated, backupPath };
}

// ── First-time-repo confirmation: "pending" -> "active" (Task 6.4, spec §7) ──

// A freshly-registered graph (kg_config_init mints new entries with
// status:"pending" -- Task 1.9 Step 7.5) must not silently take its first
// write. Only an explicit confirmation (automated: confirmFirstUse:true;
// interactive: a "yes" answer through gate()) flips it "active" -- anything
// else (a "no" answer, decline, cancel, or a gate timeout) leaves the graph
// "pending" and returns a structured error, never a silent write. This
// protects against a prompt-injection payload in a freshly-cloned untrusted
// repo trying to get the assistant to write into it unnoticed.
export async function confirmFirstWrite(
  config: KgConfig,
  name: string,
  opts: { mode: InteractionMode; confirmFirstUse?: boolean; ask: () => Promise<string>; timeoutMs?: number }
): Promise<{ config: KgConfig } | InputRequiredError> {
  if (opts.mode === "automated") {
    if (!opts.confirmFirstUse) {
      return requireInput("first_time_repo", "confirmFirstUse");
    }
    const updated = changeGraphStatus(config, name, "active");
    updated.graphs[name].confirmedBy = "automated";
    return { config: updated };
  }

  const gated = await gate({
    mode: opts.mode,
    reason: "first_time_repo",
    param: "confirmFirstUse",
    accepts: ["yes", "no"],
    timeoutMs: opts.timeoutMs,
    // Adapts the plain string-returning ask() this function's callers use
    // (no real blocking elicitation transport exists at this layer yet,
    // spec §12) to gate()'s real AskResult-returning signature.
    ask: async () => ({ status: "answered" as const, answer: await opts.ask() }),
  });
  if ("error" in gated) return gated; // timeout -- leaves the graph pending, no write
  if (!("answer" in gated) || gated.answer !== "yes") {
    return requireInput("first_time_repo", "confirmFirstUse", ["yes", "no"]);
  }
  const updated = changeGraphStatus(config, name, "active");
  updated.graphs[name].confirmedBy = "interactive";
  return { config: updated };
}

// ── Broad-ancestor / $HOME / root registration guard (findings doc #21) ──────

export function isHardBlockedRegistrationPath(kgPath: string): boolean {
  return isHomeOrRootCwd(kgPath.replace(/^~/, os.homedir()));
}

export function findBroadAncestorWarning(
  config: KgConfig,
  kgPath: string
): { isAncestorOfCount: number; ancestorOfNames: string[] } | null {
  const candidate = kgPath.replace(/^~/, os.homedir());
  const ancestorOfNames = Object.entries(config.graphs)
    .filter(([, g]) => g.status !== "deleted")
    .filter(([, g]) => {
      const existingPath = g.path.replace(/^~/, os.homedir());
      return existingPath !== candidate && isAncestorOrEqual(candidate, existingPath);
    })
    .map(([name]) => name);
  if (ancestorOfNames.length === 0) return null;
  return { isAncestorOfCount: ancestorOfNames.length, ancestorOfNames };
}

// ── Shared init scaffold (ENH-051 dedup, ADR-067 Task 8.2) ────────────────────
//
// cli.ts's interactive setup wizard and this file's kg_config_init handler
// each build a brand-new graph's on-disk layout the same way: expand the
// path, run both registration guards, create the standard directory tree,
// and best-effort-copy the default templates. Task 4.1 landed the guard
// calls directly in cli.ts before this dedup could happen (it couldn't wait);
// this collapses that into one shared implementation. What's deliberately
// NOT shared is how each caller reacts to a hard-block or a broad-ancestor
// warning -- cli.ts drives a synchronous readline confirm loop, kg_config_init
// drives an async gate() with automated/interactive modes -- so only the
// deterministic path-resolution/guard-check/scaffold steps live here.

export interface RegistrationGuardCheck {
  expandedPath: string;
  hardBlocked: boolean;
  broadWarning: { isAncestorOfCount: number; ancestorOfNames: string[] } | null;
}

export function resolveRegistrationGuard(config: KgConfig, kgPath: string): RegistrationGuardCheck {
  const expandedPath = kgPath.replace(/^~/, os.homedir());
  return {
    expandedPath,
    hardBlocked: isHardBlockedRegistrationPath(expandedPath),
    broadWarning: findBroadAncestorWarning(config, expandedPath),
  };
}

// Creates the standard graph directory tree at `expandedPath` and
// best-effort-copies the default templates from core/default-templates/ over
// it (never overwriting a file that already exists there). Returns how many
// template files were actually copied, purely for caller-side reporting.
export function scaffoldGraphDirectory(
  expandedPath: string,
  categories: Array<{ name: string }>
): number {
  const dirs = ["concepts", "templates", "lessons-learned", "decisions", "sessions", "chat-history", "tmp"];
  for (const dir of dirs) {
    fs.mkdirSync(path.join(expandedPath, dir), { recursive: true });
  }
  for (const cat of categories) {
    fs.mkdirSync(path.join(expandedPath, "lessons-learned", cat.name), { recursive: true });
  }

  const pluginRoot = getPluginRoot();
  const templateSrc = path.join(pluginRoot, "core", "default-templates");
  let templatesCopied = 0;
  if (!fs.existsSync(templateSrc)) return templatesCopied;

  const copyIfMissing = (src: string, dest: string): void => {
    if (fs.existsSync(src) && !fs.existsSync(dest)) {
      fs.copyFileSync(src, dest);
      templatesCopied++;
    }
  };

  // KG content templates + starter templates all deploy into templates/
  // (ADR-040), never into their corresponding live dirs -- matches
  // commands/kmg-init-shared/kmg-template-seed.md exactly.
  const conceptTemplates = ["patterns.md", "gotchas.md", "concepts.md", "architecture.md", "workflows.md"];
  for (const t of conceptTemplates) {
    copyIfMissing(path.join(templateSrc, "concepts", "templates", t), path.join(expandedPath, "templates", t));
  }
  copyIfMissing(
    path.join(templateSrc, "concepts", "entry-template.md"),
    path.join(expandedPath, "templates", "entry-template.md")
  );

  // READMEs stay in their live dirs (orientation files, not starters).
  copyIfMissing(path.join(templateSrc, "lessons-learned", "README.md"), path.join(expandedPath, "lessons-learned", "README.md"));
  copyIfMissing(path.join(templateSrc, "decisions", "README.md"), path.join(expandedPath, "decisions", "README.md"));

  // Starter templates deploy to templates/, not into their live dirs.
  copyIfMissing(
    path.join(templateSrc, "lessons-learned", "lesson-template.md"),
    path.join(expandedPath, "templates", "lesson-template.md")
  );
  copyIfMissing(
    path.join(templateSrc, "decisions", "ADR-template.md"),
    path.join(expandedPath, "templates", "ADR-template.md")
  );
  copyIfMissing(
    path.join(templateSrc, "sessions", "session-template.md"),
    path.join(expandedPath, "templates", "session-template.md")
  );

  // Root-level profile files come from the project profile starters under
  // concepts/templates/project/, NOT concepts/{me,rules,triggers}.md --
  // those are different (longer) files. copyIfMissing (skip-if-exists) is
  // kept for all four here, including me.md -- unlike the wizard, which
  // unconditionally overwrites me.md. This function's own doc-comment says
  // it never overwrites, so that contract stays consistent; the wizard's
  // unconditional me.md overwrite is an intentional, accepted divergence.
  copyIfMissing(path.join(templateSrc, "concepts", "templates", "project", "me.md"), path.join(expandedPath, "me.md"));
  copyIfMissing(path.join(templateSrc, "concepts", "templates", "project", "rules.md"), path.join(expandedPath, "rules.md"));
  copyIfMissing(path.join(templateSrc, "concepts", "templates", "project", "triggers.md"), path.join(expandedPath, "triggers.md"));
  copyIfMissing(path.join(templateSrc, "concepts", "kg-index.md"), path.join(expandedPath, "index.md"));

  copyIfMissing(
    path.join(templateSrc, "concepts", "kg-category-index.md"),
    path.join(expandedPath, "concepts", "kg-category-index.md")
  );

  return templatesCopied;
}

// ── Shared graph-registration write (Task A, kg_upgrade connect-unregistered-graph) ──
//
// The final "commit this graph to the registry" step of kg_config_init's
// scaffold path -- build the GraphConfig entry, insert it into
// config.graphs[name], persist via writeConfig(config). Split out so
// kg_upgrade's connect-unregistered-graph category (upgrade.ts) can register
// an already-populated, unregistered folder without duplicating this
// sequence.
//
// Deliberately narrow: it takes an already-decided graphId as a parameter
// rather than deciding mint-vs-reuse itself, because the two callers need
// genuinely different marker semantics -- handleConfigInit treats ANY
// pre-existing marker on a fresh-scaffold target as a hard conflict and
// refuses (see config.test.ts's "Opus review SF-4" test: an orphaned marker
// -- present on disk, graphId not found in the registry -- still errors
// there, it is never reused). kg_upgrade's connect flow is the opposite
// case: it never scaffolds, it only attaches a registry entry to content
// that already exists, so an orphaned marker there is presumptively that
// content's own prior identity and IS reused on purpose. Both callers keep
// their own mint/reuse/writeGraphIdMarker logic; only the config-entry write
// itself is shared here.
export function registerGraphConfig(
  config: KgConfig,
  params: {
    name: string;
    kgPath: string;
    type: "project-local" | "personal" | "custom";
    categories: CategoryConfig[];
    graphId: string;
  }
): GraphConfig {
  const now = new Date().toISOString();
  const graphConfig: GraphConfig = {
    name: params.name,
    path: params.kgPath,
    type: params.type,
    categories: params.categories,
    createdAt: now,
    status: "pending",
    statusChangedAt: now,
    graphId: params.graphId,
  };
  config.graphs[params.name] = graphConfig;
  writeConfig(config);
  return graphConfig;
}

// ── Exported handler for direct testing ──────────────────────────────────────

export interface HandleConfigInitParams {
  name: string;
  kgPath: string;
  type: "project-local" | "personal" | "custom";
  categories: Array<{ name: string; prefix: string | null; git: "commit" | "ignore" }>;
  interaction?: "interactive" | "automated";
  // Real answer to the "merge_preview" gate below, not a blind bypass
  // boolean (spec §12's "reject bare confirm: true" pattern): the only
  // choice it stands in for is proceed-or-not on an already-identified
  // losing/survivor pair, once the four-answer prompt already picked
  // "reattach". Consumed only inside that specific gate.
  confirmMerge?: boolean;
  // Real answer to the "broad_ancestor_registration" gate below -- consumed
  // only when findBroadAncestorWarning fires, same pattern as confirmMerge.
  confirmBroadRegistration?: "yes" | "no";
}

export interface HandleConfigInitResult {
  [x: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  isError?: true;
}

export async function handleConfigInit({ name, kgPath, type, categories, interaction, confirmMerge, confirmBroadRegistration }: HandleConfigInitParams): Promise<HandleConfigInitResult> {
  const config = readConfig();

  // Validate name doesn't exist
  if (config.graphs[name]) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Error: Knowledge graph '${name}' already exists at ${config.graphs[name].path}. Knowledge graphs resolve automatically from your current directory -- cd into ${config.graphs[name].path} (or a subdirectory of it) to work against it, no separate activation step needed.`,
        },
      ],
      isError: true,
    };
  }

  // Expand path + run both registration guards (shared with cli.ts, ENH-051)
  const { expandedPath, hardBlocked, broadWarning } = resolveRegistrationGuard(config, kgPath);

  if (hardBlocked) {
    return {
      content: [{
        type: "text" as const,
        text: `Error: refusing to register a knowledge graph at ${expandedPath} — this is your home directory or the filesystem root. Registering a KG this broad would make it resolve as "the KG for" nearly every directory on this machine. Choose a more specific project path.`,
      }],
      isError: true,
    };
  }

  if (broadWarning) {
    let broadAnswer = confirmBroadRegistration;
    if (!broadAnswer) {
      const mode = resolveInteractionMode({ explicitParam: interaction }).mode;
      const gated = await gate({
        mode,
        reason: "broad_ancestor_registration",
        param: "confirmBroadRegistration",
        accepts: ["yes", "no"],
        detail: broadWarning,
        timeoutMs: STUB_ASK_TIMEOUT_MS,
        ask: stubAsk, // no real ask() transport yet, same pattern as every other gate() stub in this plan
      });
      if ("error" in gated) {
        return { content: [{ type: "text" as const, text: JSON.stringify(gated) }], isError: true };
      }
      if (!("answer" in gated)) {
        return {
          content: [{
            type: "text" as const,
            text: `Registration cancelled: ${expandedPath} is an ancestor of ${broadWarning.isAncestorOfCount} already-registered graph(s) (${broadWarning.ancestorOfNames.join(", ")}). Confirm explicitly (confirmBroadRegistration: "yes") if this breadth is intentional.`,
          }],
          isError: true,
        };
      }
      broadAnswer = gated.answer as "yes" | "no";
    }
    if (broadAnswer !== "yes") {
      return {
        content: [{
          type: "text" as const,
          text: `Registration cancelled: ${expandedPath} is an ancestor of ${broadWarning.isAncestorOfCount} already-registered graph(s) (${broadWarning.ancestorOfNames.join(", ")}). Confirm explicitly (confirmBroadRegistration: "yes") if this breadth is intentional.`,
        }],
        isError: true,
      };
    }
  }

  // ── Duplicate graphId detection (Task 4.4, spec §9, findings #6/#18/#20) ──
  const preExistingMarkerId = readGraphIdMarker(expandedPath);
  if (preExistingMarkerId) {
    const existingEntry = findRegistryEntryByGraphId(config, preExistingMarkerId);
    if (existingEntry) {
      const existingContentDir = existingEntry.graph.path.replace(/^~/, os.homedir());
      const divergent = hasDivergentContent(existingContentDir, expandedPath);

      if (!divergent) {
        // Dominant real-world case: a fresh clone of an already-registered
        // repo with nothing captured in it yet. Silently re-point instead
        // of asking (findings doc #20).
        if (existingContentDir !== expandedPath) {
          updateConfig((cfg) => {
            cfg.graphs[existingEntry.name].path = kgPath;
            return cfg;
          });
        }
        return {
          content: [{
            type: "text" as const,
            text: `'${existingEntry.name}' is already registered with this content (graphId ${preExistingMarkerId}); re-pointed to ${kgPath}.`,
          }],
        };
      }

      const existingOrigin = existingEntry.graph.originUrl ?? getGitOriginUrl(existingContentDir);
      const newOrigin = getGitOriginUrl(expandedPath);
      const suggestion = classifyDuplicateSuggestion({
        existingName: existingEntry.name,
        existingPath: existingContentDir,
        newPath: expandedPath,
        sameOrigin: existingOrigin !== undefined && existingOrigin === newOrigin,
      });
      const allAnswers: DuplicateGraphIdAnswer[] = ["reattach", "worktree", "fork", "decline"];
      const orderedAnswers = [suggestion, ...allAnswers.filter((a) => a !== suggestion)];

      const mode = resolveInteractionMode({ explicitParam: interaction }).mode;
      const gated = await gate({
        mode,
        reason: "duplicate_graph_id",
        param: "canonicalPath",
        accepts: orderedAnswers,
        detail: {
          existingName: existingEntry.name,
          existingContentDir,
          newPath: expandedPath,
          sameOrigin: existingOrigin !== undefined && existingOrigin === newOrigin,
          suggestedAnswer: suggestion,
        },
        timeoutMs: STUB_ASK_TIMEOUT_MS,
        ask: stubAsk, // no real ask() transport yet, same pattern as every other gate() stub in this plan
      });

      if ("error" in gated) {
        return { content: [{ type: "text" as const, text: JSON.stringify(gated) }], isError: true };
      }
      if ("declined" in gated || "cancelled" in gated) {
        return {
          content: [{
            type: "text" as const,
            text: `Registration cancelled: duplicate graphId at ${expandedPath} was not resolved.`,
          }],
          isError: true,
        };
      }

      const answer = gated.answer as DuplicateGraphIdAnswer;
      switch (answer) {
        case "reattach": {
          // Registry-pointer-only merge (spec §9, Task 4.5): the attempted
          // new registration never becomes a standalone active entry -- it's
          // created as a pending placeholder, then immediately merged into
          // the existing entry (archived, mergedInto set), with a mandatory
          // pre-merge backup and an explicit approval gate in between.
          const now = new Date().toISOString();
          config.graphs[name] = {
            name,
            path: kgPath,
            type,
            categories: categories as CategoryConfig[],
            createdAt: now,
            status: "pending",
            statusChangedAt: now,
            graphId: preExistingMarkerId,
            // NOTE (Phase 4 final review finding I-6, not yet fixed): duplicateOf is recorded here but
            // nothing currently reads it. The plan's Task 4.4 spec says this should suppress future
            // duplicate-graphId prompts for this exact pair -- that suppression logic doesn't exist yet.
            // A future task should check for an existing duplicateOf edge between the two entries before
            // firing the four-answer prompt again.
            duplicateOf: existingEntry.name,
          };

          // Preview-only call -- computes the MergePreview shown to the user via the gate's
          // `detail` and takes its own backup (M-2: harmless duplicate here, since nothing
          // changes between this call and the final apply below). Its backupPath is not the
          // one that matters for recovery, so it's intentionally not carried into the success
          // message -- only the final apply's backup is.
          const { preview } = performRegistryMerge(config, name, existingEntry.name, {});

          // NOTE (Task 4.5 review finding I-2, not yet fixed): confirmMerge:true currently cannot
          // distinguish a real second-call approval (user already saw the merge_preview gate and
          // said "confirm") from a cold first call that happens to pass confirmMerge:true alongside
          // canonicalPath:"reattach". This is unreachable today because canonicalPath isn't wired
          // into HandleConfigInitParams/the zod schema yet -- automated mode always returns
          // KMG_INPUT_REQUIRED before reaching this branch. Once that plumbing lands, add a guard
          // here (e.g. require the caller to echo back a token/hash from the merge_preview response)
          // before trusting a bare confirmMerge:true.
          if (!confirmMerge) {
            const mode = resolveInteractionMode({ explicitParam: interaction }).mode;
            const gated = await gate({
              mode,
              reason: "merge_preview",
              param: "confirmMerge",
              accepts: ["confirm", "cancel"],
              detail: preview,
              timeoutMs: STUB_ASK_TIMEOUT_MS,
              ask: stubAsk, // no real ask() transport yet, same pattern as every other gate() stub in this plan
            });

            if ("error" in gated) {
              return { content: [{ type: "text" as const, text: JSON.stringify(gated) }], isError: true };
            }
            if (!("answer" in gated) || gated.answer !== "confirm") {
              // No write happened -- config.graphs[name] above only mutated
              // the in-memory `config` object, never persisted. The backup
              // taken by the preview-only performRegistryMerge call is
              // harmless: it captured pre-merge disk state that a cancel
              // leaves unchanged anyway.
              return {
                content: [{
                  type: "text" as const,
                  text: `Merge cancelled: '${name}' was not reattached to '${existingEntry.name}'.`,
                }],
                isError: true,
              };
            }
          }

          // I-4: goes through updateConfig (Phase 2's fixed-merge-base / bounded-retry
          // concurrency protection) rather than a raw writeConfig, matching the pattern
          // handleConfigRemintId already uses. Backup is taken once, before the retryable
          // mutator, per the same unconditional-backup discipline performRegistryMerge's
          // skipReview branch itself follows -- the mutation logic below mirrors that
          // branch's `changeGraphStatus` + `mergedInto` steps directly against the working
          // copy `updateConfig` hands the mutator (mutated in place, not reassigned), since
          // that's the object `updateConfig` diffs against disk on each retry attempt.
          const finalBackupPath = backupConfigFromDisk();
          updateConfig((cfg) => {
            cfg.graphs[name] = {
              name,
              path: kgPath,
              type,
              categories: categories as CategoryConfig[],
              createdAt: now,
              status: "pending",
              statusChangedAt: now,
              graphId: preExistingMarkerId,
              duplicateOf: existingEntry.name,
            };
            changeGraphStatus(cfg, name, "archived");
            cfg.graphs[name].mergedInto = existingEntry.name;
            return cfg;
          });
          return {
            content: [{
              type: "text" as const,
              text: `Reattached: '${name}' merged into '${existingEntry.name}' (backup at ${finalBackupPath}).`,
            }],
          };
        }
        case "worktree": {
          const now = new Date().toISOString();
          updateConfig((cfg) => {
            cfg.graphs[name] = {
              name,
              path: kgPath,
              type,
              categories: categories as CategoryConfig[],
              createdAt: now,
              status: "pending",
              statusChangedAt: now,
              graphId: preExistingMarkerId,
              // NOTE (Phase 4 final review finding I-6, not yet fixed): duplicateOf is recorded here but
              // nothing currently reads it. The plan's Task 4.4 spec says this should suppress future
              // duplicate-graphId prompts for this exact pair -- that suppression logic doesn't exist yet.
              // A future task should check for an existing duplicateOf edge between the two entries before
              // firing the four-answer prompt again.
              duplicateOf: existingEntry.name,
            };
            return cfg;
          });
          return {
            content: [{
              type: "text" as const,
              text: `Registered '${name}' at ${kgPath} as a worktree duplicate of '${existingEntry.name}' (shared graphId ${preExistingMarkerId}).`,
            }],
          };
        }
        case "fork": {
          // Mint + marker write happen once, before updateConfig -- mutator-purity rule
          // (Task 2.3, findings doc #8): a retry inside updateConfig must never re-run
          // an identity-minting side effect.
          const forkedId = mintGraphId();
          remintGraphIdMarker(expandedPath, forkedId);
          const forkWarning = markerTrackingWarning(expandedPath);
          const now = new Date().toISOString();
          updateConfig((cfg) => {
            cfg.graphs[name] = {
              name,
              path: kgPath,
              type,
              categories: categories as CategoryConfig[],
              createdAt: now,
              status: "pending",
              statusChangedAt: now,
              graphId: forkedId,
            };
            return cfg;
          });
          return {
            content: [{
              type: "text" as const,
              text: `Forked '${name}' at ${kgPath} with a new graphId (${forkedId}); the working tree is now dirty (.kmgraph-id changed) -- commit this when you're ready.${forkWarning}`,
            }],
          };
        }
        case "decline":
        default:
          return {
            content: [{
              type: "text" as const,
              text: `Not initialized as a duplicate resolution; you'll be asked again at the next kmg-init for ${kgPath}.`,
            }],
          };
      }
    }
  }

  // Follow-up (Task A): refuse to scaffold over a folder that already has
  // decisions/ or lessons-learned/ content but no marker at all -- checked
  // BEFORE scaffoldGraphDirectory runs, same "check before you write files"
  // discipline as every guard above it in this function, so this can never
  // leak scaffold files the way a scaffold-then-refuse ordering bug would
  // (that class of bug is Task C's, a different file/flow -- not reproduced
  // here). Gated on `!preExistingMarkerId`: a folder with an *orphaned*
  // marker (marker present, not registered) does NOT hit this -- it falls
  // through to the existing marker-mismatch hard-refusal a few lines below
  // instead (unchanged). Only "real content, zero marker at all" is new.
  if (
    !preExistingMarkerId &&
    (fs.existsSync(path.join(expandedPath, "decisions")) || fs.existsSync(path.join(expandedPath, "lessons-learned")))
  ) {
    return {
      content: [{
        type: "text" as const,
        text: `Found existing content at ${expandedPath} (decisions/ or lessons-learned/ already present) that isn't registered or marked as a KMGraph. Refusing to scaffold over it. Run kg_upgrade with apply: ["connect-unregistered-graph"] to register it instead.`,
      }],
      isError: true,
    };
  }

  // Create directory structure + copy default templates (shared with cli.ts, ENH-051)
  scaffoldGraphDirectory(expandedPath, categories);

  // Write config entry
  const newGraphId = mintGraphId();

  // Precise pre-check instead of try/catch around writeGraphIdMarker (Opus
  // review nit): a bare catch there would also swallow genuine I/O errors
  // (EACCES/ENOSPC/etc.) and mislabel them as a marker conflict. Checking
  // the existing marker directly means writeGraphIdMarker's own throw (if
  // it still somehow fires -- e.g. a race) is a real error and propagates
  // normally rather than being misreported.
  const existingMarkerId = readGraphIdMarker(expandedPath);
  if (existingMarkerId && existingMarkerId !== newGraphId) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Error: '${expandedPath}' is already tracked as a different knowledge graph (marker mismatch). If you meant to fork/re-register it, that flow isn't built yet (ADR-067 Phase 4) -- for now, remove or rename the existing .kmgraph-id marker file manually if you're certain this is intentional.`,
        },
      ],
      isError: true,
    };
  }
  writeGraphIdMarker(expandedPath, newGraphId);
  const ordinaryMarkerWarning = markerTrackingWarning(expandedPath);
  // config.active = name; removed -- resolution is now context-derived (Task 1.5)
  registerGraphConfig(config, {
    name,
    kgPath,
    type,
    categories: categories as CategoryConfig[],
    graphId: newGraphId,
  });

  return {
    content: [
      {
        type: "text" as const,
        text: `Knowledge graph '${name}' initialized at ${kgPath}\nReady to use — knowledge graphs are resolved automatically from your current directory. Categories: ${categories.map((c) => c.name).join(", ")}${ordinaryMarkerWarning}`,
      },
    ],
  };
}

export function registerConfigTools(server: McpServer, personalScopeSession: PersonalScopeSession): void {
  // ── kg_config_init ──────────────────────────────────────────────
  server.tool(
    "kg_config_init",
    "Create a new knowledge graph: directory structure + config entry",
    {
      name: z.string().min(1).describe("Unique name for this knowledge graph"),
      kgPath: z.string().describe("Absolute path where KG should be created"),
      type: z
        .enum(["project-local", "personal", "custom"])
        .default("project-local")
        .describe("KG type"),
      categories: z
        .array(
          z.object({
            name: z.string(),
            prefix: z.string().nullable().default(null),
            git: z.enum(["commit", "ignore"]).default("commit"),
          })
        )
        .default([
          { name: "architecture", prefix: null, git: "commit" },
          { name: "process", prefix: null, git: "commit" },
          { name: "patterns", prefix: null, git: "commit" },
        ])
        .describe("Categories to create"),
      interaction: z
        .enum(["interactive", "automated"])
        .optional()
        .describe("Override interaction mode for gated prompts (e.g. duplicate graphId detection)"),
      confirmMerge: z
        .boolean()
        .optional()
        .describe("Explicit approval to apply a pending 'reattach' registry merge after reviewing its preview"),
      confirmBroadRegistration: z
        .enum(["yes", "no"])
        .optional()
        .describe("Explicit confirmation to register a KG that is an ancestor of already-registered graph(s)"),
    },
    async (params) => handleConfigInit(params)
  );

  // ── kg_config_list ──────────────────────────────────────────────
  server.tool(
    "kg_config_list",
    "List all configured knowledge graphs",
    {},
    async () => {
      const config = readConfig();
      const graphs = Object.values(config.graphs);

      if (graphs.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "No knowledge graphs configured. Use kg_config_init to create one.",
            },
          ],
        };
      }

      const lines = graphs.map((g) => {
        const cats = g.categories.map((c) => c.name).join(", ");
        return `${g.name} (${g.status ?? "active"}) — ${g.path}\n  Categories: ${cats}`;
      });

      return {
        content: [
          {
            type: "text" as const,
            text: `Knowledge Graphs (${graphs.length}):\n\n${lines.join("\n\n")}`,
          },
        ],
      };
    }
  );

  // ── kg_config_add_category ──────────────────────────────────────
  server.tool(
    "kg_config_add_category",
    "Add a new category to a knowledge graph (default: resolved from your current directory)",
    {
      name: z.string().describe("Category name (e.g., 'security', 'ml-ops')"),
      prefix: z
        .string()
        .nullable()
        .default(null)
        .describe("Optional prefix for lessons in this category (e.g., 'sec-')"),
      git: z
        .enum(["commit", "ignore"])
        .default("commit")
        .describe("Git strategy for this category"),
      scope: z
        .enum(["project", "user"])
        .optional()
        .describe("project (default, cwd-resolved) or user (the personal knowledge graph)"),
      confirmPersonalScope: z
        .boolean()
        .optional()
        .describe(
          "Confirms this repo may write to the personal knowledge graph. Required once per " +
            "process before a scope:\"user\" write is honored for a repo not yet confirmed."
        ),
    },
    async (params, extra) =>
      handleConfigAddCategory(params, personalScopeSession, extra?._meta as Record<string, unknown> | undefined)
  );

  // ── kg_config_remint_id ───────────────────────────────────────────
  server.tool(
    "kg_config_remint_id",
    "Mint a fresh graphId for a registered knowledge graph, breaking its identity link to any clone/fork sharing its current id",
    {
      name: z.string().min(1).describe("Registered knowledge graph name"),
      confirm: z.boolean().describe("Must be true -- this is a deliberate identity break"),
    },
    async (params) => handleConfigRemintId(params)
  );
}

// ── Exported handler for direct testing ──────────────────────────────────────

export interface HandleConfigAddCategoryParams {
  name: string;
  prefix?: string | null;
  git?: "commit" | "ignore";
  scope?: "project" | "user";
  confirmPersonalScope?: boolean;
}

export interface HandleConfigAddCategoryResult {
  [x: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  isError?: true;
}

export async function handleConfigAddCategory(
  params: HandleConfigAddCategoryParams,
  personalScopeSession: PersonalScopeSession = new PersonalScopeSession(),
  toolCallMeta?: Record<string, unknown>
): Promise<HandleConfigAddCategoryResult> {
  const { name: catName, prefix = null, git = "commit", scope, confirmPersonalScope } = params;
  const config = readConfig();
  const cwd = resolveEffectiveCwd({ processCwd: process.cwd(), toolCallMeta });

  // ADR-067 Task 1.9: resolution is context-derived (resolveGraph), not
  // config.active-derived. scope:"user" reaches the personal graph, which
  // config.active could previously only reach by incidentally pointing at
  // it -- this restores that reachability explicitly.
  let target: { name: string; graph: GraphConfig } | { error: string };
  if (scope === "user") {
    target = resolvePersonalGraph(config);
  } else {
    const resolution = resolveGraph(config, cwd);
    target = resolution.kind === "resolved"
      ? { name: resolution.name, graph: resolution.graph }
      : { error: "No knowledge graph resolved from your current directory. Use kg_config_init first, or pass scope=\"user\"." };
  }

  if ("error" in target) {
    return { content: [{ type: "text" as const, text: `Error: ${target.error}` }], isError: true };
  }

  // ADR-067 Task 6.4 (spec §11): closes the interim gap left by Task 1.9 --
  // scope:"user" here reaches the personal graph the same way it does in
  // search.ts/capture.ts, so the same untrusted-repo-triggers-a-write
  // concern applies and gets the same gate.
  if (scope === "user") {
    const mode = resolveInteractionMode({}).mode;
    const confirmed = await confirmPersonalScopeAccess(personalScopeSession, cwd, {
      confirmPersonalScope,
      mode,
      timeoutMs: STUB_ASK_TIMEOUT_MS,
      ask: stubAsk,
    });
    if (!("confirmed" in confirmed)) {
      return { content: [{ type: "text" as const, text: JSON.stringify(confirmed) }], isError: true };
    }
  }

  const { name: graphName, graph } = target;

  if (graph.categories.some((c) => c.name === catName)) {
    return {
      content: [{ type: "text" as const, text: `Error: Category '${catName}' already exists in '${graphName}'.` }],
      isError: true,
    };
  }

  const expandedPath = graph.path.replace(/^~/, os.homedir());
  const catDir = path.join(expandedPath, "lessons-learned", catName);
  fs.mkdirSync(catDir, { recursive: true });

  graph.categories.push({ name: catName, prefix, git });
  writeConfig(config);

  return {
    content: [{ type: "text" as const, text: `Category '${catName}' added to '${graphName}'.\nDirectory created: ${catDir}` }],
  };
}

// ── kg_config_remint_id: standalone identity break, reachable outside ────────
// kmg-init (Task 4.6, spec §9). Task 4.4's fork branch only re-mints inline
// during kmg-init, but a fork's knowledge/ typically already exists, so
// kg_config_init short-circuits as "already initialized" and never reaches
// the four-answer prompt -- this is the only way to break identity from a
// stale carried-over marker in that situation.

export interface HandleConfigRemintIdParams {
  name: string;
  confirm: boolean;
}

export interface HandleConfigRemintIdResult {
  [x: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  isError?: true;
}

export async function handleConfigRemintId({ name, confirm }: HandleConfigRemintIdParams): Promise<HandleConfigRemintIdResult> {
  const config = readConfig();
  const graph = config.graphs[name];
  if (!graph) {
    return { content: [{ type: "text" as const, text: `Error: no registered graph named '${name}'.` }], isError: true };
  }
  if (!confirm) {
    return {
      content: [{
        type: "text" as const,
        text: `Re-minting '${name}''s graphId breaks its identity link to any clone/fork it currently shares an id with. Pass confirm: true to proceed.`,
      }],
      isError: true,
    };
  }

  // graph.path already IS the KG's content root (Task 1.2/1.5 contract) — no
  // "knowledge" suffix to append. See findings doc #9 correction below.
  const contentDir = graph.path.replace(/^~/, os.homedir());

  // I-5 path-existence guard: same shape as the guard added to kg_upgrade's
  // apply-mode path (commit 1c5c154c, finding B-1) — without it, a deleted/
  // unmounted graph.path would let remintGraphIdMarker's fs.writeFileSync
  // throw a raw ENOENT out of the tool handler instead of a structured error.
  if (!fs.existsSync(contentDir)) {
    return {
      content: [{ type: "text" as const, text: `Error: KG path not found: ${contentDir}` }],
      isError: true,
    };
  }

  const newId = mintGraphId(); // minted once, before updateConfig — mutator-purity rule (Task 2.3, findings doc #8)

  // I-5 ordering: registry write happens BEFORE the marker write. If
  // updateConfig throws (it explicitly can, after exhausting merge
  // retries), the on-disk marker is untouched and still matches the
  // registry's old graphId -- recoverable. The reverse order (marker first)
  // would leave an unrecoverable mismatch: the marker holds newId with no
  // record anywhere of the old id it replaced.
  updateConfig((cfg) => {
    cfg.graphs[name].graphId = newId;
    return cfg;
  });

  remintGraphIdMarker(contentDir, newId);

  const tracked = isMarkerTracked(contentDir);
  const warning = tracked === false
    ? `\nWarning: ${contentDir}'s .kmgraph-id marker is gitignored — it won't travel with clones, and duplicate detection is effectively disabled for this KG until that's fixed.`
    : "";

  return {
    content: [{
      type: "text" as const,
      text: `Re-minted graphId for '${name}': ${newId}. Working tree is now dirty (new marker content) — consider committing it.${warning}`,
    }],
  };
}
