jest.mock("../src/lib/staleProcessCheck.js", () => ({
  compareSemver: jest.fn(),
  resolveFreshestInstalledVersion: jest.fn(),
  getRemediationText: jest.fn(),
}));

import {
  compareSemver,
  resolveFreshestInstalledVersion,
  getRemediationText,
} from "../src/lib/staleProcessCheck.js";
import { checkStaleProcess } from "../src/lib/staleProcessWarning.js";

describe("checkStaleProcess", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns null when running version matches freshest installed", () => {
    (resolveFreshestInstalledVersion as jest.Mock).mockReturnValue("0.7.7");
    (compareSemver as jest.Mock).mockReturnValue(0);

    expect(checkStaleProcess("0.7.7", "claude-code")).toBeNull();
  });

  it("returns null when freshest installed cannot be resolved", () => {
    (resolveFreshestInstalledVersion as jest.Mock).mockReturnValue(null);

    expect(checkStaleProcess("0.7.7", "claude-code")).toBeNull();
    expect(compareSemver).not.toHaveBeenCalled();
  });

  it("returns null when running version is newer (local dev build) -- never warns backwards", () => {
    (resolveFreshestInstalledVersion as jest.Mock).mockReturnValue("0.7.5");
    (compareSemver as jest.Mock).mockReturnValue(-1); // installed < running

    expect(checkStaleProcess("0.7.7", "claude-code")).toBeNull();
  });

  it("returns a warning including both versions and remediation text when running is behind", () => {
    (resolveFreshestInstalledVersion as jest.Mock).mockReturnValue("0.7.7");
    (compareSemver as jest.Mock).mockReturnValue(1); // installed > running
    (getRemediationText as jest.Mock).mockReturnValue("Run /reload-plugins to pick up the new version.");

    const warning = checkStaleProcess("0.7.5", "claude-code");

    expect(warning).not.toBeNull();
    expect(warning).toContain("0.7.5");
    expect(warning).toContain("0.7.7");
    expect(warning).toContain("Run /reload-plugins");
    expect(getRemediationText).toHaveBeenCalledWith("claude-code");
  });
});
