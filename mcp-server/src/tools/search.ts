import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { readConfig, getAllGraphPaths, walkDir } from "../utils.js";
import {
  resolveGraph,
  resolveGraphOutcome,
  GatedResolution,
  parseScopeMarker,
  PersonalScopeSession,
  confirmPersonalScopeAccess,
  CrossKgSearchSession,
} from "../resolution.js";
import { resolveInteractionMode, InteractionMode, GateResult, gate } from "../interaction.js";
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

export interface SearchError {
  error: "VALIDATION_ERROR" | "KMG_INPUT_REQUIRED";
  message?: string;
  reason?: string;
  resolveWith?: { param: string; accepts?: string[] };
  detail?: unknown;
}

// Maps a GateResult (answered/declined/cancelled/InputRequiredError) that
// couldn't be resolved into a SearchError. "answered" never reaches here --
// every gate() call site below only inspects this when there was no usable
// answer.
function gateResultToSearchError(result: GateResult): SearchError {
  if ("answer" in result) {
    return {
      error: "KMG_INPUT_REQUIRED",
      reason: "unexpected_answered_state",
      message: "Internal error: gate() answered but the caller treated it as unresolved.",
    };
  }
  if ("error" in result) {
    return {
      error: "KMG_INPUT_REQUIRED",
      reason: result.reason,
      resolveWith: result.resolveWith,
      detail: result.detail,
      message: `Input required: ${result.reason}`,
    };
  }
  if ("declined" in result) {
    return { error: "KMG_INPUT_REQUIRED", reason: "declined", message: "Resolution question was declined." };
  }
  return { error: "KMG_INPUT_REQUIRED", reason: "cancelled", message: "Resolution question was cancelled." };
}

