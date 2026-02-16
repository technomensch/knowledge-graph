import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { getPluginRoot } from "../utils.js";

export function registerScaffoldTool(server: McpServer): void {
  server.tool(
    "kg_scaffold",
    "Create a file from a template with variable substitution",
    {
      template: z
        .string()
        .describe(
          "Template path relative to core/templates/ (e.g., 'lessons-learned/lesson-template.md')"
        ),
      variables: z
        .record(z.string(), z.string())
        .default({})
        .describe(
          "Variables to substitute in template (e.g., {title: 'My Lesson', date: '2026-02-13'})"
        ),
      outputPath: z
        .string()
        .describe("Absolute path where the file should be created"),
    },
    async ({ template, variables, outputPath }) => {
      const pluginRoot = getPluginRoot();
      const templatePath = path.join(pluginRoot, "core", "templates", template);

      // Validate template exists
      if (!fs.existsSync(templatePath)) {
        // List available templates
        const templatesDir = path.join(pluginRoot, "core", "templates");
        let available = "Template directory not found.";
        if (fs.existsSync(templatesDir)) {
          const files = listTemplates(templatesDir, templatesDir);
          available = `Available templates:\n${files.join("\n")}`;
        }

        return {
          content: [
            {
              type: "text" as const,
              text: `Error: Template not found: ${template}\n\n${available}`,
            },
          ],
          isError: true,
        };
      }

      // Read template
      let content = fs.readFileSync(templatePath, "utf-8");

      // Substitute variables
      // Supports: {{VARIABLE}}, {variable}, VARIABLE_NAME (uppercase placeholders)
      for (const [key, value] of Object.entries(variables) as [string, string][]) {
        // Replace {{key}}, {key}, and UPPERCASE_KEY patterns
        content = content.replace(
          new RegExp(`\\{\\{${key}\\}\\}`, "g"),
          value
        );
        content = content.replace(new RegExp(`\\{${key}\\}`, "g"), value);
        content = content.replace(
          new RegExp(key.toUpperCase().replace(/-/g, "_"), "g"),
          value
        );
      }

      // Auto-substitute common variables if not explicitly provided
      const now = new Date();
      const autoVars: Record<string, string> = {
        YYYY: now.getFullYear().toString(),
        "MM-DD": `${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`,
        "YYYY-MM-DD": now.toISOString().split("T")[0],
        "YYYY-MM-DDTHH:MM:SSZ": now.toISOString(),
        YOUR_NAME: process.env.USER || process.env.USERNAME || "unknown",
      };

      for (const [key, value] of Object.entries(autoVars) as [string, string][]) {
        if (!variables[key]) {
          content = content.replace(new RegExp(key, "g"), value);
        }
      }

      // Expand output path
      const expandedOutput = outputPath.replace(/^~/, os.homedir());

      // Create parent directories
      const parentDir = path.dirname(expandedOutput);
      fs.mkdirSync(parentDir, { recursive: true });

      // Check if file exists
      if (fs.existsSync(expandedOutput)) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: File already exists: ${expandedOutput}\nUse a different path or delete the existing file first.`,
            },
          ],
          isError: true,
        };
      }

      // Write file
      fs.writeFileSync(expandedOutput, content, "utf-8");

      return {
        content: [
          {
            type: "text" as const,
            text: `Created: ${expandedOutput}\nTemplate: ${template}\nVariables substituted: ${Object.keys(variables).join(", ") || "none (auto-vars only)"}`,
          },
        ],
      };
    }
  );
}

function listTemplates(dir: string, baseDir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listTemplates(fullPath, baseDir));
    } else if (entry.name.endsWith(".md")) {
      results.push(path.relative(baseDir, fullPath));
    }
  }
  return results;
}
