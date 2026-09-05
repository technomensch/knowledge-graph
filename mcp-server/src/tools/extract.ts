import * as fs from "fs";
import * as path from "path";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readConfig, KgConfig } from "../utils.js";
import { resolveGraph } from "../resolution.js";
import { resolveEffectiveCwd } from "../platform-cwd.js";

export interface ExtractRequest {
  sourcePaths: string[];
}

export interface ExtractCandidate {
  category: "lesson" | "decision" | "kg-entry";
  title: string;
  problem?: string;
  solution?: string;
  sourceRef: string;
}

export interface ExtractResponse {
  candidates: ExtractCandidate[];
  targetKgPath: string;
}

export interface ExtractError {
  error: "VALIDATION_ERROR" | "KG_MISMATCH" | "NOT_REGISTERED";
  message: string;
}

function categoryForPath(p: string): ExtractCandidate["category"] {
  if (p.includes("decisions")) return "decision";
  if (p.includes("chat-history")) return "lesson";
  return "kg-entry"; // lessons-learned/ -- indexing an existing lesson into a KG entry
}

function draftFromFile(filePath: string): ExtractCandidate {
  const content = fs.readFileSync(filePath, "utf-8");
  const titleMatch = content.match(/^#\s*(?:Lesson:\s*)?(.+)$/m);
  const problemMatch = content.match(/##\s*Problem\s*\n+([^\n#]+)/);
  const solutionMatch = content.match(/##\s*Solution\s*\n+([^\n#]+)/);

  return {
    category: categoryForPath(filePath),
    title: titleMatch ? titleMatch[1].trim() : path.basename(filePath, ".md"),
    problem: problemMatch ? problemMatch[1].trim() : undefined,
    solution: solutionMatch ? solutionMatch[1].trim() : undefined,
    sourceRef: filePath,
  };
}

function collectMarkdownFiles(sourcePath: string): string[] {
  const stat = fs.statSync(sourcePath);
  if (stat.isFile()) return sourcePath.endsWith(".md") ? [sourcePath] : [];
  return fs.readdirSync(sourcePath, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(sourcePath, entry.name);
    return entry.isDirectory() ? collectMarkdownFiles(full) : entry.isFile() && full.endsWith(".md") ? [full] : [];
  });
}

// True if `target` is `root` itself or nested under it (path-boundary safe --
// unlike a bare startsWith(), this won't treat "/kg/decisions-archive" as
// nested under "/kg/decisions").
function isWithinRoot(target: string, root: string): boolean {
  const rel = path.relative(root, target);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

export async function handleExtract(
  request: ExtractRequest,
  workspaceRoot?: string,
  toolCallMeta?: Record<string, unknown>
): Promise<ExtractResponse | ExtractError> {
  if (!request.sourcePaths || request.sourcePaths.length === 0) {
    return { error: "VALIDATION_ERROR", message: "sourcePaths must contain at least one path" };
  }

  const config: KgConfig = readConfig();
  const cwd = resolveEffectiveCwd({ processCwd: process.cwd(), toolCallMeta, workspaceRootParam: workspaceRoot });
  const resolution = resolveGraph(config, cwd);

  if (resolution.kind === "not-registered") {
    return { error: "NOT_REGISTERED", message: "Unknown or unregistered knowledge graph for this directory." };
  }
  if (resolution.kind === "no-graph-in-cwd") {
    return { error: "KG_MISMATCH", message: "No knowledge graph resolved from your current directory. Run /kmgraph:kmg-init first." };
  }
  if (resolution.kind === "fuzzy-match" || resolution.kind === "ambiguous-tie") {
    return { error: "KG_MISMATCH", message: `Multiple candidate graphs found: ${resolution.candidates.join(", ")}. Specify explicitly.` };
  }
  if (resolution.kind === "merged") {
    return { error: "KG_MISMATCH", message: `This graph was merged into "${resolution.into}". Use that graph instead.` };
  }
  // resolution.kind is now "resolved" or "archived" -- both carry `graph`
  const targetKgPath = resolution.graph.path;

  // sourcePaths must actually live under the resolved graph's chat-history/,
  // lessons-learned/, or decisions/ -- without this, a caller could point
  // sourcePaths at any readable path on disk and have its contents echoed
  // back as "candidates" (the KG resolution above would otherwise be
  // decorative, not enforced). Relative paths resolve against the graph
  // root (matching the documented "paths under chat-history/, ..." contract),
  // not the process cwd -- a personal-KG (~/.kmgraph) resolution invoked from
  // a project directory would otherwise resolve relative paths to the wrong
  // place. Absolute paths are unaffected either way.
  const resolvedKgPath = fs.existsSync(targetKgPath) ? fs.realpathSync(targetKgPath) : path.resolve(targetKgPath);
  const allowedRoots = ["chat-history", "lessons-learned", "decisions"].map((d) => path.resolve(resolvedKgPath, d));

  let resolvedSourcePaths: string[];
  try {
    // realpathSync (not path.resolve) so a symlink inside an allowed root
    // pointing outside the graph can't be used to read arbitrary files --
    // it also fails fast on a nonexistent sourcePath with a clean error
    // instead of surfacing later as an unhandled ENOENT.
    resolvedSourcePaths = request.sourcePaths.map((p) => fs.realpathSync(path.resolve(resolvedKgPath, p)));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: "VALIDATION_ERROR", message: `Unable to resolve one or more sourcePaths: ${message}` };
  }

  const outOfScope = resolvedSourcePaths.filter((p) => !allowedRoots.some((root) => isWithinRoot(p, root)));
  if (outOfScope.length > 0) {
    return {
      error: "KG_MISMATCH",
      message: `sourcePaths must be under the resolved graph's chat-history/, lessons-learned/, or decisions/ directories. Out of scope: ${outOfScope.join(", ")}`,
    };
  }

  let candidates: ExtractCandidate[];
  try {
    const markdownFiles = resolvedSourcePaths.flatMap((p) => collectMarkdownFiles(p));
    candidates = markdownFiles.map((filePath) => draftFromFile(filePath));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: "VALIDATION_ERROR", message: `Unable to read one or more sourcePaths: ${message}` };
  }

  return { candidates, targetKgPath };
}

export function registerExtractTool(server: McpServer): void {
  server.tool(
    "kg_extract",
    "Read-only extraction of lesson/decision/KG-entry candidates from chat-history/, " +
      "lessons-learned/, or decisions/ paths. Never writes -- pair with kg_capture for " +
      "the approval-gated write step. Cross-platform equivalent of kmg-backfill for " +
      "Codex/Gemini users without Claude Code subagent spawning.",
    {
      sourcePaths: z.array(z.string()).min(1).describe("One or more paths under chat-history/, lessons-learned/, or decisions/"),
      workspaceRoot: z.string().optional().describe("Explicit cwd override, same convention as kg_capture"),
    },
    async ({ sourcePaths, workspaceRoot }, extra) => {
      const result = await handleExtract({ sourcePaths }, workspaceRoot, extra?._meta as Record<string, unknown> | undefined);
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
