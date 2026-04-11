"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSearchTool = registerSearchTool;
const zod_1 = require("zod");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_js_1 = require("../utils.js");
const fts5_js_1 = require("./fts5.js");
function searchFile(filePath, query, basePath) {
    const results = [];
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n");
    const queryLower = query.toLowerCase();
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineLower = line.toLowerCase();
        if (lineLower.includes(queryLower)) {
            let matchType = "body";
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
function searchKg(kgPath, kgName, kgType, query) {
    if (!fs.existsSync(kgPath)) {
        return { results: [], usingFts5: false };
    }
    const dbPath = (0, fts5_js_1.getFTS5DbPath)(kgName);
    let results;
    let usingFts5 = false;
    if (fs.existsSync(dbPath)) {
        try {
            results = (0, fts5_js_1.searchFts5)(dbPath, query, kgPath);
            usingFts5 = true;
        }
        catch (err) {
            console.error(`FTS5 search failed for ${kgName}, falling back to linear scan:`, err);
            results = [];
        }
    }
    else {
        results = [];
    }
    if (!usingFts5) {
        results = [];
        const searchDirs = ["knowledge", "lessons-learned", "decisions", "sessions"];
        for (const dir of searchDirs) {
            const dirPath = path.join(kgPath, dir);
            const files = (0, utils_js_1.walkDir)(dirPath, ".md");
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
function sourceLabel(r) {
    if (!r.sourceKg)
        return "";
    const typeTag = r.sourceKgType === "personal" ? "personal" : "project";
    return ` [${typeTag}: ${r.sourceKg}]`;
}
function registerSearchTool(server) {
    server.tool("kg_search", "Full-text search across knowledge graph files. By default searches the active KG only. " +
        "Use searchScope='all' to include all registered KGs (project-local + personal).", {
        query: zod_1.z.string().describe("Search query (case-insensitive)"),
        format: zod_1.z
            .enum(["summary", "paths", "detailed"])
            .default("summary")
            .describe("Output format: summary (default), paths only, or detailed with context"),
        searchScope: zod_1.z
            .enum(["active", "all", "personal-only"])
            .default("active")
            .describe("Which KGs to search: active (default, active KG only), " +
            "all (active KG + all registered personal KGs), " +
            "personal-only (only KGs with type=personal)"),
    }, async ({ query, format, searchScope }) => {
        const config = (0, utils_js_1.readConfig)();
        // Determine which KGs to query
        let kgsToSearch;
        if (searchScope === "personal-only") {
            kgsToSearch = (0, utils_js_1.getAllGraphPaths)(config, ["personal"]);
            if (kgsToSearch.length === 0) {
                return {
                    content: [
                        {
                            type: "text",
                            text: "No personal KGs registered. Create one with /kmgraph:init-personal-kg.",
                        },
                    ],
                };
            }
        }
        else if (searchScope === "all") {
            // Active KG first, then all others
            const activePath = (0, utils_js_1.getActiveGraphPath)(config);
            if (!activePath) {
                return {
                    content: [
                        {
                            type: "text",
                            text: "Error: No active knowledge graph. Use kg_config_init or kg_config_switch first.",
                        },
                    ],
                    isError: true,
                };
            }
            const allKgs = (0, utils_js_1.getAllGraphPaths)(config);
            // Sort: active KG first, then others
            const activeEntry = allKgs.find((k) => k.name === config.active);
            const otherKgs = allKgs.filter((k) => k.name !== config.active);
            kgsToSearch = activeEntry ? [activeEntry, ...otherKgs] : otherKgs;
        }
        else {
            // Default: active KG only
            const activePath = (0, utils_js_1.getActiveGraphPath)(config);
            if (!activePath) {
                return {
                    content: [
                        {
                            type: "text",
                            text: "Error: No active knowledge graph. Use kg_config_init or kg_config_switch first.",
                        },
                    ],
                    isError: true,
                };
            }
            const activeType = config.active && config.graphs[config.active]
                ? (config.graphs[config.active].type || "project-local")
                : "project-local";
            kgsToSearch = [{ name: config.active, path: activePath, type: activeType }];
        }
        // Run search across all target KGs
        const allResults = [];
        let anyFts5 = false;
        for (const kg of kgsToSearch) {
            const { results, usingFts5 } = searchKg(kg.path, kg.name, kg.type, query);
            allResults.push(...results);
            if (usingFts5)
                anyFts5 = true;
        }
        // Sort merged results: project-local before global (within same match quality)
        if (kgsToSearch.length > 1) {
            const typeOrder = { title: 0, heading: 1, body: 2 };
            const kgOrder = (r) => r.sourceKgType === "personal" ? 1 : 0;
            allResults.sort((a, b) => {
                const kg = kgOrder(a) - kgOrder(b);
                if (kg !== 0)
                    return kg;
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
                        type: "text",
                        text: `No results found for "${query}" in ${scopeLabel}.`,
                    },
                ],
            };
        }
        // Format output
        const searchLabel = anyFts5 ? " (FTS5)" : "";
        let output;
        if (format === "paths") {
            const uniquePaths = [...new Set(allResults.map((r) => r.relativePath + (isMultiKg ? sourceLabel(r) : "")))];
            output = `Found ${allResults.length} matches${searchLabel} in ${uniquePaths.length} files across ${scopeLabel}:\n\n${uniquePaths.join("\n")}`;
        }
        else if (format === "detailed") {
            const formatted = allResults.map((r) => `[${r.matchType}${searchLabel}${isMultiKg ? sourceLabel(r) : ""}] ${r.relativePath}:${r.line}\n${r.context}\n`);
            output = `Found ${allResults.length} matches${searchLabel} for "${query}" across ${scopeLabel}:\n\n${formatted.join("\n---\n\n")}`;
        }
        else {
            // summary
            const byFile = new Map();
            for (const r of allResults) {
                const key = isMultiKg ? `${r.sourceKg}:${r.relativePath}` : r.relativePath;
                const existing = byFile.get(key) || [];
                existing.push(r);
                byFile.set(key, existing);
            }
            const lines = [];
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
            content: [{ type: "text", text: output }],
        };
    });
}
//# sourceMappingURL=search.js.map