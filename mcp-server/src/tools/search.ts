import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { readConfig, getActiveGraphPath, walkDir } from "../utils.js";
import { searchFts5, getDbPath } from "./fts5.js";
import type { SearchResult } from "./fts5.js";

function searchFile(
  filePath: string,
  query: string,
  basePath: string
): SearchResult[] {
  const results: SearchResult[] = [];
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const queryLower = query.toLowerCase();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineLower = line.toLowerCase();

    if (lineLower.includes(queryLower)) {
      let matchType: "title" | "heading" | "body" = "body";

      // Check for YAML title field
      if (line.match(/^title:/i)) {
        matchType = "title";
      }
      // Check for heading match
      else if (line.match(/^#{1,4}\s/)) {
        matchType = "heading";
      }

      // Get surrounding context (1 line before and after)
      const contextStart = Math.max(0, i - 1);
      const contextEnd = Math.min(lines.length - 1, i + 1);
      const context = lines
        .slice(contextStart, contextEnd + 1)
        .join("\n")
        .trim();

      results.push({
        file: filePath,
        relativePath: path.relative(basePath, filePath),
        line: i + 1,
        context,
        matchType,
      });
    }
  }

  return results;
}

export function registerSearchTool(server: McpServer): void {
  server.tool(
    "kg_search",
    "Full-text search across all knowledge graph files in the active KG",
    {
      query: z.string().describe("Search query (case-insensitive)"),
      format: z
        .enum(["summary", "paths", "detailed"])
        .default("summary")
        .describe("Output format: summary (default), paths only, or detailed with context"),
    },
    async ({ query, format }) => {
      const config = readConfig();
      const kgPath = getActiveGraphPath(config);

      if (!kgPath) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Error: No active knowledge graph. Use kg_config_init or kg_config_switch first.",
            },
          ],
          isError: true,
        };
      }

      if (!fs.existsSync(kgPath)) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: Active KG path does not exist: ${kgPath}`,
            },
          ],
          isError: true,
        };
      }

      // FTS5 detection: use indexed search when .fts5.db exists
      const dbPath = getDbPath(kgPath);
      let allResults: SearchResult[];
      let usingFts5 = false;

      if (fs.existsSync(dbPath)) {
        try {
          allResults = searchFts5(dbPath, query, kgPath);
          usingFts5 = true;
        } catch (err) {
          // FTS5 query failed (corrupt db, syntax issue) — fall back silently
          console.error("FTS5 search failed, falling back to linear scan:", err);
          allResults = [];
        }
      } else {
        allResults = [];
      }

      if (!usingFts5) {
        // Linear scan fallback
        allResults = [];
        const searchDirs = [
          "knowledge",
          "lessons-learned",
          "decisions",
          "sessions",
        ];

        for (const dir of searchDirs) {
          const dirPath = path.join(kgPath, dir);
          const files = walkDir(dirPath, ".md");

          for (const file of files) {
            const results = searchFile(file, query, kgPath);
            allResults.push(...results);
          }
        }

        // Also search MEMORY.md if it exists at KG root
        const memoryPath = path.join(kgPath, "MEMORY.md");
        if (fs.existsSync(memoryPath)) {
          allResults.push(...searchFile(memoryPath, query, kgPath));
        }

        // Sort: title matches first, then headings, then body
        const typeOrder = { title: 0, heading: 1, body: 2 };
        allResults.sort((a, b) => typeOrder[a.matchType] - typeOrder[b.matchType]);
      }

      if (allResults.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `No results found for "${query}" in active KG (${config.active}).`,
            },
          ],
        };
      }

      // Format output
      const searchLabel = usingFts5 ? " (FTS5)" : "";
      let output: string;

      if (format === "paths") {
        const uniquePaths = [...new Set(allResults.map((r) => r.relativePath))];
        output = `Found ${allResults.length} matches${searchLabel} in ${uniquePaths.length} files:\n\n${uniquePaths.join("\n")}`;
      } else if (format === "detailed") {
        const formatted = allResults.map(
          (r) =>
            `[${r.matchType}${searchLabel}] ${r.relativePath}:${r.line}\n${r.context}\n`
        );
        output = `Found ${allResults.length} matches${searchLabel} for "${query}":\n\n${formatted.join("\n---\n\n")}`;
      } else {
        // summary
        const byFile = new Map<string, SearchResult[]>();
        for (const r of allResults) {
          const existing = byFile.get(r.relativePath) || [];
          existing.push(r);
          byFile.set(r.relativePath, existing);
        }

        const lines: string[] = [];
        for (const [filePath, results] of byFile) {
          const types = results.map((r) => r.matchType);
          const bestType = types.includes("title")
            ? "title"
            : types.includes("heading")
              ? "heading"
              : "body";
          lines.push(`${filePath} (${results.length} matches, best: ${bestType})`);
        }

        output = `Found ${allResults.length} matches${searchLabel} in ${byFile.size} files for "${query}":\n\n${lines.join("\n")}`;
      }

      return {
        content: [{ type: "text" as const, text: output }],
      };
    }
  );
}
