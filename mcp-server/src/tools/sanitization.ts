import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { readConfig, getActiveGraphPath, walkDir } from "../utils.js";

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

export function registerSanitizationTool(server: McpServer): void {
  server.tool(
    "kg_check_sensitive",
    "Scan knowledge graph files for potentially sensitive information",
    {
      kgPath: z
        .string()
        .optional()
        .describe("Path to scan (defaults to active KG)"),
      patterns: z
        .array(z.string())
        .optional()
        .describe("Additional regex patterns to check (beyond defaults)"),
    },
    async ({ kgPath, patterns: customPatterns }) => {
      // Determine path to scan
      let scanPath: string;
      if (kgPath) {
        scanPath = kgPath.replace(/^~/, os.homedir());
      } else {
        const config = readConfig();
        const activePath = getActiveGraphPath(config);
        if (!activePath) {
          return {
            content: [
              {
                type: "text" as const,
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
