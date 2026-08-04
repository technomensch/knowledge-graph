import * as os from "os";
import { isHomeOrRootCwd } from "../src/resolution.js";

describe("isHomeOrRootCwd", () => {
  it("returns true for the user's home directory", () => {
    expect(isHomeOrRootCwd(os.homedir())).toBe(true);
  });
  it("returns true for filesystem root", () => {
    expect(isHomeOrRootCwd("/")).toBe(true);
  });
  it("returns false for an ordinary project directory", () => {
    expect(isHomeOrRootCwd("/home/user/some-project")).toBe(false);
  });
});
