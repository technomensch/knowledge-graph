/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  docs: [
    // ── Home ──────────────────────────────────────────────────────────────
    {type: 'doc', id: 'index', label: '🏠 Home'},

    // ── Quickstart ────────────────────────────────────────────────────────
    {type: 'doc', id: 'quickstart', label: '🚀 Quickstart (5 min)'},
    {type: 'doc', id: 'INSTALL', label: 'Installation'},
    {type: 'doc', id: 'COMMAND-GUIDE', label: '📖 Command Guide'},

    // ── Tutorials ─────────────────────────────────────────────────────────
    // Phase 4/5: tutorial pages created in those phases
    // {
    //   type: 'category',
    //   label: '📖 Tutorials',
    //   items: [
    //     'tutorials/first-lesson',
    //     'tutorials/first-recall',
    //     'tutorials/first-session-wrap',
    //   ],
    // },

    // ── How-to Guides ─────────────────────────────────────────────────────
    {
      type: 'category',
      label: '🍳 How-to Guides',
      collapsed: true,
      items: [
        {
          type: 'category',
          label: 'Build your graph',
          collapsed: false,
          items: [
            {type: 'doc', id: 'guides/me-and-rules', label: 'Set up your identity files'},
            {type: 'doc', id: 'guides/backfill-existing-notes', label: 'Backfill existing notes'},
            {type: 'doc', id: 'guides/capture-from-bugfix', label: 'Capture a bug'},
            {type: 'doc', id: 'guides/create-adr', label: 'Capture a decision'},
            {type: 'doc', id: 'guides/track-meta-issue', label: 'Track a meta-issue'},
          ],
        },
        {
          type: 'category',
          label: 'Customize your graph',
          collapsed: false,
          items: [
            {type: 'doc', id: 'guides/customize-templates', label: 'Customize templates'},
            {type: 'doc', id: 'guides/customize-hooks', label: 'Customize hooks'},
          ],
        },
        {
          type: 'category',
          label: 'Advanced',
          collapsed: false,
          items: [
            {type: 'doc', id: 'guides/sanitize-before-sharing', label: 'Sanitize before sharing'},
            {type: 'doc', id: 'guides/multi-kg-workflows', label: 'Multi-KG workflows'},
            {type: 'doc', id: 'guides/sync-across-machines', label: 'Sync across machines'},
            {type: 'doc', id: 'guides/pattern-writing', label: 'Pattern writing'},
          ],
        },
        {
          type: 'category',
          label: 'Cross-Platform',
          collapsed: false,
          items: [
            {type: 'doc', id: 'guides/use-in-cursor', label: 'Use in Cursor/Windsurf/VS Code'},
            {type: 'doc', id: 'guides/migrate-claude-gemini', label: 'Migrate Claude ↔ Gemini'},
            {type: 'doc', id: 'guides/integrate-notion', label: 'Integrate with Notion'},
            {type: 'doc', id: 'guides/integrate-obsidian', label: 'Integrate with Obsidian'},
            {type: 'doc', id: 'guides/integrate-notebooklm', label: 'Integrate with NotebookLM'},
          ],
        },
      ],
    },

    // ── Reference ─────────────────────────────────────────────────────────
    {
      type: 'category',
      label: '📚 Reference',
      collapsed: true,
      items: [
        // Automation Layer — the four plugin components
        {
          type: 'category',
          label: 'Automation Layer',
          collapsed: false,
          items: [
            {type: 'doc', id: 'reference/commands', label: 'Commands'},
            {type: 'doc', id: 'reference/skills', label: 'Skills'},
            {type: 'doc', id: 'reference/agents', label: 'Agents'},
            {type: 'doc', id: 'reference/hooks', label: 'Hooks'},
            {type: 'doc', id: 'reference/templates', label: 'Templates'},
          ],
        },
        // Quick Reference
        {
          type: 'category',
          label: 'Quick Reference',
          collapsed: false,
          items: [
            {type: 'doc', id: 'CHEAT-SHEET', label: 'Cheat Sheet'},
            {type: 'doc', id: 'FAQ', label: 'FAQ'},
          ],
        },
        // Setup & Architecture
        {
          type: 'category',
          label: 'Setup & Architecture',
          collapsed: false,
          items: [
            {type: 'doc', id: 'CONFIGURATION', label: 'Configuration'},
            {type: 'doc', id: 'reference/PLATFORM-ADAPTATION', label: 'Platform Adaptation'},
            {type: 'doc', id: 'reference/ARCHITECTURE', label: 'Architecture'},
            {type: 'doc', id: 'reference/SANITIZATION-CHECKLIST', label: 'Sanitization Checklist'},
          ],
        },
      ],
    },

    // ── Concepts ──────────────────────────────────────────────────────────
    {
      type: 'category',
      label: '🧠 Concepts',
      collapsed: true,
      items: [
        {type: 'doc', id: 'CONCEPTS', label: 'Overview'},
        {type: 'doc', id: 'concepts/why-kmgraph', label: 'Why KMGraph?'},
        {type: 'doc', id: 'pillars-four', label: 'Four Pillars'},
        {type: 'doc', id: 'layers-four', label: 'Four-Layer Architecture'},
        {type: 'doc', id: 'PERSONAL-V-PROJECT', label: 'Personal vs Project'},
        {type: 'doc', id: 'SEARCH', label: 'How Search Works'},
        {type: 'doc', id: 'concepts/automation-layer', label: 'Automation Layer'},
      ],
    },

    // ── Troubleshooting ───────────────────────────────────────────────────
    {type: 'doc', id: 'troubleshooting/troubleshooting', label: '🛠 Troubleshooting'},

    // ── Changelog ─────────────────────────────────────────────────────────
    {
      type: 'link',
      label: '📓 Changelog',
      href: 'https://github.com/technomensch/knowledge-graph/blob/main/CHANGELOG.md',
    },

    // ── Glossary ──────────────────────────────────────────────────────────
    {type: 'doc', id: 'GLOSSARY', label: '🔤 Glossary'},

    // ── Contributing ──────────────────────────────────────────────────────
    {
      type: 'category',
      label: '🤝 Contributing',
      collapsed: true,
      items: [
        {type: 'doc', id: 'STYLE-GUIDE', label: 'Style Guide'},
        {type: 'doc', id: 'contributing/docs-updates-workflow', label: 'Docs Updates Workflow'},
        // NAVIGATION-INDEX removed in Phase 4 (deleted)
      ],
    },
  ],
};

module.exports = sidebars;
