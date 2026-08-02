import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { readConfig, getActiveGraphPath, getAllGraphPaths, walkDir } from "../utils.js";
import { resolveGraph } from "../resolution.js";
import { searchFts5, resolveDbPath } from "./fts5.js";
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

/** Search a single KG and return tagged results. */
function searchKg(
  kgPath: string,
  kgName: string,
  kgType: string,
  query: string
): { results: SearchResult[]; usingFts5: boolean } {
  if (!fs.existsSync(kgPath)) {
    return { results: [], usingFts5: false };
  }

  const dbPath = resolveDbPath(kgName, kgType);
  let results: SearchResult[];
  let usingFts5 = false;

  if (fs.existsSync(dbPath)) {
    try {
      results = searchFts5(dbPath, query, kgPath);
      usingFts5 = true;
    } catch (err) {
      console.error(`FTS5 search failed for ${kgName}, falling back to linear scan:`, err);
      results = [];
    }
  } else {
    results = [];
  }

  if (!usingFts5) {
    results = [];
    const searchDirs = ["concepts", "lessons-learned", "decisions", "sessions", "chat-history", "issues", "enhancements"];

    for (const dir of searchDirs) {
      const dirPath = path.join(kgPath, dir);
      const files = walkDir(dirPath, ".md");
      for (const file of files) {
        results.push(...searchFile(file, query, kgPath));
      }
    }

    const memoryPath = path.join(kgPath, "MEMORY.md");
    if (fs.existsSync(memoryPath)) {
      results.push(...searchFile(memoryPath, query, kgPath));
    }

    const typeOrder = { title: 0, heading: 1, body: 2 };
    results.sort((a, b) => typeOrder[a.matchType] - typeOrder[b.matchType]);
  }

  // Tag results with source KG
  for (const r of results) {
    r.sourceKg = kgName;
    r.sourceKgType = kgType;
  }

  return { results, usingFts5 };
}

/** Returns a human-readable source label for a result. */
function sourceLabel(r: SearchResult): string {
  if (!r.sourceKg) return "";
  const typeTag = r.sourceKgType === "personal" ? "personal" : "project";
  return ` [${typeTag}: ${r.sourceKg}]`;
}

export function registerSearchTool(server: McpServer): void {
  server.tool(
    "kg_search",
    "Full-text search across knowledge graph files. By default searches the active KG only. " +
      "Use searchScope='all' to include all registered KGs (project-local + personal).",
    {
      query: z.string().describe("Search query (case-insensitive)"),
      format: z
        .enum(["summary", "paths", "detailed"])
        .default("summary")
        .describe("Output format: summary (default), paths only, or detailed with context"),
      searchScope: z
        .enum(["active", "all", "personal-only"])
        .default("active")
        .describe(
          "Which KGs to search: active (default, active KG only), " +
            "all (active KG + all registered personal KGs), " +
            "personal-only (only KGs with type=personal)"
        ),
    },
    async ({ query, format, searchScope }) => {
      const config = readConfig();

      // Determine which KGs to query
      let kgsToSearch: Array<{ name: string; path: string; type: string }>;

      if (searchScope === "personal-only") {
        kgsToSearch = getAllGraphPaths(config, ["personal"]);
        if (kgsToSearch.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: "No personal KGs registered. Create one with /kmgraph:init-personal-kg.",
              },
            ],
          };
        }
      } else if (searchScope === "all") {
        // Active KG first, then all others
        const activePath = getActiveGraphPath(config);
        if (!activePath) {
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
        const allKgs = getAllGraphPaths(config);
        // Sort: active KG first, then others
        const activeEntry = allKgs.find((k) => k.name === config.active);
        const otherKgs = allKgs.filter((k) => k.name !== config.active);
        kgsToSearch = activeEntry ? [activeEntry, ...otherKgs] : otherKgs;
      } else {
        // Default: cwd-resolved KG only (ADR-067 Task 1.8 -- resolution is
        // context-derived, replacing config.active). fuzzy-match/archived/
        // ambiguous-tie/merged/not-registered all fall through to the same
        // error as no-graph-in-cwd for now; Task 6.2 wires each through the
        // interactivity gate with its real per-outcome behavior.
        const resolution = resolveGraph(config, process.cwd());
        if (resolution.kind !== "resolved") {
          return {
            content: [
              {
                type: "text" as const,
                text: "Error: No knowledge graph resolved from your current directory. Use kg_config_init first, or pass a graph name.",
              },
            ],
            isError: true,
          };
        }
        const activePath = resolution.graph.path.replace(/^~/, os.homedir());
        kgsToSearch = [{ name: resolution.name, path: activePath, type: resolution.graph.type || "project-local" }];
      }

      // Run search across all target KGs
      const allResults: SearchResult[] = [];
      let anyFts5 = false;

      for (const kg of kgsToSearch) {
        const { results, usingFts5 } = searchKg(kg.path, kg.name, kg.type, query);
        allResults.push(...results);
        if (usingFts5) anyFts5 = true;
      }

      // Sort merged results: project-local before global (within same match quality)
      if (kgsToSearch.length > 1) {
        const typeOrder = { title: 0, heading: 1, body: 2 };
        const kgOrder = (r: SearchResult) => r.sourceKgType === "personal" ? 1 : 0;
        allResults.sort((a, b) => {
          const kg = kgOrder(a) - kgOrder(b);
          if (kg !== 0) return kg;
          return typeOrder[a.matchType] - typeOrder[b.matchType];
        });
      }

      const isMultiKg = kgsToSearch.length > 1;
      const scopeLabel = isMultiKg
        ? `${kgsToSearch.length} KGs`
        : `active KG (${kgsToSearch[0]?.name ?? config.active})`;

      if (allResults.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `No results found for "${query}" in ${scopeLabel}.`,
            },
          ],
        };
      }

      // Format output
      const searchLabel = anyFts5 ? " (FTS5)" : "";
      let output: string;

      if (format === "paths") {
        const uniquePaths = [...new Set(allResults.map((r) => r.relativePath + (isMultiKg ? sourceLabel(r) : "")))];
        output = `Found ${allResults.length} matches${searchLabel} in ${uniquePaths.length} files across ${scopeLabel}:\n\n${uniquePaths.join("\n")}`;
      } else if (format === "detailed") {
        const formatted = allResults.map(
          (r) =>
            `[${r.matchType}${searchLabel}${isMultiKg ? sourceLabel(r) : ""}] ${r.relativePath}:${r.line}\n${r.context}\n`
        );
        output = `Found ${allResults.length} matches${searchLabel} for "${query}" across ${scopeLabel}:\n\n${formatted.join("\n---\n\n")}`;
      } else {
        // summary
        const byFile = new Map<string, SearchResult[]>();
        for (const r of allResults) {
          const key = isMultiKg ? `${r.sourceKg}:${r.relativePath}` : r.relativePath;
          const existing = byFile.get(key) || [];
          existing.push(r);
          byFile.set(key, existing);
        }

        const lines: string[] = [];
        for (const [, results] of byFile) {
          const first = results[0];
          const types = results.map((r) => r.matchType);
          const bestType = types.includes("title")
            ? "title"
            : types.includes("heading")
              ? "heading"
              : "body";
          const src = isMultiKg ? sourceLabel(first) : "";
          lines.push(`${first.relativePath}${src} (${results.length} matches, best: ${bestType})`);
        }

        output = `Found ${allResults.length} matches${searchLabel} in ${byFile.size} files across ${scopeLabel} for "${query}":\n\n${lines.join("\n")}`;
      }

      return {
        content: [{ type: "text" as const, text: output }],
      };
    }
  );
}
