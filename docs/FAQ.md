# Frequently Asked Questions (FAQ)

This guide provides answers to common questions about using and maintaining the Knowledge Graph plugin.

---

## 1. Using the plugin without Claude Code
**Can contributors use this without Claude Code?**
Yes, the knowledge graph is designed to be platform-agnostic. While it works optimally with Claude Code, the markdown-based structure allows it to be used by other AI assistants like GitHub Copilot or Google Gemini, provided they have access to the file system.

## 2. Backing up the knowledge graph
**How do contributors back up the knowledge graph?**
The knowledge graph is a collection of markdown files in a Git repository. Contributors back it up by committing changes and pushing them to a remote repository like GitHub, GitLab, or Bitbucket.

## 3. Restoring deleted lessons
**What if a contributor accidentally deletes a lesson?**
Because the knowledge graph is version-controlled via Git, contributors can use standard Git commands (like `git checkout` or `git revert`) or an IDE's source control history to restore any deleted or modified markdown files.

## 4. Sharing with a team
**How do contributors share the knowledge graph with a team?**
Contributors share the knowledge graph by granting access to the Git repository where it is hosted. Team members can then clone the repository and use their own local AI assistants to interact with the exact same knowledge context.

## 5. Recognizing a populated knowledge graph
**What does a populated knowledge graph look like?**
A populated knowledge graph contains detailed markdown files in the `docs/knowledge` layer, robust technical context in the `docs/decisions` layer (ADRs), and specific actionable insights in the `docs/lessons-learned/` directory.

## 6. Uninstalling or resetting
**How do contributors uninstall or reset the knowledge graph?**
To completely reset, contributors delete the cloned repository folder from the local machine. To clear specific concepts or lessons while keeping the structure, contributors delete the markdown files within `docs/knowledge/` or `docs/lessons-learned/` and commit the removals.

## 7. Removing example files

**Can the `core/examples/` directory be deleted after installation?**

The example files in `core/examples/` can be safely deleted — the plugin does not depend on them at runtime. However, because they are tracked in git, a `git pull` will restore them. Users who delete the examples should be aware that they may reappear after updating the plugin. A future release may move examples to an opt-in location; see [ADR-011](decisions/ADR-011-defer-update-notifications.md) for background.

## 8. Checking for plugin updates

**How do Tier 2 (MCP IDE) and Tier 3 (template-only) users know when a new version is available?**

Currently, Tier 2 and Tier 3 users must check the [GitHub releases page](https://github.com/technomensch/knowledge-graph/releases) manually to discover updates. A `kg_version` MCP tool and `--version` CLI flag are planned for a future release to provide version reporting from within the IDE. See [ADR-011](decisions/ADR-011-defer-update-notifications.md) for the full design decision.

## 9. Related Documentation

- [Getting Started](GETTING-STARTED.md) - Initial setup and initialization.
- [Concepts](CONCEPTS.md) - Canonical definitions of terms used in the Knowledge Graph.
