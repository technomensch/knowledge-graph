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
exports.validateMetadata = validateMetadata;
exports.deriveFileName = deriveFileName;
exports.generateFrontmatter = generateFrontmatter;
exports.resolveTargetPath = resolveTargetPath;
exports.checkExistingFile = checkExistingFile;
exports.updateReadmeIndex = updateReadmeIndex;
exports.handleCapture = handleCapture;
exports.registerCaptureTool = registerCaptureTool;
const zod_1 = require("zod");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_js_1 = require("../utils.js");
const fts5_js_1 = require("./fts5.js");
function slugify(str) {
    return str
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "");
}
function todayIso() {
    return new Date().toISOString().slice(0, 10);
}
function validateMetadata(metadata) {
    if (!metadata.title || metadata.title.trim() === "") {
        return { error: "VALIDATION_ERROR", message: "metadata.title is required" };
    }
    if (!metadata.tags)
        metadata.tags = [];
    return metadata;
}
function deriveFileName(type, metadata, adrNumber) {
    if (type === "lesson") {
        const titlePascal = metadata.title
            .split(/[\s_-]+/)
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join("_");
        if (metadata.category) {
            const catPascal = metadata.category
                .split(/[\s_-]+/)
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                .join("_");
            return `Lessons_Learned_${catPascal}_${titlePascal}.md`;
        }
        return `Lessons_Learned_${titlePascal}.md`;
    }
    if (type === "session") {
        return `${todayIso()}-${slugify(metadata.title)}.md`;
    }
    if (type === "adr") {
        const num = String(adrNumber ?? 1).padStart(3, "0");
        return `ADR-${num}-${slugify(metadata.title)}.md`;
    }
    return `${slugify(metadata.title)}.md`;
}
function generateFrontmatter(type, metadata) {
    const now = new Date().toISOString();
    const today = todayIso();
    const lines = ["---"];
    if (type === "lesson") {
        lines.push(`title: "${metadata.title.replace(/"/g, '\\"')}"`);
        lines.push(`created: ${now}`);
        lines.push(`updated: ${now}`);
        if (metadata.git?.author)
            lines.push(`author: ${metadata.git.author}`);
        if (metadata.git) {
            lines.push("git:");
            if (metadata.git.branch)
                lines.push(`  branch: ${metadata.git.branch}`);
            if (metadata.git.commit)
                lines.push(`  commit: ${metadata.git.commit}`);
        }
        if (metadata.tags && metadata.tags.length > 0) {
            lines.push(`tags: [${metadata.tags.join(", ")}]`);
        }
        if (metadata.category)
            lines.push(`category: ${metadata.category}`);
        if (metadata.version)
            lines.push(`version: "${metadata.version}"`);
    }
    else if (type === "session") {
        lines.push(`title: "${metadata.title.replace(/"/g, '\\"')}"`);
        lines.push(`date: ${today}`);
        if (metadata.git?.branch)
            lines.push(`branch: ${metadata.git.branch}`);
        if (metadata.git?.commit_short)
            lines.push(`commit: ${metadata.git.commit_short}`);
        if (metadata.tags && metadata.tags.length > 0) {
            lines.push(`tags: [${metadata.tags.join(", ")}]`);
        }
    }
    else if (type === "adr") {
        lines.push(`title: "${metadata.title.replace(/"/g, '\\"')}"`);
        lines.push(`status: Proposed`);
        lines.push(`date: ${today}`);
        if (metadata.git?.author)
            lines.push(`deciders: ${metadata.git.author}`);
        if (metadata.tags && metadata.tags.length > 0) {
            lines.push(`tags: [${metadata.tags.join(", ")}]`);
        }
    }
    lines.push("---", "");
    return lines.join("\n");
}
function nextAdrNumber(decisionsDir) {
    if (!fs.existsSync(decisionsDir))
        return 1;
    let max = 0;
    for (const f of fs.readdirSync(decisionsDir)) {
        const m = f.match(/^ADR-(\d+)-/);
        if (m) {
            const n = parseInt(m[1], 10);
            if (n > max)
                max = n;
        }
    }
    return max + 1;
}
function resolveTargetPath(kgPath, type, metadata) {
    if (type === "lesson") {
        const subDir = metadata.category ? slugify(metadata.category) : "";
        const dir = subDir
            ? path.join(kgPath, "lessons-learned", subDir)
            : path.join(kgPath, "lessons-learned");
        return { dir, fileName: deriveFileName(type, metadata) };
    }
    if (type === "session") {
        const ym = todayIso().slice(0, 7);
        const dir = path.join(kgPath, "sessions", ym);
        return { dir, fileName: deriveFileName(type, metadata) };
    }
    if (type === "adr") {
        const decisionsDir = path.join(kgPath, "decisions");
        const adrNumber = nextAdrNumber(decisionsDir);
        return { dir: decisionsDir, fileName: deriveFileName(type, metadata, adrNumber), adrNumber };
    }
    return { dir: kgPath, fileName: `${slugify(metadata.title)}.md` };
}
function checkExistingFile(type, kgPath, metadata) {
    if (type !== "session")
        return null;
    const date = todayIso();
    const ym = date.slice(0, 7);
    const sessionDir = path.join(kgPath, "sessions", ym);
    if (!fs.existsSync(sessionDir))
        return null;
    for (const f of fs.readdirSync(sessionDir)) {
        if (f.startsWith(date + "-") && f.endsWith(".md")) {
            return path.join(sessionDir, f);
        }
    }
    return null;
}
function updateReadmeIndex(indexPath, entry) {
    const line = `- [${entry.title}](${entry.relativePath})${entry.description ? ` — ${entry.description}` : ""}`;
    if (!fs.existsSync(indexPath)) {
        fs.writeFileSync(indexPath, `# Index\n\n${line}\n`, "utf-8");
        return;
    }
    let content = fs.readFileSync(indexPath, "utf-8");
    if (content.includes(entry.relativePath))
        return;
    content = content.trimEnd() + "\n" + line + "\n";
    fs.writeFileSync(indexPath, content, "utf-8");
}
async function handleCapture(request, targetKg) {
    // Validate metadata
    const validated = validateMetadata(request.metadata);
    if ("error" in validated)
        return validated;
    const config = (0, utils_js_1.readConfig)();
    let kgPath;
    let skipCwdCheck = false;
    if (targetKg) {
        // Explicit target KG: resolve path from config, skip CWD check (intentional user choice)
        const graphConfig = config.graphs[targetKg];
        if (!graphConfig) {
            return {
                error: "VALIDATION_ERROR",
                message: `Unknown KG name: "${targetKg}". Check /kmgraph:status for registered KGs.`,
            };
        }
        kgPath = graphConfig.path.replace(/^~/, require("os").homedir());
        skipCwdCheck = true;
    }
    else {
        kgPath = (0, utils_js_1.getActiveGraphPath)(config);
    }
    if (!kgPath) {
        return {
            error: "VALIDATION_ERROR",
            message: "No active knowledge graph. Use kg_config_init or kg_config_switch first.",
        };
    }
    // Active-KG / CWD alignment check (skipped when targetKg explicitly provided)
    if (!skipCwdCheck) {
        const activeKgRoot = (0, utils_js_1.getProjectRoot)(kgPath);
        const cwd = process.cwd();
        const normalizedRoot = activeKgRoot.endsWith(path.sep) ? activeKgRoot : activeKgRoot + path.sep;
        if (cwd !== activeKgRoot && !cwd.startsWith(normalizedRoot)) {
            return {
                error: "KG_MISMATCH",
                activeKg: config.active ?? undefined,
                activeKgRoot,
                cwd,
            };
        }
    }
    // Update-in-place path
    if (request.metadata.existingFile) {
        const existing = path.resolve(request.metadata.existingFile);
        const normalizedKgRoot = kgPath.endsWith(path.sep) ? kgPath : kgPath + path.sep;
        if (existing !== kgPath && !existing.startsWith(normalizedKgRoot)) {
            return { error: "IO_ERROR", message: `existingFile path is outside the active knowledge graph: ${existing}` };
        }
        if (!fs.existsSync(existing)) {
            return { error: "IO_ERROR", message: `existingFile not found: ${existing}` };
        }
        try {
            fs.writeFileSync(existing, generateFrontmatter(request.type, request.metadata) + request.content, "utf-8");
            let indexResult = {};
            try {
                const kgName = targetKg || config.active || path.basename(kgPath);
                indexResult = (0, fts5_js_1.rebuildIndex)(kgPath, kgName);
            }
            catch { /* best-effort */ }
            return { status: "updated", filePath: existing, relativePath: path.relative(kgPath, existing), indexResult };
        }
        catch (err) {
            return { error: "IO_ERROR", message: err instanceof Error ? err.message : String(err) };
        }
    }
    // Conflict check for sessions
    if (request.type === "session") {
        const conflict = checkExistingFile(request.type, kgPath, request.metadata);
        if (conflict) {
            return {
                error: "CONFLICT",
                message: `Session file already exists for today: ${path.relative(kgPath, conflict)}. Pass existingFile to update in place.`,
            };
        }
    }
    // Resolve target path
    const { dir, fileName } = resolveTargetPath(kgPath, request.type, request.metadata);
    // Create directory if needed
    try {
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir, { recursive: true });
    }
    catch (err) {
        return {
            error: "IO_ERROR",
            message: `Failed to create directory ${dir}: ${err instanceof Error ? err.message : String(err)}`,
        };
    }
    const filePath = path.join(dir, fileName);
    // Write file
    try {
        fs.writeFileSync(filePath, generateFrontmatter(request.type, request.metadata) + request.content, "utf-8");
    }
    catch (err) {
        return { error: "IO_ERROR", message: `Failed to write file: ${err instanceof Error ? err.message : String(err)}` };
    }
    // Update README index (best-effort)
    try {
        let readmePath;
        if (request.type === "lesson") {
            readmePath = path.join(kgPath, "lessons-learned", "README.md");
        }
        else if (request.type === "session") {
            readmePath = path.join(kgPath, "sessions", "README.md");
        }
        else {
            readmePath = path.join(kgPath, "decisions", "README.md");
        }
        updateReadmeIndex(readmePath, {
            title: request.metadata.title,
            relativePath: path.relative(path.dirname(readmePath), filePath),
        });
    }
    catch { /* best-effort */ }
    // FTS5 rebuild (in-process, best-effort)
    let indexResult = {};
    try {
        const kgName = targetKg || config.active || path.basename(kgPath);
        indexResult = (0, fts5_js_1.rebuildIndex)(kgPath, kgName);
    }
    catch { /* absent if node-sqlite3-wasm not installed */ }
    return {
        status: "created",
        filePath,
        relativePath: path.relative(kgPath, filePath),
        indexResult,
    };
}
function registerCaptureTool(server) {
    server.tool("kg_capture", "Write a lesson, session summary, or ADR to a knowledge graph. " +
        "Defaults to the active KG. Pass targetKg to write to a named KG (e.g., a global personal KG). " +
        "Handles file naming, frontmatter generation, directory routing, README index update, " +
        "and FTS5 rebuild automatically. Returns KG_MISMATCH error when CWD is outside the active KG root " +
        "(bypassed when targetKg is specified).", {
        content: zod_1.z.string().describe("Full markdown body of the lesson, session summary, or ADR"),
        type: zod_1.z
            .enum(["lesson", "session", "adr"])
            .describe("Entry type: determines directory routing and frontmatter template"),
        metadata: zod_1.z
            .object({
            title: zod_1.z.string().describe("Used in frontmatter and filename generation"),
            category: zod_1.z
                .string()
                .optional()
                .describe("Subdirectory routing (architecture, debugging, process, patterns)"),
            tags: zod_1.z.array(zod_1.z.string()).optional().describe("Searchability tags"),
            git: zod_1.z
                .object({
                branch: zod_1.z.string().optional(),
                commit: zod_1.z.string().optional(),
                commit_short: zod_1.z.string().optional(),
                author: zod_1.z.string().optional(),
                email: zod_1.z.string().optional(),
            })
                .optional()
                .describe("Git context metadata"),
            version: zod_1.z.string().optional().describe("Version string for updates to existing files"),
            existingFile: zod_1.z
                .string()
                .optional()
                .describe("Absolute path to existing file for update-in-place"),
        })
            .describe("Entry metadata"),
        targetKg: zod_1.z
            .string()
            .optional()
            .describe("Named KG to write to (from kg-config.json). Use for global/personal KG captures. " +
            "If omitted, writes to the active KG. CWD alignment check is skipped when targetKg is set."),
    }, async ({ content, type, metadata, targetKg }) => {
        const result = await handleCapture({ content, type, metadata }, targetKg);
        if ("error" in result) {
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
                isError: true,
            };
        }
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    });
}
//# sourceMappingURL=capture.js.map