import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { readConfig, writeConfig, getPluginRoot } from "../utils.js";
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
function checkConfig(kgPath: string): UpgradeItem[] {
  const config = readConfig();
  if (!config.active || !config.graphs[config.active]) return [];
  const graph = config.graphs[config.active] as unknown as Record<string, unknown>;

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

function applyConfig(): string {
  const config = readConfig();
  if (!config.active || !config.graphs[config.active]) {
    return "No active graph to update config for";
  }
  const graph = config.graphs[config.active] as unknown as Record<string, unknown>;
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
          const srcContent = fs.readFileSync(src, "utf-8");
          const destContent = fs.readFileSync(dest, "utf-8");
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
    details: `Found: ${strayDir}\nApply stray-knowledge-dir to merge known template files into concepts/ and remove the dir.`,
  }];
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

    const canonicalSrc = path.join(sourceDir, entry);
    if (fs.existsSync(canonicalSrc)) {
      const srcContent = fs.readFileSync(src, "utf-8");
      const canonContent = fs.readFileSync(canonicalSrc, "utf-8");
      if (srcContent !== canonContent) {
        // ADR-040: user modified — warn, do not auto-overwrite
        skipped.push(`${entry} (modified — manual review required before moving to concepts/)`);
        continue;
      }
    }

    const dest = path.join(destConcepts, entry);
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
  if (skipped.length > 0) parts.push(`Skipped (modified): ${skipped.join(", ")}`);
  if (ignored.length > 0) parts.push(`Ignored (not template files): ${ignored.join(", ")}`);
  if (remaining.length > 0) parts.push(`knowledge/ not removed — ${remaining.length} item(s) remain`);
  return parts.join(". ") || "Nothing to move";
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
  config: ReturnType<typeof readConfig>
): UpgradeItem[] {
  const graphRecord = config.graphs[config.active!] as unknown as Record<string, unknown>;
  const lastApplied = graphRecord.lastAppliedVersion as string | undefined;
  if (!lastApplied || lastApplied === installedVersion) return [];
  return [{
    category: "version-update",
    description: `Installed v${installedVersion} > last applied v${lastApplied} — run apply to update`,
    details: `Apply categories: directories, templates, starter-relocation${kgType === "project-local" ? ", stray-knowledge-dir" : ""}`,
  }];
}

function updateLastAppliedVersion(installedVersion: string): void {
  // Fresh read to avoid clobbering field additions made by applyConfig() in the same apply run
  const config = readConfig();
  const graph = config.graphs[config.active!] as unknown as Record<string, unknown>;
  graph.lastAppliedVersion = installedVersion;
  writeConfig(config);
}

// ── Exported handler for direct testing ──────────────────────────────────────

// "version-update" is inspect-only — NOT an apply category; do not add it here
export type ApplyCategory = "directories" | "config" | "templates" | "platform-split" | "starter-relocation" | "stray-knowledge-dir";

export interface HandleUpgradeParams {
  apply?: ApplyCategory[];
  confirm_platform_split?: boolean;
}

export interface HandleUpgradeResult {
  [x: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  isError?: true;
}

export async function handleUpgrade(params: HandleUpgradeParams): Promise<HandleUpgradeResult> {
  // Under Jest/ts-jest __SERVER_VERSION__ is undefined → installedVersion = "0.0.0"
  const installedVersion = handleVersion().installed;
  const config = readConfig();

  if (!config.active || !config.graphs[config.active]) {
    return {
      content: [{ type: "text" as const, text: "Error: No active knowledge graph configured. Use kg_config_init or kg_config_switch first." }],
      isError: true,
    };
  }

  const rawPath = config.graphs[config.active].path;
  const kgPath = rawPath.replace(/^~/, os.homedir());
  const graphRecord = config.graphs[config.active] as unknown as Record<string, unknown>;
  const kgType = graphRecord.type as string | undefined;

  if (!fs.existsSync(kgPath)) {
    return {
      content: [{ type: "text" as const, text: `Error: KG path not found: ${kgPath}` }],
      isError: true,
    };
  }

  const applyList = params.apply ?? [];
  const sortedApplyList = [...applyList].sort(
    (a, b) => APPLY_ORDER.indexOf(a) - APPLY_ORDER.indexOf(b)
  );

  if (applyList.length === 0) {
    const result: InspectResult = { upgrades: [], warnings: [] };
    result.upgrades.push(...checkDirectories(kgPath));
    result.upgrades.push(...checkConfig(kgPath));
    result.upgrades.push(...checkTemplates(kgPath));
    result.upgrades.push(...checkStarterRelocation(kgPath));
    result.upgrades.push(...checkStrayKnowledgeDir(kgPath, kgType));
    result.upgrades.push(...checkVersionMismatch(installedVersion, kgType, config));
    const platformWarning = checkPlatformSplit(kgPath);
    if (platformWarning) result.warnings.push(platformWarning);
    return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
  }

  const results: string[] = [];
  for (const category of sortedApplyList) {
    switch (category) {
      case "directories":
        results.push(`[directories] ${applyDirectories(kgPath)}`);
        break;
      case "config":
        results.push(`[config] ${applyConfig()}`);
        break;
      case "templates":
        results.push(`[templates] ${applyTemplates(kgPath)}`);
        break;
      case "starter-relocation":
        results.push(`[starter-relocation] ${applyStarterRelocation(kgPath)}`);
        break;
      case "stray-knowledge-dir":
        results.push(`[stray-knowledge-dir] ${applyStrayKnowledgeDir(kgPath)}`);
        break;
      case "platform-split":
        if (!params.confirm_platform_split) {
          results.push("[platform-split] WARNING: platform-split migration removes content from rules.md. Pass confirm_platform_split: true to proceed.");
        } else {
          results.push(`[platform-split] ${applyPlatformSplit(kgPath)}`);
        }
        break;
    }
  }

  // Write lastAppliedVersion sentinel after any successful apply
  if (applyList.length > 0) {
    updateLastAppliedVersion(installedVersion);
  }

  return { content: [{ type: "text" as const, text: results.join("\n\n") }] };
}

// ── Tool registration ────────────────────────────────────────────────────────

export function registerUpgradeTool(server: McpServer): void {
  server.tool(
    "kg_upgrade",
    "Inspect and apply KMGraph upgrades for MCP-only installations",
    {
      apply: z
        .array(z.enum(["directories", "config", "templates", "platform-split", "starter-relocation", "stray-knowledge-dir"]))
        .optional()
        .default([])
        .describe(
          'Categories to apply. Omit or pass [] to inspect only. Values: "directories", "config", "templates", "platform-split"'
        ),
      confirm_platform_split: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          "Must be true to apply platform-split migration (removes content from rules.md)"
        ),
    },
    async ({ apply, confirm_platform_split }) => {
      return handleUpgrade({ apply: apply as ApplyCategory[] | undefined, confirm_platform_split });
    }
  );
}