interface ToolResponse {
  [key: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

function errorResponse(err: SearchError): ToolResponse {
  return { content: [{ type: "text" as const, text: JSON.stringify(err, null, 2) }], isError: true };
}

export interface HandleSearchParams {
  query: string;
  format?: "summary" | "paths" | "detailed";
  searchScope?: "active" | "all" | "personal-only";
  interaction?: InteractionMode;
  sticky?: boolean;
  confirmPersonalScope?: boolean;
  confirmCrossKgSearch?: boolean;
  excludeKgs?: string[];
}

export async function handleSearch(
  params: HandleSearchParams,
  personalScopeSession: PersonalScopeSession = new PersonalScopeSession(),
  crossKgSearchSession: CrossKgSearchSession = new CrossKgSearchSession()
): Promise<ToolResponse> {
  const format = params.format ?? "summary";
  const requestedScope = params.searchScope ?? "active";
  const config = readConfig();
  const mode = resolveInteractionMode({ explicitParam: params.interaction }).mode;
  const automated = mode === "automated";

  // ADR-067 Task 6.3 (spec §11): strip a leading [personal]/[project] marker
  // before the remainder is used as the actual search text.
  const { marker, remainder } = parseScopeMarker(params.query);
  const query = remainder;

  if (marker !== null && !automated) {
    if (params.sticky !== undefined) {
      personalScopeSession.applyMarker(marker, params.sticky);
    } else {
      const gated = await gate({
        mode,
        reason: "personal_scope_marker_sticky",
        param: "sticky",
        accepts: ["one-shot", "sticky"],
        // No real blocking ask() transport exists yet at this layer (spec §12) --
        // matches every other gate() call site in resolution.ts/capture.ts that
        // has no real interactive transport yet.
        ask: () => new Promise<never>(() => {}),
      });
      if (!("answer" in gated)) return errorResponse(gateResultToSearchError(gated));
      personalScopeSession.applyMarker(marker, gated.answer === "sticky");
    }
  }

  // spec §11: "no read/write asymmetry" -- this is evaluated unconditionally
  // (not just when a marker was present this call) so a scope set sticky by
  // an earlier call (via kg_search or kg_capture, same shared session) still
  // applies here.
  const effectiveScope = personalScopeSession.currentScopeFor(automated);
  let searchScope: "active" | "all" | "personal-only" = requestedScope;
  if (effectiveScope === "personal") searchScope = "personal-only";
  else if (effectiveScope === "project") searchScope = "active";

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
    const allKgs = getAllGraphPaths(config);
    if (allKgs.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: "No knowledge graphs registered. Use kg_config_init first.",
          },
        ],
        isError: true,
      };
    }

    // findings doc #14: scope:"all" is a cross-KG union-read that must be
    // gated -- naming the candidate KGs and letting the caller exclude any
    // -- unless this process-lifetime session already confirmed it (sticky
    // from an earlier call, honoring its remembered exclusions).
    let excludedNames: string[] = crossKgSearchSession.isConfirmedForSession()
      ? crossKgSearchSession.excludedNames()
      : [];

    if (!crossKgSearchSession.isConfirmedForSession()) {
      if (automated) {
        if (!params.confirmCrossKgSearch) {
          return errorResponse({
            error: "KMG_INPUT_REQUIRED",
            reason: "cross_kg_search_confirmation",
            resolveWith: { param: "confirmCrossKgSearch", accepts: ["true"] },
            detail: { candidates: allKgs.map((k) => k.name) },
            message: `This search will run across ${allKgs.length} registered KGs: ${allKgs
              .map((k) => k.name)
              .join(", ")}. Pass confirmCrossKgSearch: true (optionally with excludeKgs) to proceed.`,
          });
        }
        // Automated confirmations are per-call, not sticky -- there's no
        // interactive one-shot-vs-sticky follow-up to answer in this mode
        // (mirrors PersonalScopeSession.currentScopeFor(automated) disabling
        // ephemeral stickiness entirely for automated callers).
        excludedNames = params.excludeKgs ?? [];
      } else {
        const gated = await gate({
          mode,
          reason: "cross_kg_search_confirmation",
          param: "confirmCrossKgSearch",
          // No static `accepts` here: gate() validates answers by exact
          // membership (interaction.ts), which can only work for a fixed
          // enum or a dynamic-but-enumerable candidate list (e.g.
          // resolution.ts's `accepts: resolution.candidates`). The
          // "exclude:<name>,..." shape this question allows is genuinely
          // free-form -- it can't be enumerated ahead of time -- so this
          // call site validates the answer itself, below, instead of
          // delegating that to gate().
          detail: { candidates: allKgs.map((k) => k.name) },
          ask: () => new Promise<never>(() => {}),
        });
        if (!("answer" in gated)) return errorResponse(gateResultToSearchError(gated));
        const answer = gated.answer;
        if (answer === "cancel") {
          return { content: [{ type: "text" as const, text: "Cross-KG search cancelled." }] };
        }
        if (answer === "all") {
          excludedNames = [];
        } else if (answer.startsWith("exclude:")) {
          excludedNames = answer
            .slice("exclude:".length)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        } else {
          return errorResponse({
            error: "KMG_INPUT_REQUIRED",
            reason: "cross_kg_search_confirmation_invalid_answer",
            resolveWith: { param: "confirmCrossKgSearch", accepts: ["all", "exclude:<name>,...", "cancel"] },
            message: `Invalid answer "${answer}" for cross-KG search confirmation.`,
          });
        }

        if (params.sticky !== undefined) {
          if (params.sticky) crossKgSearchSession.confirmSession(excludedNames);
        } else {
          const stickyGated = await gate({
            mode,
            reason: "cross_kg_search_sticky",
            param: "sticky",
            accepts: ["one-shot", "sticky"],
            ask: () => new Promise<never>(() => {}),
          });
          if (!("answer" in stickyGated)) return errorResponse(gateResultToSearchError(stickyGated));
          if (stickyGated.answer === "sticky") crossKgSearchSession.confirmSession(excludedNames);
        }
      }
    }

    // Primary (cwd-resolved) KG first, then all others (ADR-067 Task 1.9
    // -- replacing config.active-based sort-first logic), applied after
    // exclusion.
    const primaryResolution = resolveGraph(config, process.cwd());
    const primaryName = primaryResolution.kind === "resolved" ? primaryResolution.name : undefined;
    const candidateKgs = allKgs.filter((k) => !excludedNames.includes(k.name));
    const primaryEntry = primaryName ? candidateKgs.find((k) => k.name === primaryName) : undefined;
    const otherKgs = primaryName ? candidateKgs.filter((k) => k.name !== primaryName) : candidateKgs;
    kgsToSearch = primaryEntry ? [primaryEntry, ...otherKgs] : otherKgs;
    if (kgsToSearch.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: "No knowledge graphs left to search after exclusions.",
          },
        ],
        isError: true,
      };
    }
  } else {
    // Default ("active"): cwd-resolved KG, routed through the same
    // gate()-backed archived/fuzzy-match/ambiguous-tie/merged/$HOME-or-root
    // handling as kg_capture (ADR-067 Task 6.2/6.3 -- replacing the plain
    // "not resolved" error this branch used as an interim placeholder).
    const resolution = resolveGraph(config, process.cwd());
    const outcome: GatedResolution = await resolveGraphOutcome(config, resolution, process.cwd(), mode);
    if (outcome.kind === "gated") return errorResponse(gateResultToSearchError(outcome.result));
    if (outcome.kind === "not-registered") {
      return {
        content: [{ type: "text" as const, text: `Unknown KG name: "${outcome.name}". Check /kmgraph:status for registered KGs.` }],
        isError: true,
      };
    }
    if (outcome.kind === "no-graph-in-cwd") {
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
    const activePath = outcome.graph.path.replace(/^~/, os.homedir());
    kgsToSearch = [{ name: outcome.name, path: activePath, type: outcome.graph.type || "project-local" }];
  }

  // spec §11: confirmPersonalScopeAccess gates every scope:"user" read
  // reachable here, whether it arrived via an explicit searchScope param or
  // a resolved [personal] marker -- symmetric with the write-side gate in
  // capture.ts.
  if (kgsToSearch.some((kg) => kg.type === "personal")) {
    const confirmed = await confirmPersonalScopeAccess(personalScopeSession, process.cwd(), {
      confirmPersonalScope: params.confirmPersonalScope,
      mode,
      ask: () => new Promise<never>(() => {}),
    });
    if (!("confirmed" in confirmed)) return errorResponse(confirmed as SearchError);
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
    : `KG (${kgsToSearch[0]?.name ?? "no active graph"})`;

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

export function registerSearchTool(
  server: McpServer,
  personalScopeSession: PersonalScopeSession,
  crossKgSearchSession: CrossKgSearchSession
): void {
  server.tool(
    "kg_search",
    "Full-text search across knowledge graph files. By default searches the active KG only. " +
      "Use searchScope='all' to include all registered KGs (project-local + personal). " +
      "The query may start with a [personal] or [project] marker to steer this call's (and " +
      "optionally this session's) scope toward the personal or project-local knowledge graph.",
    {
      query: z.string().describe(
        "Search query (case-insensitive). May start with a [personal] or [project] marker, " +
          "which is stripped before the remainder is used as the search text."
      ),
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
      interaction: z
        .enum(["interactive", "automated"])
        .optional()
        .describe(
          "Overrides auto-detected interaction mode. Automated callers receive a structured " +
            "KMG_INPUT_REQUIRED error (never a blocking question) when resolution is ambiguous."
        ),
      sticky: z
        .boolean()
        .optional()
        .describe(
          "When this query has a [personal]/[project] marker, whether the resulting scope " +
            "should persist for the rest of this session (true) or apply to this call only " +
            "(false). Required to resolve a marker without a blocking question."
        ),
      confirmPersonalScope: z
        .boolean()
        .optional()
        .describe(
          "Confirms this repo may read the personal knowledge graph. Required once per " +
            "process before a personal-scope read is honored for a repo not yet confirmed."
        ),
      confirmCrossKgSearch: z
        .boolean()
        .optional()
        .describe(
          "Confirms this call may search across every registered KG (searchScope='all'). " +
            "Required once per call in automated mode before a cross-KG search is honored, " +
            "unless the session already confirmed it earlier."
        ),
      excludeKgs: z
        .array(z.string())
        .optional()
        .describe(
          "KG names to exclude from a searchScope='all' search. Only used alongside " +
            "confirmCrossKgSearch: true."
        ),
    },
    async (params) => handleSearch(params, personalScopeSession, crossKgSearchSession)
  );
}
