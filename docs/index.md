# Knowledge Graph Plugin

**Structured knowledge capture, lesson-learned documentation, and cross-session memory for Claude Code projects.**

This is a platform-agnostic knowledge graph that was developed entirely using Gemini and Claude, leveraging very specific context and detailed natural language prompting.

It is designed to take chats sessions with large language models (LLMs) and turn them into a searchable, institutional knowledge, library.

The cool thing is, it helps users grab the important stuff inside the development workflow without having to stop chatting:

- **Lesson-Learned Capture** with categorized storage and git metadata tracking
- **Knowledge Graph** with quick-reference entries linked to full lessons
- **MEMORY.md Bidirectional Sync** for persistent cross-session context
- **Meta-Issue Tracking** for complex multi-attempt problems
- **Automated Knowledge Sync** pipeline (4 steps → 1 command)
- **Chat History Extraction** from Claude Code and Gemini logs
- **Session Summaries** for work documentation
- **ADR Management** for architecture decisions
- **Multi-KG Support** with flexible configuration

Then, users can easily look up that information not only in their current chat, but also in any other chat session, even if they switch to a totally different LLM!

The key lies in the simple approach of embedding the knowledge directly within the project itself. This ensures the knowledge is always immediately available whenever and wherever the project is opened. Should the library become excessively large, users have the option to transfer it to an external third-party via MCP servers.

!!! info "📚 Project Origin"
    This project was initially built as a **personal learning project** to explore **docs-as-code** practices and plugin development. It has evolved into a comprehensive knowledge management system designed for institutional knowledge capture and cross-session memory. The architecture reflects these principles: platform-agnostic core, automated workflows, and portable knowledge representation.

---

## Quick Start

Start here:

<div class="grid cards" markdown>

- **[Getting Started](GETTING-STARTED.md)**

  Install, initialize, and configure in under 5 minutes. Step-by-step setup for installing with Claude Code, Cursor, or any local IDE CLI coding assistant

- **[Concepts](CONCEPTS.md)**

  Understand the knowledge graph structure. Learn about the Four Pillars this project was built on, key terminology, and how everything connects.

- **[Command Guide](COMMAND-GUIDE.md)**

  Full reference for all commands, organized by learning path. Essential, intermediate, and advanced commands.

- **[Cheat Sheet](CHEAT-SHEET.md)**

  One-page quick reference with the most common commands and workflows at a glance.

</div>

## Installation

The plugin supports three installation tiers:

| Tier | Platform | Commands Available |
|------|----------|--------------------|
| **Tier 1** | Claude Code (marketplace or local) | slash commands + hooks + agents |
| **Tier 2** | MCP IDEs (Cursor, Windsurf, VS Code, JetBrains) | MCP tools |
| **Tier 3** | Any platform (template-only) | Manual markdown workflow |

See [Getting Started](GETTING-STARTED.md) for platform-specific setup instructions.

## Links

- **Repository:** [github.com/technomensch/knowledge-graph](https://github.com/technomensch/knowledge-graph)
- **Issues:** [github.com/technomensch/knowledge-graph/issues](https://github.com/technomensch/knowledge-graph/issues)
- **Releases:** [github.com/technomensch/knowledge-graph/releases](https://github.com/technomensch/knowledge-graph/releases)
