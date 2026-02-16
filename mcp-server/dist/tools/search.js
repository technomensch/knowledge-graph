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
function registerSearchTool(server) {
    server.tool("kg_search", "Full-text search across all knowledge graph files in the active KG", {
        query: zod_1.z.string().describe("Search query (case-insensitive)"),
        format: zod_1.z
            .enum(["summary", "paths", "detailed"])
            .default("summary")
            .describe("Output format: summary (default), paths only, or detailed with context"),
    }, async ({ query, format }) => {
        const config = (0, utils_js_1.readConfig)();
        const kgPath = (0, utils_js_1.getActiveGraphPath)(config);
        if (!kgPath) {
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
        if (!fs.existsSync(kgPath)) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error: Active KG path does not exist: ${kgPath}`,
                    },
                ],
                isError: true,
            };
        }
        // Search across all KG directories
        const searchDirs = [
            "knowledge",
            "lessons-learned",
            "decisions",
            "sessions",
        ];
        const allResults = [];
        for (const dir of searchDirs) {
            const dirPath = path.join(kgPath, dir);
            const files = (0, utils_js_1.walkDir)(dirPath, ".md");
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
        if (allResults.length === 0) {
            return {
                content: [
                    {
                        type: "text",
                        text: `No results found for "${query}" in active KG (${config.active}).`,
                    },
                ],
            };
        }
        // Sort: title matches first, then headings, then body
        const typeOrder = { title: 0, heading: 1, body: 2 };
        allResults.sort((a, b) => typeOrder[a.matchType] - typeOrder[b.matchType]);
        // Format output
        let output;
        if (format === "paths") {
            const uniquePaths = [...new Set(allResults.map((r) => r.relativePath))];
            output = `Found ${allResults.length} matches in ${uniquePaths.length} files:\n\n${uniquePaths.join("\n")}`;
        }
        else if (format === "detailed") {
            const formatted = allResults.map((r) => `[${r.matchType}] ${r.relativePath}:${r.line}\n${r.context}\n`);
            output = `Found ${allResults.length} matches for "${query}":\n\n${formatted.join("\n---\n\n")}`;
        }
        else {
            // summary
            const byFile = new Map();
            for (const r of allResults) {
                const existing = byFile.get(r.relativePath) || [];
                existing.push(r);
                byFile.set(r.relativePath, existing);
            }
            const lines = [];
            for (const [filePath, results] of byFile) {
                const types = results.map((r) => r.matchType);
                const bestType = types.includes("title")
                    ? "title"
                    : types.includes("heading")
                        ? "heading"
                        : "body";
                lines.push(`${filePath} (${results.length} matches, best: ${bestType})`);
            }
            output = `Found ${allResults.length} matches in ${byFile.size} files for "${query}":\n\n${lines.join("\n")}`;
        }
        return {
            content: [{ type: "text", text: output }],
        };
    });
}
//# sourceMappingURL=search.js.map