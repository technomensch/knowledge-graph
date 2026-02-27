#!/bin/bash
# prepare-mcp.sh - Build the MCP server for the Knowledge Management Graph
# Checks prerequisites, installs dependencies, and builds TypeScript

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MCP_DIR="$(cd "$SCRIPT_DIR/../mcp-server" && pwd)"

# Colors (if terminal supports them)
if [ -t 1 ]; then
  RED='\033[0;31m'
  GREEN='\033[0;32m'
  YELLOW='\033[0;33m'
  NC='\033[0m'
else
  RED='' GREEN='' YELLOW='' NC=''
fi

echo "Knowledge Graph MCP Server — Build"
echo "==================================="

# Step 1: Check Node.js
if ! command -v node &> /dev/null; then
  echo -e "${RED}Error: Node.js is not installed.${NC}"
  echo "The MCP server requires Node.js 18+."
  echo ""
  echo "Install via:"
  echo "  brew install node       (macOS)"
  echo "  apt install nodejs      (Ubuntu/Debian)"
  echo "  https://nodejs.org      (all platforms)"
  exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo -e "${YELLOW}Warning: Node.js v${NODE_VERSION} detected. MCP server requires Node.js 18+.${NC}"
  echo "Current: $(node -v)"
  echo "Please upgrade Node.js."
  exit 1
fi

echo -e "${GREEN}Node.js $(node -v) detected${NC}"

# Step 2: Check npm
if ! command -v npm &> /dev/null; then
  echo -e "${RED}Error: npm is not installed.${NC}"
  exit 1
fi

echo -e "${GREEN}npm $(npm -v) detected${NC}"

# Step 3: Install dependencies
echo ""
echo "Installing dependencies..."
cd "$MCP_DIR"
npm install --production=false 2>&1

# Step 4: Build TypeScript
echo ""
echo "Building TypeScript..."
npm run build 2>&1

# Step 5: Verify build
if [ -f "$MCP_DIR/dist/index.js" ]; then
  echo ""
  echo -e "${GREEN}MCP server built successfully.${NC}"
  echo "Entry point: $MCP_DIR/dist/index.js"
  echo ""
  echo "To test standalone:"
  echo "  node $MCP_DIR/dist/index.js"
  echo ""
  echo "To use with Claude Code plugin:"
  echo "  The plugin.json already references mcp-server/dist/index.js"
else
  echo ""
  echo -e "${RED}Build failed: dist/index.js not found.${NC}"
  echo "Check the TypeScript compilation output above for errors."
  exit 1
fi
