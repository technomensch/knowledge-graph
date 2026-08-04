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
    { field: "autoSwitch", defaultValue: false },
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
    autoSwitch: false,
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
export type ApplyCategory = "status-schema" | "config-location" | "directories" | "config" | "templates" | "platform-split" | "starter-relocation" | "stray-knowledge-dir";

export interface HandleUpgradeParams {
  apply?: ApplyCategory[];
  confirm_platform_split?: boolean;
  scope?: "project" | "user";
  confirmPersonalScope?: boolean;
  // ADR-067 Task 8.1: required (automated mode) to apply "status-schema".
  // Interactive mode is asked via gate() instead; an explicit true here is
  // still honored in either mode (see confirmStatusSchemaMigration).
  confirmMigration?: boolean;
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
    result.upgrades.push(...checkVersionMismatch(installedVersion, kgType, config, target.name));
    const platformWarning = checkPlatformSplit(kgPath);
    if (platformWarning) result.warnings.push(platformWarning);
    return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
  }

  const results: string[] = [];
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
      case "platform-split":
        if (!params.confirm_platform_split) {
          results.push("[platform-split] WARNING: platform-split migration removes content from rules.md. Pass confirm_platform_split: true to proceed.");
        } else {
          results.push(`[platform-split] ${applyPlatformSplit(kgPath)}`);
          appliedAnyGraphDependent = true;
        }
        break;
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
  return { content: [{ type: "text" as const, text: results.join("\n\n") }], ...(anyCategoryFailed ? { isError: true as const } : {}) };
}

// ── Tool registration ────────────────────────────────────────────────────────

export function registerUpgradeTool(server: McpServer, personalScopeSession: PersonalScopeSession): void {
  server.tool(
    "kg_upgrade",
    "Inspect and apply KMGraph upgrades for MCP-only installations",
    {
      apply: z
        .array(z.enum(["status-schema", "config-location", "directories", "config", "templates", "platform-split", "starter-relocation", "stray-knowledge-dir"]))
        .optional()
        .default([])
        .describe(
          'Categories to apply. Omit or pass [] to inspect only. Values: "status-schema", "config-location", "directories", "config", "templates", "platform-split", "starter-relocation", "stray-knowledge-dir"'
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
    },
    async ({ apply, confirm_platform_split, scope, confirmPersonalScope, confirmMigration }, extra) => {
      return handleUpgrade(
        { apply: apply as ApplyCategory[] | undefined, confirm_platform_split, scope, confirmPersonalScope, confirmMigration },
        personalScopeSession,
        extra?._meta as Record<string, unknown> | undefined
      );
    }
  );
}
