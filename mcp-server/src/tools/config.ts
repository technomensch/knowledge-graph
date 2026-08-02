import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { execFileSync } from "child_process";
import {
  readConfig,
  writeConfig,
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
import { resolveGraph, resolvePersonalGraph, isHomeOrRootCwd, isAncestorOrEqual } from "../resolution.js";
import { resolveInteractionMode, gate } from "../interaction.js";

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
    .filter(([, g]) => g.type !== "personal" && g.status !== "deleted")
    .filter(([, g]) => {
      const existingPath = g.path.replace(/^~/, os.homedir());
      return existingPath !== candidate && isAncestorOrEqual(candidate, existingPath);
    })
    .map(([name]) => name);
  if (ancestorOfNames.length === 0) return null;
  return { isAncestorOfCount: ancestorOfNames.length, ancestorOfNames };
}

// ── Exported handler for direct testing ──────────────────────────────────────

export interface HandleConfigSwitchParams {
  name: string;
}

export interface HandleConfigSwitchResult {
  [x: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  isError?: true;
}

export function handleConfigSwitch(
  params: HandleConfigSwitchParams
): HandleConfigSwitchResult {
  const { name } = params;
  const config = readConfig();

  if (!config.graphs[name]) {
    const available = Object.keys(config.graphs).join(", ");
    return {
      content: [
        {
          type: "text" as const,
          text: `Error: Knowledge graph '${name}' not found. Available: ${available || "none"}`,
        },
      ],
      isError: true,
    };
  }

  // No longer writes config.active/lastUsed -- resolution is context-derived
  // (Task 1.5). This tool is fully retired in Task 6.2; until then it stays
  // registered as a harmless deprecated no-op so the rest of this phase's
  // call-site sweep isn't blocked on deleting it early.
  return {
    content: [
      {
        type: "text" as const,
        text: `'${name}' is registered at ${config.graphs[name].path}. kg_config_switch no longer changes anything -- knowledge graphs are resolved automatically from your current directory. This tool will be removed in a future release.`,
      },
    ],
  };
}

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
}

