import { parseScopeMarker, PersonalScopeSession, confirmPersonalScopeAccess } from "../src/resolution.js";
import { AskResult } from "../src/interaction.js";

describe("scope marker parsing", () => {
  it("parses [personal] prefix and strips it", () => {
    expect(parseScopeMarker("[personal] what did I note about X")).toEqual({ marker: "personal", remainder: "what did I note about X" });
  });
  it("parses [project] prefix and strips it", () => {
    expect(parseScopeMarker("[project] search for Y")).toEqual({ marker: "project", remainder: "search for Y" });
  });
  it("does not misfire on bare word 'personal' in ordinary prose", () => {
    expect(parseScopeMarker("this is a personal preference of mine").marker).toBeNull();
  });
  it("does not recognize dash/flag style", () => {
    expect(parseScopeMarker("--personal search for X").marker).toBeNull();
  });
  it("does not recognize slash-command style", () => {
    expect(parseScopeMarker("/personal search for X").marker).toBeNull();
  });
});

describe("PersonalScopeSession", () => {
  it("automated mode always returns null regardless of any applied marker", () => {
    const session = new PersonalScopeSession();
    session.applyMarker("personal", true);
    expect(session.currentScopeFor(true)).toBeNull();
  });
  it("interactive mode returns the applied scope when sticky", () => {
    const session = new PersonalScopeSession();
    session.applyMarker("personal", true);
    expect(session.currentScopeFor(false)).toBe("personal");
  });
  it("interactive mode one-shot marker applies to the current call, then this test's own next check re-applies null manually (session doesn't self-clear inside this unit test; clearing-after-one-call is the caller's responsibility per the interface, tested via two explicit applyMarker calls)", () => {
    const session = new PersonalScopeSession();
    session.applyMarker("personal", false); // one-shot
    expect(session.currentScopeFor(false)).toBe("personal");
    session.applyMarker(null, false); // caller clears after consuming the one-shot
    expect(session.currentScopeFor(false)).toBeNull();
  });
});

describe("PersonalScopeSession.confirmedRepos", () => {
  it("has not confirmed a repo it hasn't seen before", () => {
    const session = new PersonalScopeSession();
    expect(session.hasConfirmedRepo("/home/user/some-repo")).toBe(false);
  });
  it("remembers a confirmed repo for the rest of the process", () => {
    const session = new PersonalScopeSession();
    session.confirmRepo("/home/user/some-repo");
    expect(session.hasConfirmedRepo("/home/user/some-repo")).toBe(true);
  });
  it("does not leak confirmation across different repos", () => {
    const session = new PersonalScopeSession();
    session.confirmRepo("/home/user/repo-a");
    expect(session.hasConfirmedRepo("/home/user/repo-b")).toBe(false);
  });
});

describe("confirmPersonalScopeAccess", () => {
  const noAsk = (): Promise<AskResult> => {
    throw new Error("ask() should not be called in automated mode");
  };

  it("automated mode without confirmPersonalScope returns KMG_INPUT_REQUIRED", async () => {
    const session = new PersonalScopeSession();
    const result = await confirmPersonalScopeAccess(session, "/repo/a", { mode: "automated", ask: noAsk });
    expect(result).toEqual({
      error: "KMG_INPUT_REQUIRED",
      reason: "personal_scope_unseen_repo",
      resolveWith: { param: "confirmPersonalScope", accepts: undefined },
    });
    expect(session.hasConfirmedRepo("/repo/a")).toBe(false);
  });

  it("automated mode with confirmPersonalScope: true confirms and records the repo", async () => {
    const session = new PersonalScopeSession();
    const result = await confirmPersonalScopeAccess(session, "/repo/a", {
      mode: "automated",
      confirmPersonalScope: true,
      ask: noAsk,
    });
    expect(result).toEqual({ confirmed: true });
    expect(session.hasConfirmedRepo("/repo/a")).toBe(true);
  });

  it("interactive mode asks via gate() and only a 'yes' answer confirms", async () => {
    const session = new PersonalScopeSession();
    const yesAsk = async (): Promise<AskResult> => ({ status: "answered", answer: "yes" });
    const result = await confirmPersonalScopeAccess(session, "/repo/a", { mode: "interactive", ask: yesAsk });
    expect(result).toEqual({ confirmed: true });
    expect(session.hasConfirmedRepo("/repo/a")).toBe(true);
  });

  it("interactive mode: a 'no' answer does not confirm", async () => {
    const session = new PersonalScopeSession();
    const noAskAnswer = async (): Promise<AskResult> => ({ status: "answered", answer: "no" });
    const result = await confirmPersonalScopeAccess(session, "/repo/a", { mode: "interactive", ask: noAskAnswer });
    expect(result).toEqual({
      error: "KMG_INPUT_REQUIRED",
      reason: "personal_scope_unseen_repo",
      resolveWith: { param: "confirmPersonalScope", accepts: ["yes", "no"] },
    });
    expect(session.hasConfirmedRepo("/repo/a")).toBe(false);
  });

  it("a repo confirmed once is not re-asked within the same session", async () => {
    const session = new PersonalScopeSession();
    session.confirmRepo("/repo/a");
    const result = await confirmPersonalScopeAccess(session, "/repo/a", { mode: "interactive", ask: noAsk });
    expect(result).toEqual({ confirmed: true });
  });

  it("confirming one repo does not confirm a different one (cross-repo non-leakage)", async () => {
    const session = new PersonalScopeSession();
    session.confirmRepo("/repo/a");
    const result = await confirmPersonalScopeAccess(session, "/repo/b", { mode: "automated", ask: noAsk });
    expect(result).toEqual({
      error: "KMG_INPUT_REQUIRED",
      reason: "personal_scope_unseen_repo",
      resolveWith: { param: "confirmPersonalScope", accepts: undefined },
    });
  });
});
