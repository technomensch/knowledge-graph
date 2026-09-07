import * as fs from "fs";
import * as path from "path";
import { getPluginRoot } from "../utils.js";

/**
 * Numeric, component-by-component semver compare -- never lexical.
 * Mirrors scripts/lib/upgrade-check.sh's semver_compare (shell version,
 * used by the session-start hooks). Keep both in sync manually if the
 * comparison rule ever changes.
 */
export function compareSemver(a: string, b: string): 1 | 0 | -1 {
  const aParts = a.split(".");
  const bParts = b.split(".");
  const maxLen = Math.max(aParts.length, bParts.length);

  for (let i = 0; i < maxLen; i++) {
    const aNum = parseInt((aParts[i] ?? "0").replace(/[^0-9]/g, "") || "0", 10);
    const bNum = parseInt((bParts[i] ?? "0").replace(/[^0-9]/g, "") || "0", 10);
    if (aNum > bNum) return 1;
    if (aNum < bNum) return -1;
  }
  return 0;
}

const SEMVER_DIR_RE = /^\d+\.\d+\.\d+$/;

/**
 * Resolves the freshest version actually installed on disk, by scanning
 * sibling version-pinned directories under the plugin cache root --
 * NEVER this running process's own baked-in version (pkg.version /
 * handleVersion().installed). That value is frozen for a stale process's
 * entire lifetime and is exactly what issue-32 identified as unable to
 * detect its own staleness. Real layout confirmed on-disk:
 * .../kmgraph/0.7.4/, .../kmgraph/0.7.5/, .../kmgraph/0.7.7/ (sibling
 * directories, never overwritten in place -- an upgrade adds a new one).
 */
export function resolveFreshestInstalledVersion(): string | null {
  const pluginRoot = getPluginRoot();
  const versionsParentDir = path.dirname(pluginRoot);

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(versionsParentDir, { withFileTypes: true });
  } catch {
    return null;
  }

  const versions = entries
    .filter((e) => e.isDirectory() && SEMVER_DIR_RE.test(e.name))
    .map((e) => e.name);

  if (versions.length === 0) return null;

  return versions.reduce((max, v) => (compareSemver(v, max) === 1 ? v : max));
}

declare const __SERVER_VERSION__: string;

/**
 * The version this running process should be compared against
 * resolveFreshestInstalledVersion()'s sibling-directory scan -- apples to
 * apples, since both read the same "which version-pinned directory" signal.
 * __SERVER_VERSION__ (mcp-server's OWN package version) is deliberately not
 * used here: mcp-server is versioned independently of the plugin (see
 * knowledge/rules.md § Version Files), so it and the plugin-cache directory
 * name this process actually lives in can and do diverge.
 */
export function resolveRunningVersion(): string {
  const base = path.basename(getPluginRoot());
  if (SEMVER_DIR_RE.test(base)) return base;
  // Not running from a version-pinned plugin-cache directory (e.g. dev tree)
  // -- fall back to the build-time-injected server version.
  return typeof __SERVER_VERSION__ !== "undefined" ? __SERVER_VERSION__ : "0.0.0";
}

/**
 * Host-specific remediation text, keyed by the MCP clientInfo.name --
 * resolved lazily on first tool call and memoized (see
 * installStaleProcessWarning in Task 3), NOT captured at server-construction
 * time: getClientVersion() is unpopulated until the MCP `initialize`
 * handshake completes, which happens after this process's own startup code
 * runs. Matching is a case-insensitive substring check, deliberately loose
 * since the exact strings each host sends are not verified against live
 * traffic as of this writing (flagged in ADR-055's amendment) -- verify
 * against real values during this task's manual verification step and
 * tighten this matching if a false match is found.
 */
export function getRemediationText(clientName: string | undefined): string {
  const name = (clientName ?? "").toLowerCase();

  if (name.includes("claude") && name.includes("desktop")) {
    return "Restart Claude Desktop to pick up the new version (no in-app reload available).";
  }
  // Deliberately NOT `name.includes("claude") && name.includes("code")` --
  // "code" alone is a substring of "vscode", so a client identifying as
  // e.g. "claude-vscode-extension" would false-match and get told to run a
  // Claude-Code-only command. Require the hyphenated/spaced token instead.
  if (name.includes("claude-code") || name.includes("claude code")) {
    return "Run /reload-plugins to pick up the new version.";
  }
  if (name.includes("gemini")) {
    return "Restart Gemini CLI to pick up the new version.";
  }
  if (name.includes("codex")) {
    return "Restart Codex to pick up the new version.";
  }
  if (name.includes("antigravity")) {
    return "Restart Antigravity to pick up the new version (assumed -- not independently confirmed; flagged in ADR-055's amendment).";
  }
  return "Restart your AI tool to pick up the new version.";
}