export interface HandleConfigInitResult {
  [x: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  isError?: true;
}

export async function handleConfigInit({ name, kgPath, type, categories, interaction, confirmMerge }: HandleConfigInitParams): Promise<HandleConfigInitResult> {
  const config = readConfig();

  // Validate name doesn't exist
  if (config.graphs[name]) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Error: Knowledge graph '${name}' already exists. Use kg_config_switch to activate it.`,
        },
      ],
      isError: true,
    };
  }

  // Expand path
  const expandedPath = kgPath.replace(/^~/, os.homedir());

  if (isHardBlockedRegistrationPath(expandedPath)) {
    return {
      content: [{
        type: "text" as const,
        text: `Error: refusing to register a knowledge graph at ${expandedPath} — this is your home directory or the filesystem root. Registering a KG this broad would make it resolve as "the KG for" nearly every directory on this machine. Choose a more specific project path.`,
      }],
      isError: true,
    };
  }

  const broadWarning = findBroadAncestorWarning(config, expandedPath);
  if (broadWarning) {
    const mode = resolveInteractionMode({}).mode;
    const gated = await gate({
      mode,
      reason: "broad_ancestor_registration",
      param: "confirmBroadRegistration",
      accepts: ["yes", "no"],
      ask: () => new Promise<never>(() => {}), // no real ask() transport yet, same pattern as every other gate() stub in this plan
    });
    if ("error" in gated) {
      return { content: [{ type: "text" as const, text: JSON.stringify(gated) }], isError: true };
    }
    if (!("answer" in gated) || gated.answer !== "yes") {
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
        if (existingEntry.graph.path !== kgPath) {
          existingEntry.graph.path = kgPath;
          writeConfig(config);
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
        ask: () => new Promise<never>(() => {}), // no real ask() transport yet, same pattern as every other gate() stub in this plan
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
            duplicateOf: existingEntry.name,
          };

          const { preview, backupPath: previewBackupPath } = performRegistryMerge(config, name, existingEntry.name, {});

          if (!confirmMerge) {
            const mode = resolveInteractionMode({ explicitParam: interaction }).mode;
            const gated = await gate({
              mode,
              reason: "merge_preview",
              param: "confirmMerge",
              accepts: ["confirm", "cancel"],
              ask: () => new Promise<never>(() => {}), // no real ask() transport yet, same pattern as every other gate() stub in this plan
            });

            if ("error" in gated) {
              return { content: [{ type: "text" as const, text: JSON.stringify({ ...gated, preview }) }], isError: true };
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

          const applied = performRegistryMerge(config, name, existingEntry.name, { skipReview: true });
          writeConfig(applied.config);
          return {
            content: [{
              type: "text" as const,
              text: `Reattached: '${name}' merged into '${existingEntry.name}' (backup at ${previewBackupPath}; final backup at ${applied.backupPath}).`,
            }],
          };
        }
        case "worktree": {
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
            duplicateOf: existingEntry.name,
          };
          writeConfig(config);
          return {
            content: [{
              type: "text" as const,
              text: `Registered '${name}' at ${kgPath} as a worktree duplicate of '${existingEntry.name}' (shared graphId ${preExistingMarkerId}).`,
            }],
          };
        }
        case "fork": {
          const forkedId = mintGraphId();
          remintGraphIdMarker(expandedPath, forkedId);
          const forkWarning = markerTrackingWarning(expandedPath);
          const now = new Date().toISOString();
          config.graphs[name] = {
            name,
            path: kgPath,
            type,
            categories: categories as CategoryConfig[],
            createdAt: now,
            status: "pending",
            statusChangedAt: now,
            graphId: forkedId,
          };
          writeConfig(config);
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

  // Create directory structure
  const dirs = [
    "knowledge",
    "lessons-learned",
    "decisions",
    "sessions",
    "chat-history",
    "tmp",
  ];
  for (const dir of dirs) {
    fs.mkdirSync(path.join(expandedPath, dir), { recursive: true });
  }

  // Create category subdirectories
  for (const cat of categories) {
    fs.mkdirSync(
      path.join(expandedPath, "lessons-learned", cat.name),
      { recursive: true }
    );
  }

  // Copy templates from plugin
  const pluginRoot = getPluginRoot();
  const templateSrc = path.join(pluginRoot, "core", "default-templates");

  if (fs.existsSync(templateSrc)) {
    // Copy knowledge templates
    const knowledgeTemplates = [
      "patterns.md",
      "gotchas.md",
      "concepts.md",
      "architecture.md",
      "workflows.md",
    ];
    for (const t of knowledgeTemplates) {
      const src = path.join(templateSrc, "knowledge", "templates", t);
      const dest = path.join(expandedPath, "knowledge", t);
      if (fs.existsSync(src) && !fs.existsSync(dest)) {
        fs.copyFileSync(src, dest);
      }
    }

    // Copy lesson templates
    const lessonSrc = path.join(templateSrc, "lessons-learned");
    const lessonDest = path.join(expandedPath, "lessons-learned");
    for (const t of ["README.md", "lesson-template.md"]) {
      const src = path.join(lessonSrc, t);
      const dest = path.join(lessonDest, t);
      if (fs.existsSync(src) && !fs.existsSync(dest)) {
        fs.copyFileSync(src, dest);
      }
    }

    // Copy ADR templates
    const adrSrc = path.join(templateSrc, "decisions");
    const adrDest = path.join(expandedPath, "decisions");
    for (const t of ["README.md", "ADR-template.md"]) {
      const src = path.join(adrSrc, t);
      const dest = path.join(adrDest, t);
      if (fs.existsSync(src) && !fs.existsSync(dest)) {
        fs.copyFileSync(src, dest);
      }
    }

    // Copy session template
    const sessSrc = path.join(templateSrc, "sessions", "session-template.md");
    const sessDest = path.join(expandedPath, "sessions", "session-template.md");
    if (fs.existsSync(sessSrc) && !fs.existsSync(sessDest)) {
      fs.copyFileSync(sessSrc, sessDest);
    }

    // Copy root scaffold files (me.md, rules.md, kg-index.md, triggers.md)
    const rootScaffolds = ["me.md", "rules.md", "kg-index.md", "triggers.md"];
    for (const f of rootScaffolds) {
      const src = path.join(templateSrc, "knowledge", f);
      const dest = path.join(expandedPath, f);
      if (fs.existsSync(src) && !fs.existsSync(dest)) {
        fs.copyFileSync(src, dest);
      }
    }

    // Copy kg-category-index.md to knowledge/ subdir
    const catIndexSrc = path.join(templateSrc, "knowledge", "kg-category-index.md");
    const catIndexDest = path.join(expandedPath, "knowledge", "kg-category-index.md");
    if (fs.existsSync(catIndexSrc) && !fs.existsSync(catIndexDest)) {
      fs.copyFileSync(catIndexSrc, catIndexDest);
    }
  }

  // Write config entry
  const now = new Date().toISOString();
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
  const graphConfig: GraphConfig = {
    name,
    path: kgPath,
    type,
    categories: categories as CategoryConfig[],
    createdAt: now,
    // lastUsed removed -- no writer needed once Task 1.12 deletes the field
    status: "pending",
    statusChangedAt: now,
    graphId: newGraphId,
  };

  config.graphs[name] = graphConfig;
  // config.active = name; removed -- resolution is now context-derived (Task 1.5)
  writeConfig(config);

  return {
    content: [
      {
        type: "text" as const,
        text: `Knowledge graph '${name}' initialized at ${kgPath}\nReady to use — knowledge graphs are resolved automatically from your current directory. Categories: ${categories.map((c) => c.name).join(", ")}${ordinaryMarkerWarning}`,
      },
    ],
  };
}

export function registerConfigTools(server: McpServer): void {
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

  // ── kg_config_switch ────────────────────────────────────────────
  server.tool(
    "kg_config_switch",
    "Change the active knowledge graph",
    {
      name: z.string().describe("Name of the knowledge graph to activate"),
    },
    async ({ name }) => handleConfigSwitch({ name })
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
    },
    async (params) => handleConfigAddCategory(params)
  );
}

// ── Exported handler for direct testing ──────────────────────────────────────

export interface HandleConfigAddCategoryParams {
  name: string;
  prefix?: string | null;
  git?: "commit" | "ignore";
  scope?: "project" | "user";
}

export interface HandleConfigAddCategoryResult {
  [x: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  isError?: true;
}

export function handleConfigAddCategory(
  params: HandleConfigAddCategoryParams
): HandleConfigAddCategoryResult {
  const { name: catName, prefix = null, git = "commit", scope } = params;
  const config = readConfig();

  // ADR-067 Task 1.9: resolution is context-derived (resolveGraph), not
  // config.active-derived. scope:"user" reaches the personal graph, which
  // config.active could previously only reach by incidentally pointing at
  // it -- this restores that reachability explicitly.
  let target: { name: string; graph: GraphConfig } | { error: string };
  if (scope === "user") {
    target = resolvePersonalGraph(config);
  } else {
    const resolution = resolveGraph(config, process.cwd());
    target = resolution.kind === "resolved"
      ? { name: resolution.name, graph: resolution.graph }
      : { error: "No knowledge graph resolved from your current directory. Use kg_config_init first, or pass scope=\"user\"." };
  }

  if ("error" in target) {
    return { content: [{ type: "text" as const, text: `Error: ${target.error}` }], isError: true };
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
