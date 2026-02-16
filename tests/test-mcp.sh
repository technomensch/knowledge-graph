#!/bin/bash
# Test the Knowledge Graph MCP server

echo "Starting MCP Inspector for Knowledge Graph server..."
echo "This will open a web interface where you can test all MCP tools"
echo ""
echo "In the inspector, you'll be able to:"
echo "  • See all 7 tools listed"
echo "  • Test kg_config_list, kg_search, etc."
echo "  • Access resources kg://config and kg://templates/*"
echo ""

npx @modelcontextprotocol/inspector node mcp-server/dist/index.js
