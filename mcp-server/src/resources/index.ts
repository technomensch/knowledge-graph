import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as fs from "fs";
import * as path from "path";
import { readConfig, CONFIG_PATH, getPluginRoot } from "../utils.js";

/**
 * kg://config — Exposes current kg-config.json as a read-only resource.
 * Clients can read the full configuration including all graphs, active selection,
 * and sanitization settings without needing to call a tool.
 */
export function registerConfigResource(server: McpServer): void {
  server.resource(
    "kg-config",
    "kg://config",
    {
      description: "Current knowledge graph configuration (all graphs, active selection, sanitization settings)",
      mimeType: "application/json",
    },
    async () => {
      if (!fs.existsSync(CONFIG_PATH)) {
        return {
          contents: [
            {
              uri: "kg://config",
              mimeType: "application/json",
              text: JSON.stringify(
                {
                  error: "No configuration found",
                  hint: "Run kg_config_init to create your first knowledge graph",
                },
                null,
                2
              ),
            },
          ],
        };
      }

      const config = readConfig();
      return {
        contents: [
          {
            uri: "kg://config",
            mimeType: "application/json",
            text: JSON.stringify(config, null, 2),
          },
        ],
      };
    }
  );
}

/**
 * kg://templates/{name} — Exposes template files from core/templates/.
 * Clients can discover available templates and read their contents.
 * Template names map to paths:
 *   "lesson"          → core/templates/lessons-learned/lesson-template.md
 *   "adr"             → core/templates/decisions/ADR-template.md
 *   "session"         → core/templates/sessions/session-template.md
 *   "memory"          → core/templates/MEMORY-template.md
 *   "patterns"        → core/templates/knowledge/patterns.md
 *   "gotchas"         → core/templates/knowledge/gotchas.md
 *   "concepts"        → core/templates/knowledge/concepts.md
 *   "architecture"    → core/templates/knowledge/architecture.md
 *   "workflows"       → core/templates/knowledge/workflows.md
 *   "index"           → core/templates/knowledge/index.md
 *   "entry"           → core/templates/knowledge/entry-template.md
 *   "meta-issue"      → core/templates/meta-issue/README.md
 */

interface TemplateMapping {
  path: string;
  description: string;
}

const TEMPLATE_MAP: Record<string, TemplateMapping> = {
  lesson: {
    path: "core/templates/lessons-learned/lesson-template.md",
    description: "Lesson-learned template with git metadata frontmatter",
  },
  adr: {
    path: "core/templates/decisions/ADR-template.md",
    description: "Architecture Decision Record template",
  },
  session: {
    path: "core/templates/sessions/session-template.md",
    description: "Session summary template",
  },
  memory: {
    path: "core/templates/MEMORY-template.md",
    description: "Starter MEMORY.md template for new projects",
  },
  patterns: {
    path: "core/templates/knowledge/patterns.md",
    description: "Knowledge graph patterns template",
  },
  gotchas: {
    path: "core/templates/knowledge/gotchas.md",
    description: "Knowledge graph gotchas template",
  },
  concepts: {
    path: "core/templates/knowledge/concepts.md",
    description: "Knowledge graph concepts template",
  },
  architecture: {
    path: "core/templates/knowledge/architecture.md",
    description: "Knowledge graph architecture template",
  },
  workflows: {
    path: "core/templates/knowledge/workflows.md",
    description: "Knowledge graph workflows template",
  },
  index: {
    path: "core/templates/knowledge/index.md",
    description: "Knowledge graph master navigation hub template",
  },
  entry: {
    path: "core/templates/knowledge/entry-template.md",
    description: "Template for new KG entries",
  },
  "meta-issue": {
    path: "core/templates/meta-issue/README.md",
    description: "Meta-issue navigation hub template",
  },
  "meta-issue-description": {
    path: "core/templates/meta-issue/description.md",
    description: "Meta-issue living document template",
  },
  "meta-issue-log": {
    path: "core/templates/meta-issue/implementation-log.md",
    description: "Meta-issue attempt timeline template",
  },
  "meta-issue-tests": {
    path: "core/templates/meta-issue/test-cases.md",
    description: "Meta-issue validation criteria template",
  },
  "lessons-readme": {
    path: "core/templates/lessons-learned/README.md",
    description: "Lessons-learned master index template",
  },
  "decisions-readme": {
    path: "core/templates/decisions/README.md",
    description: "ADR index template",
  },
};

export function registerTemplatesResource(server: McpServer): void {
  server.resource(
    "kg-templates",
    new ResourceTemplate("kg://templates/{name}", {
      list: async () => {
        // Return all available templates as listable resources
        return {
          resources: Object.entries(TEMPLATE_MAP).map(([name, info]) => ({
            uri: `kg://templates/${name}`,
            name: `template:${name}`,
            description: info.description,
            mimeType: "text/markdown",
          })),
        };
      },
    }),
    {
      description: "Knowledge graph templates for lessons, ADRs, sessions, KG entries, and more",
      mimeType: "text/markdown",
    },
    async (uri, variables) => {
      const name = variables.name as string;
      const templateInfo = TEMPLATE_MAP[name];

      if (!templateInfo) {
        const available = Object.keys(TEMPLATE_MAP).join(", ");
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "text/plain",
              text: `Error: Unknown template '${name}'. Available templates: ${available}`,
            },
          ],
        };
      }

      const pluginRoot = getPluginRoot();
      const templatePath = path.join(pluginRoot, templateInfo.path);

      if (!fs.existsSync(templatePath)) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "text/plain",
              text: `Error: Template file not found at ${templatePath}. The plugin may not be fully installed.`,
            },
          ],
        };
      }

      const content = fs.readFileSync(templatePath, "utf-8");
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "text/markdown",
            text: content,
          },
        ],
      };
    }
  );
}
