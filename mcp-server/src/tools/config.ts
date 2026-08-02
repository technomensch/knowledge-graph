import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import {
  readConfig,
  writeConfig,
  getPluginRoot,
  mintGraphId,
  writeGraphIdMarker,
  readGraphIdMarker,
  KgConfig,
  GraphConfig,
  CategoryConfig,
} from "../utils.js";
import { resolveGraph, resolvePersonalGraph } from "../resolution.js";

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

  // No longer writes config.active/lastUsed -- resolution is context-derived
  // (Task 1.5). This tool is fully retired in Task 6.2; until then it stays
  // registered as a harmless deprecated no-op so the rest of this phase's
  // call-site sweep isn't blocked on deleting it early.
  return {
    content: [
      {
        type: "text" as const,
        text: `'${name}' is registered at ${config.graphs[name].path}. kg_config_switch no longer changes anything -- knowledge graphs are resolved automatically from your current directory. This tool will be removed in a future release.`,
      },
    ],
  };
}

export interface HandleConfigInitParams {
  name: string;
  kgPath: string;
  type: "project-local" | "personal" | "custom";
  categories: Array<{ name: string; prefix: string | null; git: "commit" | "ignore" }>;
}

export interface HandleConfigInitResult {
  [x: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  isError?: true;
}

export async function handleConfigInit({ name, kgPath, type, categories }: HandleConfigInitParams): Promise<HandleConfigInitResult> {
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
  const newGraphId = mintGraphId();

  // Precise pre-check instead of try/catch around writeGraphIdMarker (Opus
  // review nit): a bare catch there would also swallow genuine I/O errors
  // (EACCES/ENOSPC/etc.) and mislabel them as a marker conflict. Checking
  // the existing marker directly means writeGraphIdMarker's own throw (if
  // it still somehow fires -- e.g. a race) is a real error and propagates
  // normally rather than being misreported.
  const existingMarkerId = readGraphIdMarker(expandedPath);
  if (existingMarkerId && existingMarkerId !== newGraphId) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Error: '${expandedPath}' is already tracked as a different knowledge graph (marker mismatch). If you meant to fork/re-register it, that flow isn't built yet (ADR-067 Phase 4) -- for now, remove or rename the existing .kmgraph-id marker file manually if you're certain this is intentional.`,
        },
      ],
      isError: true,
    };
  }
  writeGraphIdMarker(expandedPath, newGraphId);
  const graphConfig: GraphConfig = {
    name,
    path: kgPath,
    type,
    categories: categories as CategoryConfig[],
    createdAt: now,
    // lastUsed removed -- no writer needed once Task 1.12 deletes the field
    status: "pending",
    statusChangedAt: now,
    graphId: newGraphId,
  };

  config.graphs[name] = graphConfig;
  // config.active = name; removed -- resolution is now context-derived (Task 1.5)
  writeConfig(config);

  return {
    content: [
      {
        type: "text" as const,
        text: `Knowledge graph '${name}' initialized at ${kgPath}\nReady to use — knowledge graphs are resolved automatically from your current directory. Categories: ${categories.map((c) => c.name).join(", ")}`,
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
    async (params) => handleConfigInit(params)
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
        const cats = g.categories.map((c) => c.name).join(", ");
        return `${g.name} (${g.status ?? "active"}) — ${g.path}\n  Categories: ${cats}`;
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
    "Add a new category to a knowledge graph (default: resolved from your current directory)",
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
      scope: z
        .enum(["project", "user"])
        .optional()
        .describe("project (default, cwd-resolved) or user (the personal knowledge graph)"),
    },
    async (params) => handleConfigAddCategory(params)
  );
}

// ── Exported handler for direct testing ──────────────────────────────────────

export interface HandleConfigAddCategoryParams {
  name: string;
  prefix?: string | null;
  git?: "commit" | "ignore";
  scope?: "project" | "user";
}

export interface HandleConfigAddCategoryResult {
  [x: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  isError?: true;
}

export function handleConfigAddCategory(
  params: HandleConfigAddCategoryParams
): HandleConfigAddCategoryResult {
  const { name: catName, prefix = null, git = "commit", scope } = params;
  const config = readConfig();

  // ADR-067 Task 1.9: resolution is context-derived (resolveGraph), not
  // config.active-derived. scope:"user" reaches the personal graph, which
  // config.active could previously only reach by incidentally pointing at
  // it -- this restores that reachability explicitly.
  let target: { name: string; graph: GraphConfig } | { error: string };
  if (scope === "user") {
    target = resolvePersonalGraph(config);
  } else {
    const resolution = resolveGraph(config, process.cwd());
    target = resolution.kind === "resolved"
      ? { name: resolution.name, graph: resolution.graph }
      : { error: "No knowledge graph resolved from your current directory. Use kg_config_init first, or pass scope=\"user\"." };
  }

  if ("error" in target) {
    return { content: [{ type: "text" as const, text: `Error: ${target.error}` }], isError: true };
  }

  const { name: graphName, graph } = target;

  if (graph.categories.some((c) => c.name === catName)) {
    return {
      content: [{ type: "text" as const, text: `Error: Category '${catName}' already exists in '${graphName}'.` }],
      isError: true,
    };
  }

  const expandedPath = graph.path.replace(/^~/, os.homedir());
  const catDir = path.join(expandedPath, "lessons-learned", catName);
  fs.mkdirSync(catDir, { recursive: true });

  graph.categories.push({ name: catName, prefix, git });
  writeConfig(config);

  return {
    content: [{ type: "text" as const, text: `Category '${catName}' added to '${graphName}'.\nDirectory created: ${catDir}` }],
  };
}
