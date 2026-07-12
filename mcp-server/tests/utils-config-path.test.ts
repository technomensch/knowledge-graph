describe("CONFIG_PATH default", () => {
  const ORIGINAL_ENV = process.env.KG_CONFIG_PATH;

  afterEach(() => {
    if (ORIGINAL_ENV === undefined) delete process.env.KG_CONFIG_PATH;
    else process.env.KG_CONFIG_PATH = ORIGINAL_ENV;
  });

  it("defaults to ~/.kmgraph/kg-config.json when env var unset", () => {
    delete process.env.KG_CONFIG_PATH;
    jest.resetModules();
    jest.doMock("os", () => ({
      ...jest.requireActual("os"),
      homedir: () => "/fake/home",
    }));
    const { CONFIG_PATH } = require("../src/utils.js");
    expect(CONFIG_PATH).toBe("/fake/home/.kmgraph/kg-config.json");
    jest.dontMock("os");
  });

  it("KG_CONFIG_PATH env var overrides the default", () => {
    process.env.KG_CONFIG_PATH = "/custom/path/kg-config.json";
    jest.resetModules();
    const { CONFIG_PATH } = require("../src/utils.js");
    expect(CONFIG_PATH).toBe("/custom/path/kg-config.json");
  });
});
