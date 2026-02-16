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
exports.registerConfigResource = registerConfigResource;
exports.registerTemplatesResource = registerTemplatesResource;
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_js_1 = require("../utils.js");
/**
 * kg://config — Exposes current kg-config.json as a read-only resource.
 * Clients can read the full configuration including all graphs, active selection,
 * and sanitization settings without needing to call a tool.
 */
function registerConfigResource(server) {
    server.resource("kg-config", "kg://config", {
        description: "Current knowledge graph configuration (all graphs, active selection, sanitization settings)",
        mimeType: "application/json",
    }, async () => {
        if (!fs.existsSync(utils_js_1.CONFIG_PATH)) {
            return {
                contents: [
                    {
                        uri: "kg://config",
                        mimeType: "application/json",
                        text: JSON.stringify({
                            error: "No configuration found",
                            hint: "Run kg_config_init to create your first knowledge graph",
                        }, null, 2),
                    },
                ],
            };
        }
        const config = (0, utils_js_1.readConfig)();
        return {
            contents: [
                {
                    uri: "kg://config",
                    mimeType: "application/json",
                    text: JSON.stringify(config, null, 2),
                },
            ],
        };
    });
}
const TEMPLATE_MAP = {
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
function registerTemplatesResource(server) {
    server.resource("kg-templates", new mcp_js_1.ResourceTemplate("kg://templates/{name}", {
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
    }), {
        description: "Knowledge graph templates for lessons, ADRs, sessions, KG entries, and more",
        mimeType: "text/markdown",
    }, async (uri, variables) => {
        const name = variables.name;
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
        const pluginRoot = (0, utils_js_1.getPluginRoot)();
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
    });
}
//# sourceMappingURL=index.js.map