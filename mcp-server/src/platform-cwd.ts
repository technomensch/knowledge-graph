import { fileURLToPath } from "url";

export function resolveEffectiveCwd(opts: {
  processCwd: string;
  toolCallMeta?: Record<string, unknown>; // the raw _meta object from an MCP tool call, if any
  workspaceRootParam?: string; // explicit fallback param
  clientName?: string; // for logging/diagnostics only -- never a resolution signal per spec §13/§12
}): string {
  const sandboxCwd = opts.toolCallMeta?.sandboxCwd;
  if (typeof sandboxCwd === "string" && sandboxCwd.startsWith("file://")) {
    try {
      return fileURLToPath(sandboxCwd);
    } catch {
      // malformed URI -- fall through to the next signal rather than throwing
    }
  }
  if (opts.workspaceRootParam) return opts.workspaceRootParam;
  return opts.processCwd;
}
