import { resolveEffectiveCwd } from "../src/platform-cwd.js";

describe("resolveEffectiveCwd", () => {
  it("uses process.cwd() directly when no sandboxCwd meta and no workspaceRoot param", () => {
    expect(resolveEffectiveCwd({ processCwd: "/home/user/project" })).toBe("/home/user/project");
  });

  it("decodes _meta.sandboxCwd file:// URI when present, overriding process.cwd()", () => {
    const result = resolveEffectiveCwd({
      processCwd: "/wrong/plugin/install/path",
      toolCallMeta: { sandboxCwd: "file:///home/user/actual-project" },
    });
    expect(result).toBe("/home/user/actual-project");
  });

  it("falls back to workspaceRootParam when no sandboxCwd meta is present", () => {
    const result = resolveEffectiveCwd({
      processCwd: "/wrong/plugin/install/path",
      workspaceRootParam: "/home/user/actual-project",
    });
    expect(result).toBe("/home/user/actual-project");
  });

  it("URL-decodes special characters in the file:// URI", () => {
    const result = resolveEffectiveCwd({
      processCwd: "/wrong",
      toolCallMeta: { sandboxCwd: "file:///home/user/my%20project" },
    });
    expect(result).toBe("/home/user/my project");
  });
});
