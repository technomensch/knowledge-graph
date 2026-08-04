import { resolveInteractionMode } from "../src/interaction.js";

describe("resolveInteractionMode", () => {
  it("explicit param wins over everything", () => {
    expect(resolveInteractionMode({ explicitParam: "automated", env: { CI: "false" }, clientCanElicit: true }).mode).toBe("automated");
  });

  it("KMG_INTERACTION env var wins when no explicit param", () => {
    expect(resolveInteractionMode({ env: { KMG_INTERACTION: "interactive" } }).mode).toBe("interactive");
  });

  it("detects CI via GITHUB_ACTIONS when no higher-precedence signal", () => {
    expect(resolveInteractionMode({ env: { CI: "true", GITHUB_ACTIONS: "true" } }).mode).toBe("automated");
  });

  it("detects CI from a vendor variable ALONE, with no generic CI var set at all (findings doc #16, OR not AND)", () => {
    expect(resolveInteractionMode({ env: { JENKINS_URL: "http://ci.example.com" } }).mode).toBe("automated");
    expect(resolveInteractionMode({ env: { TEAMCITY_VERSION: "2024.1" } }).mode).toBe("automated");
  });

  it("detects CI from the generic CI var ALONE, with no vendor variable set at all (findings doc #16, OR not AND)", () => {
    expect(resolveInteractionMode({ env: { CI: "true" }, clientCanElicit: true }).mode).toBe("automated");
  });

  it("CI truthiness excludes false/0/no/off case-insensitively, for both the generic var and vendor vars", () => {
    expect(resolveInteractionMode({ env: { CI: "false" }, clientCanElicit: true }).mode).toBe("interactive");
    expect(resolveInteractionMode({ env: { CI: "0" }, clientCanElicit: true }).mode).toBe("interactive");
    expect(resolveInteractionMode({ env: { CI: "NO" }, clientCanElicit: true }).mode).toBe("interactive");
    expect(resolveInteractionMode({ env: { JENKINS_URL: "false" }, clientCanElicit: true }).mode).toBe("interactive");
  });

  it("falls to clientCanElicit=true -> interactive when no CI signal", () => {
    expect(resolveInteractionMode({ env: {}, clientCanElicit: true }).mode).toBe("interactive");
  });

  it("fail-closed to automated when nothing else applies", () => {
    expect(resolveInteractionMode({ env: {}, clientCanElicit: false }).mode).toBe("automated");
  });

  it("CI-detected plus explicit interactive override: override wins but includes a warning", () => {
    const result = resolveInteractionMode({ explicitParam: "interactive", env: { CI: "true", JENKINS_URL: "http://x" } });
    expect(result.mode).toBe("interactive");
    expect(result.warning).toBeDefined();
  });

  it("recognizes every CI env var named in the spec list, each sufficient alone (findings doc #16)", () => {
    const names = ["GITHUB_ACTIONS", "GITLAB_CI", "CIRCLECI", "JENKINS_URL", "BUILDKITE", "TF_BUILD", "TEAMCITY_VERSION", "BITBUCKET_BUILD_NUMBER", "CODEBUILD_BUILD_ID", "DRONE", "APPVEYOR", "HEROKU_TEST_RUN_ID"];
    for (const name of names) {
      // No generic CI var set at all -- the vendor variable alone must be enough.
      expect(resolveInteractionMode({ env: { [name]: "1" } }).mode).toBe("automated");
    }
  });

  it("downgrades a claimed explicit interactive to automated when the client genuinely can't be asked (findings doc #15)", () => {
    const result = resolveInteractionMode({ explicitParam: "interactive", clientCanElicit: false, env: {} });
    expect(result.mode).toBe("automated");
    expect(result.downgradedFrom).toBe("interactive");
    expect(result.warning).toBeDefined();
  });

  it("downgrades KMG_INTERACTION=interactive the same way when the client can't be asked", () => {
    const result = resolveInteractionMode({ clientCanElicit: false, env: { KMG_INTERACTION: "interactive" } });
    expect(result.mode).toBe("automated");
    expect(result.downgradedFrom).toBe("interactive");
  });

  it("does NOT downgrade when clientCanElicit is merely unknown (undefined), only on an explicit false", () => {
    const result = resolveInteractionMode({ explicitParam: "interactive", env: {} }); // clientCanElicit omitted
    expect(result.mode).toBe("interactive");
    expect(result.downgradedFrom).toBeUndefined();
  });
});
