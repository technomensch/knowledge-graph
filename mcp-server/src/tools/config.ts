import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import {
  readConfig,
  writeConfig,
  getPluginRoot,
  KgConfig,
  GraphConfig,
  CategoryConfig,
} from "../utils.js";

// ── Exported handler for direct testing ──────────────────────────────────────

export interface HandleConfigSwitchParams {
  name: string;
}

export interface HandleConfigSwitchResult {
  [x: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  isError?: true;
}

export function handleConfigSwitch(
  params: HandleConfigSwitchParams
): HandleConfigSwitchResult {
  const { name } = params;
  const config = readConfig();

  if (!config.graphs[name]) {
    const available = Object.keys(config.graphs).join(", ");
    return {
      content: [
        {
          type: "text" as const,
          text: `Error: Knowledge graph '${name}' not found. Available: ${available || "none"}`,
        },
      ],
      isError: true,
    };
  }

  const prev = config.active;
  config.active = name;
  config.graphs[name].lastUsed = new Date().toISOString();
  writeConfig(config);

  return {
    content: [
      {
        type: "text" as const,
        text: `Switched from '${prev}' to '${name}'\nLocation: ${config.graphs[name].path}`,
      },
    ],
  };
}

export function registerConfigTools(server: McpServer): void {
  // ── kg_config_init ──────────────────────────────────────────────
  server.tool(
    "kg_config_init",
    "Create a new knowledge graph: directory structure + config entry",
    {
      name: z.string().min(1).describe("Unique name for this knowledge graph"),
      kgPath: z.string().describe("Absolute path where KG should be created"),
      type: z
        .enum(["project-local", "personal", "custom"])
        .default("project-local")
        .describe("KG type"),
      categories: z
        .array(
          z.object({
            name: z.string(),
            prefix: z.string().nullable().default(null),
            git: z.enum(["commit", "ignore"]).default("commit"),
          })
        )
        .default([
          { name: "architecture", prefix: null, git: "commit" },
          { name: "process", prefix: null, git: "commit" },
          { name: "patterns", prefix: null, git: "commit" },
        ])
        .describe("Categories to create"),
    },
    async ({ name, kgPath, type, categories }) => {
      const config = readConfig();

      // Validate name doesn't exist
      if (config.graphs[name]) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: Knowledge graph '${name}' already exists. Use kg_config_switch to activate it.`,
            },
          ],
          isError: true,
        };
      }

      // Expand path
      const expandedPath = kgPath.replace(/^~/, os.homedir());

      // Create directory structure
      const dirs = [
        "knowledge",
        "lessons-learned",
        "decisions",
        "sessions",
        "chat-history",
        "tmp",
      ];
      for (const dir of dirs) {
        fs.mkdirSync(path.join(expandedPath, dir), { recursive: true });
      }

      // Create category subdirectories
      for (const cat of categories) {
        fs.mkdirSync(
          path.join(expandedPath, "lessons-learned", cat.name),
          { recursive: true }
        );
      }

      // Copy templates from plugin
      const pluginRoot = getPluginRoot();
      const templateSrc = path.join(pluginRoot, "core", "default-templates");

      if (fs.existsSync(templateSrc)) {
        // Copy knowledge templates
        const knowledgeTemplates = [
          "patterns.md",
          "gotchas.md",
          "concepts.md",
          "architecture.md",
          "workflows.md",
        ];
        for (const t of knowledgeTemplates) {
          const src = path.join(templateSrc, "knowledge", "templates", t);
          const dest = path.join(expandedPath, "knowledge", t);
          if (fs.existsSync(src) && !fs.existsSync(dest)) {
            fs.copyFileSync(src, dest);
          }
        }

        // Copy lesson templates
        const lessonSrc = path.join(templateSrc, "lessons-learned");
        const lessonDest = path.join(expandedPath, "lessons-learned");
        for (const t of ["README.md", "lesson-template.md"]) {
          const src = path.join(lessonSrc, t);
          const dest = path.join(lessonDest, t);
          if (fs.existsSync(src) && !fs.existsSync(dest)) {
            fs.copyFileSync(src, dest);
          }
        }

        // Copy ADR templates
        const adrSrc = path.join(templateSrc, "decisions");
        const adrDest = path.join(expandedPath, "decisions");
        for (const t of ["README.md", "ADR-template.md"]) {
          const src = path.join(adrSrc, t);
          const dest = path.join(adrDest, t);
          if (fs.existsSync(src) && !fs.existsSync(dest)) {
            fs.copyFileSync(src, dest);
          }
        }

        // Copy session template
        const sessSrc = path.join(templateSrc, "sessions", "session-template.md");
        const sessDest = path.join(expandedPath, "sessions", "session-template.md");
        if (fs.existsSync(sessSrc) && !fs.existsSync(sessDest)) {
          fs.copyFileSync(sessSrc, sessDest);
        }

        // Copy root scaffold files (me.md, rules.md, kg-index.md, triggers.md)
        const rootScaffolds = ["me.md", "rules.md", "kg-index.md", "triggers.md"];
        for (const f of rootScaffolds) {
          const src = path.join(templateSrc, "knowledge", f);
          const dest = path.join(expandedPath, f);
          if (fs.existsSync(src) && !fs.existsSync(dest)) {
            fs.copyFileSync(src, dest);
          }
        }

        // Copy kg-category-index.md to knowledge/ subdir
        const catIndexSrc = path.join(templateSrc, "knowledge", "kg-category-index.md");
        const catIndexDest = path.join(expandedPath, "knowledge", "kg-category-index.md");
        if (fs.existsSync(catIndexSrc) && !fs.existsSync(catIndexDest)) {
          fs.copyFileSync(catIndexSrc, catIndexDest);
        }
      }

      // Write config entry
      const now = new Date().toISOString();
      const graphConfig: GraphConfig = {
        name,
        path: kgPath,
        type,
        categories: categories as CategoryConfig[],
        createdAt: now,
        lastUsed: now,
        // Placeholder only (Task 1.1 Step 5) -- real mint-and-marker-write
        // logic lands in Task 1.9 Step 7.5, once mintGraphId/writeGraphIdMarker
        // (Task 1.2) exist.
        status: "pending",
        statusChangedAt: now,
        graphId: "placeholder-graph-id",
      };

      config.graphs[name] = graphConfig;
      config.active = name;
      writeConfig(config);

      return {
        content: [
          {
            type: "text" as const,
            text: `Knowledge graph '${name}' initialized at ${kgPath}\nSet as active. Categories: ${categories.map((c) => c.name).join(", ")}`,
          },
        ],
      };
    }
  );

  // ── kg_config_list ──────────────────────────────────────────────
  server.tool(
    "kg_config_list",
    "List all configured knowledge graphs",
    {},
    async () => {
      const config = readConfig();
      const graphs = Object.values(config.graphs);

      if (graphs.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "No knowledge graphs configured. Use kg_config_init to create one.",
            },
          ],
        };
      }

      const lines = graphs.map((g) => {
        const active = g.name === config.active ? " (active)" : "";
        const cats = g.categories.map((c) => c.name).join(", ");
        return `${g.name}${active} — ${g.path}\n  Categories: ${cats}\n  Last used: ${g.lastUsed}`;
      });

      return {
        content: [
          {
            type: "text" as const,
            text: `Knowledge Graphs (${graphs.length}):\n\n${lines.join("\n\n")}`,
          },
        ],
      };
    }
  );

  // ── kg_config_switch ────────────────────────────────────────────
  server.tool(
    "kg_config_switch",
    "Change the active knowledge graph",
    {
      name: z.string().describe("Name of the knowledge graph to activate"),
    },
    async ({ name }) => handleConfigSwitch({ name })
  );

  // ── kg_config_add_category ──────────────────────────────────────
  server.tool(
    "kg_config_add_category",
    "Add a new category to the active knowledge graph",
    {
      name: z.string().describe("Category name (e.g., 'security', 'ml-ops')"),
      prefix: z
        .string()
        .nullable()
        .default(null)
        .describe("Optional prefix for lessons in this category (e.g., 'sec-')"),
      git: z
        .enum(["commit", "ignore"])
        .default("commit")
        .describe("Git strategy for this category"),
    },
    async ({ name: catName, prefix, git }) => {
      const config = readConfig();

      if (!config.active || !config.graphs[config.active]) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Error: No active knowledge graph. Use kg_config_init or kg_config_switch first.",
            },
          ],
          isError: true,
        };
      }

      const graph = config.graphs[config.active];

      // Check if category already exists
      if (graph.categories.some((c) => c.name === catName)) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: Category '${catName}' already exists in '${config.active}'.`,
            },
          ],
          isError: true,
        };
      }

      // Create directory
      const expandedPath = graph.path.replace(/^~/, os.homedir());
      const catDir = path.join(expandedPath, "lessons-learned", catName);
      fs.mkdirSync(catDir, { recursive: true });

      // Add to config
      graph.categories.push({ name: catName, prefix, git });
      writeConfig(config);

      return {
        content: [
          {
            type: "text" as const,
            text: `Category '${catName}' added to '${config.active}'.\nDirectory created: ${catDir}`,
          },
        ],
      };
    }
  );
}
