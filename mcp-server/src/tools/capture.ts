import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { readConfig } from "../utils.js";
import { rebuildIndex } from "./fts5.js";
import { resolveGraph } from "../resolution.js";

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
    };
    version?: string;
    existingFile?: string;
  };
}

export interface CaptureResponse {
  status: "created" | "updated";
  filePath: string;
  relativePath: string;
  indexResult: Record<string, unknown>;
}

export interface CaptureError {
  error: "KG_MISMATCH" | "VALIDATION_ERROR" | "IO_ERROR" | "CONFLICT";
  activeKg?: string;
  activeKgRoot?: string;
  cwd?: string;
  message?: string;
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

export function validateMetadata(
  metadata: CaptureRequest["metadata"]
): CaptureRequest["metadata"] | CaptureError {
  if (!metadata.title || metadata.title.trim() === "") {
    return { error: "VALIDATION_ERROR", message: "metadata.title is required" };
  }
  if (!metadata.tags) metadata.tags = [];
  return metadata;
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
    lines.push(`title: "${metadata.title.replace(/"/g, '\\"')}"`);
    lines.push(`date: ${today}`);
    if (metadata.git?.branch) lines.push(`branch: ${metadata.git.branch}`);
    if (metadata.git?.commit_short) lines.push(`commit: ${metadata.git.commit_short}`);
    if (metadata.tags && metadata.tags.length > 0) {
      lines.push(`tags: [${metadata.tags.join(", ")}]`);
    }
  } else if (type === "adr") {
    lines.push(`title: "${metadata.title.replace(/"/g, '\\"')}"`);
    lines.push(`status: Proposed`);
    lines.push(`date: ${today}`);
    if (metadata.git?.author) lines.push(`deciders: ${metadata.git.author}`);
    if (metadata.tags && metadata.tags.length > 0) {
      lines.push(`tags: [${metadata.tags.join(", ")}]`);
    }
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
  targetKg?: string
): Promise<CaptureResponse | CaptureError> {
  // Validate metadata
  const validated = validateMetadata(request.metadata);
  if ("error" in validated) return validated as CaptureError;

  const config = readConfig();
  let kgPath: string | null;
  let skipCwdCheck = false;

  if (targetKg) {
    // Explicit target KG: resolve by exact name, skip CWD check (intentional
    // user choice). resolveGraph's exact-name branch never scans the
    // filesystem or falls back to cwd, matching the old direct-lookup
    // behavior (ADR-067 Task 1.8).
    const resolution = resolveGraph(config, process.cwd(), targetKg);
    if (resolution.kind === "not-registered") {
      return {
        error: "VALIDATION_ERROR",
        message: `Unknown KG name: "${targetKg}". Check /kmgraph:status for registered KGs.`,
      };
    }
    if (resolution.kind !== "resolved") {
      // fuzzy-match/archived/ambiguous-tie/merged: Task 6.2 wires each of
      // these through the interactivity gate with its real per-outcome
      // behavior; for this task, preserve current behavior (no regression
      // from today, where none of these outcomes exist at all) by treating
      // them as KG_MISMATCH.
      return { error: "KG_MISMATCH" };
    }
    kgPath = resolution.graph.path.replace(/^~/, require("os").homedir());
    skipCwdCheck = true;
  } else {
    const resolution = resolveGraph(config, process.cwd());
    if (resolution.kind === "no-graph-in-cwd") {
      return { error: "KG_MISMATCH", activeKgRoot: undefined, cwd: process.cwd() };
    }
    if (resolution.kind !== "resolved") {
      return { error: "KG_MISMATCH" };
    }
    kgPath = resolution.graph.path.replace(/^~/, require("os").homedir());
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
        generateFrontmatter(request.type, request.metadata) + request.content,
        "utf-8"
      );
      let indexResult: Record<string, unknown> = {};
      try {
        const kgName = targetKg || config.active || path.basename(kgPath);
        const kgType = config.graphs[kgName]?.type ?? "project-local";
        indexResult = rebuildIndex(kgPath, kgName, kgType) as unknown as Record<string, unknown>;
      } catch { /* best-effort */ }
      return { status: "updated", filePath: existing, relativePath: path.relative(kgPath, existing), indexResult };
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
  const { dir, fileName } = resolveTargetPath(kgPath, request.type, request.metadata);

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
    fs.writeFileSync(filePath, generateFrontmatter(request.type, request.metadata) + request.content, "utf-8");
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
      title: request.metadata.title,
      relativePath: path.relative(path.dirname(readmePath), filePath),
    });
  } catch { /* best-effort */ }

  // FTS5 rebuild (in-process, best-effort)
  let indexResult: Record<string, unknown> = {};
  try {
    const kgName = targetKg || config.active || path.basename(kgPath);
    const kgType = config.graphs[kgName]?.type ?? "project-local";
    indexResult = rebuildIndex(kgPath, kgName, kgType) as unknown as Record<string, unknown>;
  } catch { /* absent if node-sqlite3-wasm not installed */ }

  return {
    status: "created",
    filePath,
    relativePath: path.relative(kgPath, filePath),
    indexResult,
  };
}

export function registerCaptureTool(server: McpServer): void {
  server.tool(
    "kg_capture",
    "Write a lesson, session summary, or ADR to a knowledge graph. " +
      "Defaults to the active KG. Pass targetKg to write to a named KG (e.g., a global personal KG). " +
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
          title: z.string().describe("Used in frontmatter and filename generation"),
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
            })
            .optional()
            .describe("Git context metadata"),
          version: z.string().optional().describe("Version string for updates to existing files"),
          existingFile: z
            .string()
            .optional()
            .describe("Absolute path to existing file for update-in-place"),
        })
        .describe("Entry metadata"),
      targetKg: z
        .string()
        .optional()
        .describe(
          "Named KG to write to (from kg-config.json). Use for global/personal KG captures. " +
            "If omitted, writes to the active KG. CWD alignment check is skipped when targetKg is set."
        ),
    },
    async ({ content, type, metadata, targetKg }) => {
      const result = await handleCapture({ content, type, metadata }, targetKg);
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
