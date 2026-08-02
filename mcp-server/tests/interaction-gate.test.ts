import { gate, requireInput, type AskResult } from "../src/interaction.js";

describe("gate()", () => {
  it("requireInput produces the exact KMG_INPUT_REQUIRED shape", () => {
    const err = requireInput("duplicate_graph_id", "canonicalPath");
    expect(err).toEqual({
      error: "KMG_INPUT_REQUIRED",
      reason: "duplicate_graph_id",
      resolveWith: { param: "canonicalPath", accepts: undefined },
    });
  });

  it("automated mode never calls ask(), returns KMG_INPUT_REQUIRED immediately", async () => {
    const ask = jest.fn();
    const result = await gate({ mode: "automated", reason: "archived_entry", param: "confirmProceed", ask });
    expect(ask).not.toHaveBeenCalled();
    expect(result).toMatchObject({ error: "KMG_INPUT_REQUIRED", reason: "archived_entry" });
  });

  it("interactive mode calls ask() and returns its answer", async () => {
    const result = await gate({ mode: "interactive", reason: "fuzzy_match", param: "name", ask: async () => ({ status: "answered", answer: "chosen-graph" }) });
    expect(result).toEqual({ answer: "chosen-graph" });
  });

  it("interactive mode times out with a structured error, never hangs", async () => {
    const neverResolves = () => new Promise<AskResult>(() => {});
    const result = await gate({ mode: "interactive", reason: "fuzzy_match", param: "name", ask: neverResolves, timeoutMs: 20 });
    expect(result).toMatchObject({ error: "KMG_INPUT_REQUIRED" });
  });

  it("returns { declined: true } when ask() resolves a declined status", async () => {
    const result = await gate({ mode: "interactive", reason: "fuzzy_match", param: "name", ask: async () => ({ status: "declined" }) });
    expect(result).toEqual({ declined: true });
  });

  it("returns { cancelled: true } when ask() resolves a cancelled status", async () => {
    const result = await gate({ mode: "interactive", reason: "fuzzy_match", param: "name", ask: async () => ({ status: "cancelled" }) });
    expect(result).toEqual({ cancelled: true });
  });

  it("rejects an answer not in accepts, returning a structured KMG_INPUT_REQUIRED instead of the bad value", async () => {
    const result = await gate({
      mode: "interactive",
      reason: "four_answer",
      param: "choice",
      accepts: ["reattach", "worktree", "fork", "decline"],
      ask: async () => ({ status: "answered", answer: "not-a-real-option" }),
    });
    expect(result).toMatchObject({ error: "KMG_INPUT_REQUIRED", reason: "four_answer_invalid_answer" });
  });

  it("accepts a valid answer against the accepts list", async () => {
    const result = await gate({
      mode: "interactive",
      reason: "four_answer",
      param: "choice",
      accepts: ["reattach", "worktree", "fork", "decline"],
      ask: async () => ({ status: "answered", answer: "reattach" }),
    });
    expect(result).toEqual({ answer: "reattach" });
  });

  it("when accepts is not provided, any answered string passes through unchanged", async () => {
    const result = await gate({
      mode: "interactive",
      reason: "fuzzy_match",
      param: "name",
      ask: async () => ({ status: "answered", answer: "anything" }),
    });
    expect(result).toEqual({ answer: "anything" });
  });

  it("does not leak a timer handle after ask() answers before the timeout (findings doc #17)", async () => {
    jest.useFakeTimers();
    try {
      const p = gate({ mode: "interactive", reason: "fuzzy_match", param: "name", ask: async () => ({ status: "answered", answer: "answered" }), timeoutMs: 30_000 });
      // Flush enough microtask ticks for the answered promise chain (including
      // the Promise.resolve().then(ask).then(...) hops in gate()) to fully settle.
      for (let i = 0; i < 5; i++) await Promise.resolve();
      jest.runOnlyPendingTimers(); // if the timeout wasn't cleared, this would resolve it too — race already settled, so it's a no-op either way
      const result = await p;
      expect(result).toEqual({ answer: "answered" });
      expect(jest.getTimerCount()).toBe(0); // the timeout was cleared, not left pending
    } finally {
      jest.useRealTimers();
    }
  });

  it("does not leak a timer handle when ask() throws synchronously", async () => {
    jest.useFakeTimers();
    try {
      const ask = () => { throw new Error("sync boom"); };
      const p = gate({ mode: "interactive", reason: "fuzzy_match", param: "name", ask, timeoutMs: 30_000 });
      p.catch(() => {}); // prevent unhandled rejection warning while we flush microtasks below
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await expect(p).rejects.toThrow("sync boom");
      expect(jest.getTimerCount()).toBe(0); // the timeout was cleared, not left pending
    } finally {
      jest.useRealTimers();
    }
  });

  it("aborts the signal passed to ask() when the timeout fires (findings doc #17)", async () => {
    let observedAborted = false;
    const ask = (signal: AbortSignal) =>
      new Promise<AskResult>((resolve) => {
        signal.addEventListener("abort", () => { observedAborted = true; });
      });
    await gate({ mode: "interactive", reason: "fuzzy_match", param: "name", ask, timeoutMs: 20 });
    expect(observedAborted).toBe(true);
  });

  it("passes detail through to automated-mode's InputRequiredError", async () => {
    const result = await gate({
      mode: "automated",
      reason: "x",
      param: "y",
      detail: { foo: "bar" },
      ask: async () => ({ status: "answered", answer: "z" }),
    });
    expect((result as { detail?: unknown }).detail).toEqual({ foo: "bar" });
  });

  it("passes detail through to ask() as its second argument", async () => {
    const ask = async (signal: AbortSignal, detail?: unknown) => ({ status: "answered" as const, answer: JSON.stringify(detail) });
    const result = await gate({
      mode: "interactive",
      reason: "fuzzy_match",
      param: "name",
      detail: { foo: "bar" },
      ask,
    });
    expect(result).toEqual({ answer: JSON.stringify({ foo: "bar" }) });
  });

  it("omits detail entirely when not provided (no behavior change for existing callers)", async () => {
    const result = await gate({
      mode: "automated",
      reason: "x",
      param: "y",
      ask: async () => ({ status: "answered", answer: "z" }),
    });
    expect((result as { detail?: unknown }).detail).toBeUndefined();
    expect(result).toEqual({
      error: "KMG_INPUT_REQUIRED",
      reason: "x",
      resolveWith: { param: "y", accepts: undefined },
    });
  });
});
