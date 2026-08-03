import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as os from "os";
import { readConfig, KgConfig } from "../utils.js";
import { resolveGraph, resolvePersonalGraph, PersonalScopeSession, confirmPersonalScopeAccess } from "../resolution.js";
import { resolveInteractionMode, STUB_ASK_TIMEOUT_MS, stubAsk } from "../interaction.js";
import { resolveEffectiveCwd } from "../platform-cwd.js";

// issue-41 (Phase 7.2 Task 7.2.1): markdown commands/agents that do raw
// filesystem work (mkdir, direct writes, git ops) alongside a kg_* call — or
// entirely instead of one — had no way to obtain the cwd-resolved graph path
// without re-implementing resolveGraph()'s cwd-walk (symlink normalization,
// git-worktree remap, ambiguous-tie detection) in shell. Porting that logic
// into 12+ separate jq/python snippets would trade the retired `.active`
// bug for a new, duplicated resolution-drift bug. This tool runs the real
// resolveGraph() once and hands back a plain {name, path}, so a command's
// bash fence can consume the value as a literal instead of re-deriving it.

export interface ResolvedGraphResult {
  name: string;
  path: string;
}

// Exported separately from the tool handler so the resolution logic has a
// direct, mockable seam for tests — mirrors sanitization.ts's resolveScanPath.
export function resolveKgPath(
  config: KgConfig,
  params: { scope?: "project" | "user" },
  cwd: string = process.cwd()
): ResolvedGraphResult | { error: string } {
  if (params.scope === "user") {
    const personal = resolvePersonalGraph(config);
    if ("error" in personal) return personal;
    return { name: personal.name, path: personal.graph.path.replace(/^~/, os.homedir()) };
  }

  const resolution = resolveGraph(config, cwd);
  switch (resolution.kind) {
    case "resolved":
      return { name: resolution.name, path: resolution.graph.path.replace(/^~/, os.homedir()) };
    case "no-graph-in-cwd":
      return { error: "No knowledge graph resolved from your current directory. Run /kmgraph:kmg-init first, or pass scope:\"user\" for the personal graph." };
    case "archived":
      return { error: `Graph "${resolution.name}" is archived, not live. Choose a different graph or restore it first.` };
    case "merged": {
      // resolveGraphOutcome (the shared path kg_search/kg_capture use) treats
      // "merged" as a transparent alias, not a question — re-resolve against
      // the survivor rather than erroring, so kg_resolve agrees with what
      // those tools would actually do from the same cwd.
      const survivor = resolveGraph(config, cwd, resolution.into);
      if (survivor.kind === "resolved") {
        return { name: survivor.name, path: survivor.graph.path.replace(/^~/, os.homedir()) };
      }
      return { error: `Graph "${resolution.name}" was merged into "${resolution.into}" at ${resolution.at}, but "${resolution.into}" does not resolve.` };
    }
    case "ambiguous-tie":
      return { error: `Ambiguous: multiple registered graphs resolve to the same path (${resolution.candidates.join(", ")}). Disambiguate manually.` };
    case "fuzzy-match":
      return { error: `No exact match; did you mean one of: ${resolution.candidates.join(", ")}?` };
    case "not-registered":
      return { error: `No graph named "${resolution.name}" is registered.` };
  }
}

export function registerResolveTool(server: McpServer, personalScopeSession: PersonalScopeSession): void {
  server.tool(
    "kg_resolve",
    "Resolve the target knowledge graph's name and path from your current directory (or the personal graph via scope:\"user\") — no read or write side effects, just the resolved location",
    {
      scope: z
        .enum(["project", "user"])
        .optional()
        .describe("project (default, cwd-resolved) or user (the personal knowledge graph)"),
      confirmPersonalScope: z
        .boolean()
        .optional()
        .describe(
          "Confirms this repo may resolve the personal knowledge graph. Required once per " +
            "process before a scope:\"user\" resolution is honored for a repo not yet confirmed."
        ),
    },
    async ({ scope, confirmPersonalScope }, extra) => {
      const config = readConfig();
      const cwd = resolveEffectiveCwd({
        processCwd: process.cwd(),
        toolCallMeta: extra?._meta as Record<string, unknown> | undefined,
      });

      // ADR-067 Task 6.4-equivalent gate: scope:"user" reaches the personal
      // graph, same confirmation invariant as kg_check_sensitive/kg_search/kg_capture.
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

      const resolved = resolveKgPath(config, { scope }, cwd);
      if ("error" in resolved) {
        return {
          content: [{ type: "text" as const, text: `Error: ${resolved.error}` }],
          isError: true,
        };
      }

      return {
        content: [{ type: "text" as const, text: JSON.stringify(resolved) }],
      };
    }
  );
}
