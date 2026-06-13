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
 * kg://templates/{name} — Exposes template files from core/default-templates/.
 * Clients can discover available templates and read their contents.
 * Template names map to paths:
 *   "lesson"          → core/default-templates/lessons-learned/lesson-template.md
 *   "adr"             → core/default-templates/decisions/ADR-template.md
 *   "session"         → core/default-templates/sessions/session-template.md
 *   "memory"          → core/default-templates/MEMORY-template.md
 *   "patterns"        → core/default-templates/concepts/patterns.md
 *   "gotchas"         → core/default-templates/concepts/gotchas.md
 *   "concepts"        → core/default-templates/concepts/concepts.md
 *   "architecture"    → core/default-templates/concepts/architecture.md
 *   "workflows"       → core/default-templates/concepts/workflows.md
 *   "index"           → core/default-templates/concepts/index.md
 *   "entry"           → core/default-templates/concepts/entry-template.md
 *   "meta-issue"      → core/default-templates/meta-issue/README.md
 */

interface TemplateMapping {
  path: string;
  description: string;
}

const TEMPLATE_MAP: Record<string, TemplateMapping> = {
  lesson: {
    path: "core/default-templates/lessons-learned/lesson-template.md",
    description: "Lesson-learned template with git metadata frontmatter",
  },
  adr: {
    path: "core/default-templates/decisions/ADR-template.md",
    description: "Architecture Decision Record template",
  },
  session: {
    path: "core/default-templates/sessions/session-template.md",
    description: "Session summary template",
  },
  memory: {
    path: "core/default-templates/MEMORY-template.md",
    description: "Starter MEMORY.md template for new projects",
  },
  patterns: {
    path: "core/default-templates/concepts/patterns.md",
    description: "Knowledge graph patterns template",
  },
  gotchas: {
    path: "core/default-templates/concepts/gotchas.md",
    description: "Knowledge graph gotchas template",
  },
  concepts: {
    path: "core/default-templates/concepts/concepts.md",
    description: "Knowledge graph concepts template",
  },
  architecture: {
    path: "core/default-templates/concepts/architecture.md",
    description: "Knowledge graph architecture template",
  },
  workflows: {
    path: "core/default-templates/concepts/workflows.md",
    description: "Knowledge graph workflows template",
  },
  index: {
    path: "core/default-templates/concepts/index.md",
    description: "Knowledge graph master navigation hub template",
  },
  entry: {
    path: "core/default-templates/concepts/entry-template.md",
    description: "Template for new KG entries",
  },
  "meta-issue": {
    path: "core/default-templates/meta-issue/README.md",
    description: "Meta-issue navigation hub template",
  },
  "meta-issue-description": {
    path: "core/default-templates/meta-issue/description.md",
    description: "Meta-issue living document template",
  },
  "meta-issue-log": {
    path: "core/default-templates/meta-issue/implementation-log.md",
    description: "Meta-issue attempt timeline template",
  },
  "meta-issue-tests": {
    path: "core/default-templates/meta-issue/test-cases.md",
    description: "Meta-issue validation criteria template",
  },
  "lessons-readme": {
    path: "core/default-templates/lessons-learned/README.md",
    description: "Lessons-learned master index template",
  },
  "decisions-readme": {
    path: "core/default-templates/decisions/README.md",
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
