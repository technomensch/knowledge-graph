// The `knowledge-graph` CLI's MCP entry point (cli.ts, via mcp-bootstrap.ts)
// must give every tool it registers the SAME PersonalScopeSession /
// CrossKgSearchSession. It previously omitted the argument to
// registerConfigTools, which silently fell back to a default-parameter
// `new PersonalScopeSession()` -- so kg_config_add_category and kg_search kept
// separate confirmedRepos sets on that surface, breaking spec §11's
// read/write-symmetry guarantee. The registrars' session parameters are now
// required, so that specific omission is a compile error; these tests cover
// the wiring itself.

jest.mock("../src/tools/config.js", () => ({ registerConfigTools: jest.fn() }));
jest.mock("../src/tools/search.js", () => ({ registerSearchTool: jest.fn() }));
jest.mock("../src/tools/scaffold.js", () => ({ registerScaffoldTool: jest.fn() }));
jest.mock("../src/tools/sanitization.js", () => ({ registerSanitizationTool: jest.fn() }));
jest.mock("../src/resources/index.js", () => ({
  registerConfigResource: jest.fn(),
  registerTemplatesResource: jest.fn(),
}));

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerCliMcpTools } from "../src/mcp-bootstrap.js";
import { registerConfigTools } from "../src/tools/config.js";
import { registerSearchTool } from "../src/tools/search.js";
import { PersonalScopeSession, CrossKgSearchSession } from "../src/resolution.js";

describe("registerCliMcpTools session wiring", () => {
  const fakeServer = {} as McpServer;

  beforeEach(() => jest.clearAllMocks());

  it("passes the identical PersonalScopeSession instance to every registrar that takes one", async () => {
    const personal = new PersonalScopeSession();
    const crossKg = new CrossKgSearchSession();

    await registerCliMcpTools(fakeServer, personal, crossKg);

    expect(registerConfigTools).toHaveBeenCalledWith(fakeServer, personal);
    expect(registerSearchTool).toHaveBeenCalledWith(fakeServer, personal, crossKg);

    const configSession = (registerConfigTools as jest.Mock).mock.calls[0][1];
    const searchSession = (registerSearchTool as jest.Mock).mock.calls[0][1];
    expect(configSession).toBe(searchSession);
  });

  it("a repo confirmed through one registrar's session is already confirmed for the other's", async () => {
    const personal = new PersonalScopeSession();
    await registerCliMcpTools(fakeServer, personal, new CrossKgSearchSession());

    const configSession = (registerConfigTools as jest.Mock).mock.calls[0][1] as PersonalScopeSession;
    const searchSession = (registerSearchTool as jest.Mock).mock.calls[0][1] as PersonalScopeSession;

    configSession.confirmRepo("/repo/a");
    expect(searchSession.hasConfirmedRepo("/repo/a")).toBe(true);
  });
});
