import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { readConfig, walkDir, KgConfig } from "../utils.js";
import { resolveGraph, resolvePersonalGraph, PersonalScopeSession, confirmPersonalScopeAccess } from "../resolution.js";
import { resolveInteractionMode, STUB_ASK_TIMEOUT_MS, stubAsk } from "../interaction.js";

interface Violation {
  file: string;
  line: number;
  type: string;
  match: string;
}

const DEFAULT_PATTERNS: Array<{ type: string; regex: RegExp }> = [
  {
    type: "email",
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
  },
  {
    type: "api-key",
    regex: /\b(api[_-]?key|token|secret|password)\s*[:=]\s*['"]?[A-Za-z0-9_\-]{16,}['"]?/i,
  },
  {
    type: "url",
    regex: /https?:\/\/(?!example\.com|localhost)[^\s)]+/,
  },
  {
    type: "version-number",
    regex: /\bv\d+(\.\d+)?(\.\d+)?(\.x)?(\.\d+\.x)?\b/i,
  },
];

// ADR-067 Task 1.9: resolution is context-derived (resolveGraph), not
// config.active-derived. scope:"user" reaches the personal graph, which
// config.active could previously only reach by incidentally pointing at it.
// Exported separately from the tool handler so the resolution logic has a
// direct, mockable seam for tests.
export function resolveScanPath(
  config: KgConfig,
  params: { kgPath?: string; scope?: "project" | "user" }
): { scanPath: string } | { error: string } {
  if (params.kgPath) {
    return { scanPath: params.kgPath.replace(/^~/, os.homedir()) };
  }
  const target = params.scope === "user" ? resolvePersonalGraph(config) : (() => {
    const resolution = resolveGraph(config, process.cwd());
    return resolution.kind === "resolved"
      ? { name: resolution.name, graph: resolution.graph }
      : { error: "No knowledge graph resolved from your current directory and no path specified." };
  })();
  if ("error" in target) return target;
  return { scanPath: target.graph.path.replace(/^~/, os.homedir()) };
}

export function registerSanitizationTool(server: McpServer, personalScopeSession: PersonalScopeSession): void {
  server.tool(
    "kg_check_sensitive",
    "Scan knowledge graph files for potentially sensitive information",
    {
      kgPath: z
        .string()
        .optional()
        .describe("Path to scan (default: resolved from your current directory)"),
      scope: z
        .enum(["project", "user"])
        .optional()
        .describe("project (default, cwd-resolved) or user (the personal knowledge graph) — ignored when kgPath is given"),
      patterns: z
        .array(z.string())
        .optional()
        .describe("Additional regex patterns to check (beyond defaults)"),
      confirmPersonalScope: z
        .boolean()
        .optional()
        .describe(
          "Confirms this repo may scan the personal knowledge graph. Required once per " +
            "process before a scope:\"user\" scan is honored for a repo not yet confirmed."
        ),
    },
    async ({ kgPath, scope, patterns: customPatterns, confirmPersonalScope }) => {
      // Determine path to scan
      const resolved = resolveScanPath(readConfig(), { kgPath, scope });
      if ("error" in resolved) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${resolved.error}`,
            },
          ],
          isError: true,
        };
      }
      const scanPath = resolved.scanPath;

      // ADR-067 Task 6.4 (spec §11): scope:"user" (no kgPath override) reaches
      // the personal graph -- same gate as kg_fts5_status/search.ts/capture.ts.
      // Gated here, before the file walk below ever touches the personal KG's
      // content directory.
      if (!kgPath && scope === "user") {
        const mode = resolveInteractionMode({}).mode;
        const confirmed = await confirmPersonalScopeAccess(personalScopeSession, process.cwd(), {
          confirmPersonalScope,
          mode,
          timeoutMs: STUB_ASK_TIMEOUT_MS,
          ask: stubAsk,
        });
        if (!("confirmed" in confirmed)) {
          return { content: [{ type: "text" as const, text: JSON.stringify(confirmed) }], isError: true };
        }
      }

      if (!fs.existsSync(scanPath)) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: Path does not exist: ${scanPath}`,
            },
          ],
          isError: true,
        };
      }

      // Build pattern list
      const allPatterns = [...DEFAULT_PATTERNS];

      // Add custom patterns from config
      const config = readConfig();
      if (config.sanitization?.patterns) {
        for (const p of config.sanitization.patterns) {
          if (p.enabled && p.pattern) {
            allPatterns.push({
              type: `custom:${p.type}`,
              regex: new RegExp(p.pattern, "i"),
            });
          }
        }
      }

      // Add runtime custom patterns
      if (customPatterns) {
        for (const p of customPatterns) {
          allPatterns.push({
            type: "custom",
            regex: new RegExp(p, "i"),
          });
        }
      }

      // Scan all markdown files
      const files = walkDir(scanPath, ".md");
      const violations: Violation[] = [];

      for (const file of files) {
        // Skip template files
        if (file.includes("template") || file.includes("TEMPLATE")) continue;

        const content = fs.readFileSync(file, "utf-8");
        const lines = content.split("\n");

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];

          // Skip YAML frontmatter delimiters and comment lines
          if (line.trim() === "---" || line.startsWith("<!--")) continue;

          for (const pattern of allPatterns) {
            const match = line.match(pattern.regex);
            if (match) {
              violations.push({
                file: path.relative(scanPath, file),
                line: i + 1,
                type: pattern.type,
                match: match[0].substring(0, 60), // Truncate long matches
              });
            }
          }
        }
      }

      if (violations.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `✅ No sensitive data found in ${scanPath}\nScanned ${files.length} files with ${allPatterns.length} patterns.`,
            },
          ],
        };
      }

      // Format report
      const report = violations
        .map(
          (v) => `- ${v.file}:${v.line} — [${v.type}] ${v.match}`
        )
        .join("\n");

      return {
        content: [
          {
            type: "text" as const,
            text: `⚠️ Potential sensitive data found (${violations.length} violations):\n\n${report}\n\nReview these entries before pushing to public repository.`,
          },
        ],
      };
    }
  );
}
