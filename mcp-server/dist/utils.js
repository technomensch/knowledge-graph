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
exports.CONFIG_PATH = void 0;
exports.readConfig = readConfig;
exports.writeConfig = writeConfig;
exports.getActiveGraphPath = getActiveGraphPath;
exports.getPluginRoot = getPluginRoot;
exports.walkDir = walkDir;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
exports.CONFIG_PATH = path.join(os.homedir(), ".claude", "kg-config.json");
const DEFAULT_CONFIG = {
    version: "1.0.0",
    active: null,
    graphs: {},
    sanitization: {
        enabled: false,
        patterns: [],
        action: "warn",
    },
};
function readConfig() {
    if (!fs.existsSync(exports.CONFIG_PATH)) {
        return { ...DEFAULT_CONFIG };
    }
    const raw = fs.readFileSync(exports.CONFIG_PATH, "utf-8");
    return JSON.parse(raw);
}
function writeConfig(config) {
    const dir = path.dirname(exports.CONFIG_PATH);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(exports.CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}
function getActiveGraphPath(config) {
    if (!config.active || !config.graphs[config.active]) {
        return null;
    }
    const graphPath = config.graphs[config.active].path;
    // Expand ~ to home directory
    return graphPath.replace(/^~/, os.homedir());
}
function getPluginRoot() {
    // When running as plugin: CLAUDE_PLUGIN_ROOT is set
    // When running standalone: use parent of mcp-server directory
    return process.env.CLAUDE_PLUGIN_ROOT || path.resolve(__dirname, "..", "..");
}
/**
 * Recursively walk a directory and return all matching file paths
 */
function walkDir(dir, ext = ".md") {
    const results = [];
    if (!fs.existsSync(dir))
        return results;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...walkDir(fullPath, ext));
        }
        else if (entry.name.endsWith(ext)) {
            results.push(fullPath);
        }
    }
    return results;
}
//# sourceMappingURL=utils.js.map