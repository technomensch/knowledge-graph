#!/bin/bash
# install-vscode.sh — Auto-install knowledge-graph-plugin for VSCode Extension
#
# The VSCode extension doesn't support --plugin-dir like the CLI does.
# This script symlinks skills into ~/.claude/skills/ for discovery.
#
# Usage: bash scripts/install-vscode.sh
# Or:    bash install-vscode.sh (if run from plugin root)

set -e

PLUGIN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SKILLS_DIR="$PLUGIN_DIR/skills"
TARGET_DIR="$HOME/.claude/skills"

echo "🔗 Installing knowledge-graph-plugin for VSCode Extension"
echo "   Plugin: $PLUGIN_DIR"
echo "   Target: $TARGET_DIR"
echo ""

# Create target directory if it doesn't exist
if [ ! -d "$TARGET_DIR" ]; then
  echo "📁 Creating ~/.claude/skills directory..."
  mkdir -p "$TARGET_DIR"
fi

# Create symlinks for all skills
echo "📚 Symlinking 16 skills..."
count=0
for skill_dir in "$SKILLS_DIR"/*; do
  skill_name=$(basename "$skill_dir")
  target_link="$TARGET_DIR/knowledge:$skill_name.md"

  # Remove existing symlink if present
  if [ -L "$target_link" ]; then
    rm "$target_link"
  fi

  # Create new symlink (must point to SKILL.md file, not directory)
  if [ -f "$skill_dir/SKILL.md" ]; then
    ln -s "$skill_dir/SKILL.md" "$target_link"
  else
    echo "   ⚠ Skipping $skill_name (no SKILL.md found)"
    continue
  fi
  echo "   ✓ /knowledge:$skill_name"
  ((count++))
done

echo ""
echo "✅ Installation complete! Linked $count skills."
echo ""
echo "📝 Next steps:"
echo "   1. Restart your VSCode window (Cmd+Shift+P → Reload Window)"
echo "   2. Type /knowledge: in Claude Code and verify all 16 skills appear"
echo "   3. Run /knowledge:init to set up your knowledge graph"
echo ""
echo "⚠️  Rollback: To remove these symlinks, run:"
echo "   rm $TARGET_DIR/knowledge:*.md"
