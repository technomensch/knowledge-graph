/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  docs: [
    // ── Home ──────────────────────────────────────────────────────────────
    {type: 'doc', id: 'index', label: '🏠 Home'},

    // ── Quickstart ────────────────────────────────────────────────────────
    {type: 'doc', id: 'quickstart', label: '🚀 Quickstart (5 min)'},

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
    // Phase 5: guides/ pages added when created
    // {
    //   type: 'category',
    //   label: '🍳 How-to Guides',
    //   items: [
    //     'guides/capture-from-bugfix',
    //     'guides/create-adr',
    //     'guides/track-meta-issue',
    //     'guides/sync-across-machines',
    //     'guides/sanitize-before-sharing',
    //     'guides/backfill-existing-notes',
    //     'guides/use-in-cursor',
    //     'guides/migrate-claude-gemini',
    //     'guides/customize-templates',
    //     'guides/customize-hooks',
    //     'guides/multi-kg-workflows',
    //     'guides/integrate-notion',
    //     'guides/integrate-obsidian',
    //     'guides/integrate-notebooklm',
    //   ],
    // },

    // ── Reference ─────────────────────────────────────────────────────────
    {
      type: 'category',
      label: '📚 Reference',
      collapsed: false,
      items: [
        // Phase 6: reference/commands, reference/skills, reference/agents,
        //          reference/hooks, reference/templates, reference/mcp-tools
        //          added when those pages are created
        {type: 'doc', id: 'COMMAND-GUIDE', label: 'Commands'},
        {type: 'doc', id: 'CHEAT-SHEET', label: 'Cheat Sheet'},
        {type: 'doc', id: 'FAQ', label: 'FAQ'},
        {type: 'doc', id: 'CONFIGURATION', label: 'Configuration'},
        {type: 'doc', id: 'reference/ARCHITECTURE', label: 'Architecture'},
        {type: 'doc', id: 'reference/PLATFORM-ADAPTATION', label: 'Platform Adaptation'},
        {type: 'doc', id: 'reference/SANITIZATION-CHECKLIST', label: 'Sanitization Checklist'},
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
        // Phase 7: concepts/automation-layer added when created
      ],
    },

    // ── Troubleshooting ───────────────────────────────────────────────────
    // Phase 4: troubleshooting/ pages added when split from GETTING-STARTED
    // {
    //   type: 'category',
    //   label: '🛠 Troubleshooting',
    //   items: ['troubleshooting/index'],
    // },

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
