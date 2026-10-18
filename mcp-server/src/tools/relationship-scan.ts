import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { readConfig, KgConfig } from "../utils.js";
import { resolveEffectiveCwd } from "../platform-cwd.js";
import { resolveKgPath } from "./resolve.js";
import { DEFAULT_HUB_MAX, RelationshipPair, scanRelationships } from "../lib/relationship-scan.js";

// ENH-062 relationship scan as a cross-platform tool: the same logic the
// kmg-paperwork-audit skill carries as an inline bash block (Step 7), for platforms that
// do not run the skill. Flags only: it never writes to the graph, and a pair the caller
// dismisses is not remembered. Unlike the skill it has no git-top-level fallback: it scans
// only a graph that resolves from the current folder (kg_resolve's rule).

export const HUB_MAX_LIMIT = 100;

export interface RelationshipScanReply {
  graph: { name: string; path: string };
  scanned: { issues: number; enhancements: number };
  pairCount: number;
  pairs: RelationshipPair[];
  warning?: string;
  note?: string;
}

export function dismissalWarning(count: number): string {
  return `relationship-scan: ${count} pair(s) flagged. Dismissing a pair here does not save anything: the same pairs reappear on every audit until a relationship is declared in either note's frontmatter.`;
}

// kg_resolve's no-graph message ends with "or pass scope:\"user\" for the personal graph",
// which does not apply here: this tool has no scope parameter and never scans the personal graph.
function rewriteResolveError(message: string): string {
  return message.replace(/,? or pass scope:"user" for the personal graph\./, ".");
}

export function buildRelationshipScanReply(
  config: KgConfig,
  params: { hubMax?: number },
  cwd: string = process.cwd()
): RelationshipScanReply | { error: string } {
  const resolved = resolveKgPath(config, {}, cwd);
  if ("error" in resolved) return { error: rewriteResolveError(resolved.error) };

  const result = scanRelationships(resolved.path, { hubMax: params.hubMax ?? DEFAULT_HUB_MAX });
  const reply: RelationshipScanReply = {
    graph: { name: resolved.name, path: resolved.path },
    scanned: result.scanned,
    pairCount: result.pairs.length,
    pairs: result.pairs,
  };
  if (!result.scannable) {
    reply.note = `relationship-scan: the graph at '${resolved.path}' has no issues/ or enhancements/ folder, so there is nothing to scan`;
  } else if (result.pairs.length > 0) {
    reply.warning = dismissalWarning(result.pairs.length);
  }
  return reply;
}

export function registerRelationshipScanTool(server: McpServer): void {
  server.tool(
    "kg_relationship_scan",
    "List pairs of issue/enhancement notes that mention the same file but declare no relationship in their frontmatter (ENH-062). Read-only: flags, never edits. Dismissing a pair is not remembered; declare the relationship in either note's frontmatter to silence it. Scans the project graph resolved from the current folder (never the personal graph). A large hubMax on a large graph can return a very large reply (tens of MB at thousands of notes), so raise it only when needed.",
    {
      hubMax: z
        .number()
        .int()
        .min(2)
        .max(HUB_MAX_LIMIT)
        .optional()
        .describe(
          `A file mentioned by more than this many notes is treated as a hub and produces no pairs (default ${DEFAULT_HUB_MAX}, maximum ${HUB_MAX_LIMIT}).`
        ),
    },
    async ({ hubMax }, extra) => {
      const config = readConfig();
      const cwd = resolveEffectiveCwd({
        processCwd: process.cwd(),
        toolCallMeta: extra?._meta as Record<string, unknown> | undefined,
      });

      const reply = buildRelationshipScanReply(config, { hubMax }, cwd);
      if ("error" in reply) {
        return { content: [{ type: "text" as const, text: `Error: ${reply.error}` }], isError: true };
      }
      return { content: [{ type: "text" as const, text: JSON.stringify(reply) }] };
    }
  );
}
