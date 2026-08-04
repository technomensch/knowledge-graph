import { confirmFirstWrite } from "../src/tools/config.js";
import { KgConfig } from "../src/utils.js";

function pendingConfig(): KgConfig {
  return {
    version: "1.0.0",
    graphs: { newrepo: { name: "newrepo", path: "/n", type: "project-local", categories: [], createdAt: "x", status: "pending", statusChangedAt: "x", graphId: "id" } },
    sanitization: { enabled: false, patterns: [], action: "warn" },
  };
}

describe("confirmFirstWrite", () => {
  it("automated mode without confirmFirstUse returns KMG_INPUT_REQUIRED, never calls ask", async () => {
    const ask = jest.fn();
    const result = await confirmFirstWrite(pendingConfig(), "newrepo", { mode: "automated", ask });
    expect(ask).not.toHaveBeenCalled();
    expect(result).toMatchObject({ error: "KMG_INPUT_REQUIRED", reason: "first_time_repo" });
  });

  it("automated mode with confirmFirstUse:true flips status to active and records confirmedBy", async () => {
    const ask = jest.fn();
    const result = await confirmFirstWrite(pendingConfig(), "newrepo", { mode: "automated", confirmFirstUse: true, ask });
    expect(ask).not.toHaveBeenCalled();
    if ("config" in result) {
      expect(result.config.graphs.newrepo.status).toBe("active");
      expect(result.config.graphs.newrepo.confirmedBy).toBe("automated");
    } else {
      throw new Error("expected success, got InputRequiredError");
    }
  });

  it("interactive mode calls ask() and only flips status on a 'yes' answer", async () => {
    const result = await confirmFirstWrite(pendingConfig(), "newrepo", { mode: "interactive", ask: async () => "yes" });
    if ("config" in result) {
      expect(result.config.graphs.newrepo.status).toBe("active");
      expect(result.config.graphs.newrepo.confirmedBy).toBe("interactive");
    } else {
      throw new Error("expected success");
    }
  });

  it("interactive mode with a 'no' answer leaves status pending and performs no write", async () => {
    const result = await confirmFirstWrite(pendingConfig(), "newrepo", { mode: "interactive", ask: async () => "no" });
    expect(result).toMatchObject({ error: "KMG_INPUT_REQUIRED", reason: "first_time_repo" });
  });

  // gate()'s default timeout is 30s (src/interaction.ts); confirmFirstWrite exposes an
  // optional timeoutMs passthrough (not in the original brief sample, added here so this
  // case doesn't hang past Jest's 5s default testTimeout) -- same real-signature adaptation
  // documented in tests/interaction-gate.test.ts for gate() itself.
  it("interactive mode with no answer (timeout) returns a structured error, never silently approves", async () => {
    const neverResolves = () => new Promise<string>(() => {});
    const result = await confirmFirstWrite(pendingConfig(), "newrepo", { mode: "interactive", ask: neverResolves, timeoutMs: 20 });
    expect(result).toMatchObject({ error: "KMG_INPUT_REQUIRED" });
  });
});
