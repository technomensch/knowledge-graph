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
exports.registerSanitizationTool = registerSanitizationTool;
const zod_1 = require("zod");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const utils_js_1 = require("../utils.js");
const DEFAULT_PATTERNS = [
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
function registerSanitizationTool(server) {
    server.tool("kg_check_sensitive", "Scan knowledge graph files for potentially sensitive information", {
        kgPath: zod_1.z
            .string()
            .optional()
            .describe("Path to scan (defaults to active KG)"),
        patterns: zod_1.z
            .array(zod_1.z.string())
            .optional()
            .describe("Additional regex patterns to check (beyond defaults)"),
    }, async ({ kgPath, patterns: customPatterns }) => {
        // Determine path to scan
        let scanPath;
        if (kgPath) {
            scanPath = kgPath.replace(/^~/, os.homedir());
        }
        else {
            const config = (0, utils_js_1.readConfig)();
            const activePath = (0, utils_js_1.getActiveGraphPath)(config);
            if (!activePath) {
                return {
                    content: [
                        {
                            type: "text",
                            text: "Error: No active KG and no path specified.",
                        },
                    ],
                    isError: true,
                };
            }
            scanPath = activePath;
        }
        if (!fs.existsSync(scanPath)) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error: Path does not exist: ${scanPath}`,
                    },
                ],
                isError: true,
            };
        }
        // Build pattern list
        const allPatterns = [...DEFAULT_PATTERNS];
        // Add custom patterns from config
        const config = (0, utils_js_1.readConfig)();
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
        const files = (0, utils_js_1.walkDir)(scanPath, ".md");
        const violations = [];
        for (const file of files) {
            // Skip template files
            if (file.includes("template") || file.includes("TEMPLATE"))
                continue;
            const content = fs.readFileSync(file, "utf-8");
            const lines = content.split("\n");
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                // Skip YAML frontmatter delimiters and comment lines
                if (line.trim() === "---" || line.startsWith("<!--"))
                    continue;
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
                        type: "text",
                        text: `✅ No sensitive data found in ${scanPath}\nScanned ${files.length} files with ${allPatterns.length} patterns.`,
                    },
                ],
            };
        }
        // Format report
        const report = violations
            .map((v) => `- ${v.file}:${v.line} — [${v.type}] ${v.match}`)
            .join("\n");
        return {
            content: [
                {
                    type: "text",
                    text: `⚠️ Potential sensitive data found (${violations.length} violations):\n\n${report}\n\nReview these entries before pushing to public repository.`,
                },
            ],
        };
    });
}
//# sourceMappingURL=sanitization.js.map