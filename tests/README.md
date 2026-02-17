# Testing the Knowledge Plugin

This directory contains optional testing utilities for the Knowledge Plugin.

## MCP Server Tests

These scripts help you verify that the MCP server is working correctly.

### Quick Test (Automated)

```bash
./tests/test-mcp-direct.sh
```

**What it does:**
- Sends JSON-RPC calls directly to the MCP server
- Lists all available tools (should show 7 tools)
- Verifies server initialization
- Takes ~1 second to run

**Expected output:**
```
Testing MCP server with direct JSON-RPC calls...

{"result":{"protocolVersion":"2024-11-05",...}}
{"result":{"tools":[{"name":"kg_config_init",...}]}}

✓ If you see tool names above, the MCP server is working correctly!
```

### Interactive Test (Visual)

```bash
./tests/test-mcp.sh
```

**What it does:**
- Launches the MCP Inspector web interface
- Opens `http://localhost:5173` in your browser
- Provides GUI for testing all MCP tools
- Lets you call tools with parameters and see responses

**Requirements:**
- `npx` must be available (comes with Node.js)
- Installs `@modelcontextprotocol/inspector` on first run

### When to Use These Tests

**Use when:**
- ✓ First installing the plugin (verify installation)
- ✓ Troubleshooting MCP server issues
- ✓ Developing/extending the MCP server
- ✓ Submitting bug reports (include test output)

**Not needed for:**
- ✗ Normal plugin usage (commands work automatically)
- ✗ Day-to-day knowledge capture workflows

## What's Being Tested

### Tools (7 total)
1. `kg_config_init` - Create new knowledge graph
2. `kg_config_list` - List all configured KGs
3. `kg_config_switch` - Change active KG
4. `kg_config_add_category` - Add category to KG
5. `kg_search` - Full-text search across KG files
6. `kg_scaffold` - Create files from templates
7. `kg_check_sensitive` - Scan for sensitive data

### Resources (2 total)
1. `kg://config` - Current kg-config.json contents
2. `kg://templates/{name}` - Template files

## Troubleshooting

**MCP server not starting:**
```bash
# Check if Node.js is installed
node --version

# Verify MCP server build exists
ls -la mcp-server/dist/index.js

# Check for errors in the build
cat mcp-server/dist/index.js | head -30
```

**Tools not showing up:**
```bash
# Run the direct test to see raw JSON-RPC responses
./tests/test-mcp-direct.sh

# Check Claude Code logs (if available)
# Look for MCP server initialization messages
```

**Inspector won't start:**
```bash
# Ensure npx is available
which npx

# Try installing inspector manually
npm install -g @modelcontextprotocol/inspector
```

## Development

These tests are also useful for plugin developers:

- **CI/CD Integration**: `test-mcp-direct.sh` can run in automated pipelines
- **Regression Testing**: Verify tools still work after changes
- **Schema Validation**: Ensure tool schemas match documentation

## Contributing

If you find issues with these tests or want to add more test coverage, please open an issue or PR at:
https://github.com/technomensch/knowledge-graph/issues
