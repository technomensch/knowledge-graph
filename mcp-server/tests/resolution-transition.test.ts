import { ResolutionSession } from "../src/resolution.js";

describe("ResolutionSession nested-transition notice", () => {
  it("does not flag the first resolution in a session", () => {
    const session = new ResolutionSession();
    expect(session.noteResolution("api").changed).toBe(false);
  });

  it("does not flag repeated resolution of the same KG", () => {
    const session = new ResolutionSession();
    session.noteResolution("api");
    expect(session.noteResolution("api").changed).toBe(false);
  });

  it("flags when the resolved KG changes between calls", () => {
    const session = new ResolutionSession();
    session.noteResolution("monorepo");
    expect(session.noteResolution("api").changed).toBe(true);
  });

  it("does not re-flag on the next call after the transition already fired once", () => {
    const session = new ResolutionSession();
    session.noteResolution("monorepo");
    session.noteResolution("api");
    expect(session.noteResolution("api").changed).toBe(false);
  });
});
