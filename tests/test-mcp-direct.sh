#!/bin/bash
# Direct test of MCP server using stdio

echo "Testing MCP server with direct JSON-RPC calls..."
echo ""

# Start the server and send initialization
{
  echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'
  echo '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'
  sleep 1
} | node mcp-server/dist/index.js 2>&1 | grep -E '("result"|"name"|"description")' | head -30

echo ""
echo "✓ If you see tool names above, the MCP server is working correctly!"
