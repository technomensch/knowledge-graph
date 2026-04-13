"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleVersion = handleVersion;
exports.registerVersionTool = registerVersionTool;
// Read version from package.json at runtime (not hardcoded)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require("../../package.json");
const SCHEMA_VERSION = 2;
function handleVersion() {
    return { installed: pkg.version, schema: SCHEMA_VERSION };
}
// ── MCP Tool Registration ────────────────────────────────────────────────────
function registerVersionTool(server) {
    server.tool("kg_version", "Get installed KMGraph version and schema level", {}, async () => {
        const result = handleVersion();
        return {
            content: [{ type: "text", text: JSON.stringify(result) }],
        };
    });
}
//# sourceMappingURL=version.js.map