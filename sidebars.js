/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  docs: [
    {type: 'doc', id: 'index',     label: '🏠 Home'},
    {type: 'doc', id: 'quickstart', label: '⚡ Quickstart (5 min)'},
    {type: 'doc', id: 'INSTALL',   label: '📦 Installation'},
    {type: 'doc', id: 'reference/command-guide', label: '📋 Commands'},

    {type: 'html', value: '<hr class="sidebar-divider" style="margin:8px 16px;" />'},

    // ── Pillars ───────────────────────────────────────────────────────────
    {
      type: 'category',
      label: '📥 Capturing',
      link: { type: 'doc', id: 'pillars/capturing/index' },
      collapsed: false,
      items: [
        {type: 'doc', id: 'pillars/capturing/capture-lessons-learned', label: 'Capture Lessons Learned'},
        {type: 'doc', id: 'pillars/capturing/capture-from-bugfix',     label: 'Capture from a Bugfix'},
        {type: 'doc', id: 'pillars/capturing/architecture-decisions',  label: 'Architecture Decisions'},
        {type: 'doc', id: 'pillars/capturing/capture-patterns',        label: 'Capture Patterns'},
        {type: 'doc', id: 'pillars/capturing/document-meta-issues',    label: 'Document Meta-Issues'},
        {type: 'doc', id: 'pillars/capturing/what-to-capture',         label: 'What to Capture'},
      ],
    },
    {
      type: 'category',
      label: '🔍 Recalling',
      link: { type: 'doc', id: 'pillars/recalling/index' },
      collapsed: false,
      items: [
        {type: 'doc', id: 'pillars/recalling/search-the-graph',  label: 'Search the Graph'},
        {type: 'doc', id: 'pillars/recalling/session-memory',    label: 'Session Memory'},
        {type: 'doc', id: 'pillars/recalling/linking-entries',   label: 'Linking Entries'},
      ],
    },
    {
      type: 'category',
      label: '🗂️ Organizing',
      link: { type: 'doc', id: 'pillars/organizing/index' },
      collapsed: false,
      items: [
        {type: 'doc', id: 'pillars/organizing/personal-vs-project',    label: 'Personal vs. Project'},
        {type: 'doc', id: 'pillars/organizing/multi-kg-workflows',     label: 'Multi-KG Workflows'},
        {type: 'doc', id: 'pillars/organizing/graph-configuration',    label: 'Graph Configuration'},
        {type: 'doc', id: 'pillars/organizing/backfill',               label: 'Backfill'},
        {type: 'doc', id: 'pillars/organizing/sanitize-before-sharing',label: 'Sanitize Before Sharing'},
      ],
    },
    {
      type: 'category',
      label: '🌐 Portability',
      link: { type: 'doc', id: 'pillars/portability/index' },
      collapsed: false,
      items: [
        {type: 'doc', id: 'pillars/portability/your-ai-profile',       label: 'Your AI Profile'},
        {type: 'doc', id: 'pillars/portability/sync-across-machines',  label: 'Sync Across Machines'},
        {type: 'doc', id: 'pillars/portability/use-in-cursor',         label: 'Use in Cursor'},
        {type: 'doc', id: 'pillars/portability/migrate-claude-gemini', label: 'Migrate Claude to Gemini'},
        {type: 'doc', id: 'pillars/portability/integrate-notebooklm',  label: 'Integrate NotebookLM'},
        {type: 'doc', id: 'pillars/portability/integrate-notion',      label: 'Integrate Notion'},
        {type: 'doc', id: 'pillars/portability/integrate-obsidian',    label: 'Integrate Obsidian'},
      ],
    },
    {
      type: 'category',
      label: '⚙️ Tailoring',
      link: { type: 'doc', id: 'pillars/tailoring/index' },
      collapsed: false,
      items: [
        {type: 'doc', id: 'pillars/tailoring/customize-hooks',     label: 'Customize Hooks'},
        {type: 'doc', id: 'pillars/tailoring/customize-templates', label: 'Customize Templates'},
        {type: 'doc', id: 'pillars/tailoring/custom-rules',        label: 'Custom Rules'},
        {type: 'doc', id: 'pillars/tailoring/automation-layer',    label: 'Automation Layer'},
      ],
    },

    {type: 'html', value: '<hr class="sidebar-divider" style="margin:8px 16px;" />'},

    // ── Reference ─────────────────────────────────────────────────────────
    {
      type: 'category',
      label: '📚 Reference',
      collapsed: true,
      items: [
        {type: 'doc', id: 'reference/commands',                label: 'Commands'},
        {type: 'doc', id: 'reference/hooks',                   label: 'Hooks'},
        {type: 'doc', id: 'reference/agents',                  label: 'Agents'},
        {type: 'doc', id: 'reference/skills',                  label: 'Skills'},
        {type: 'doc', id: 'reference/templates',               label: 'Templates'},
        {type: 'doc', id: 'reference/ARCHITECTURE',            label: 'Architecture'},
        {type: 'doc', id: 'reference/PLATFORM-ADAPTATION',     label: 'Platform Adaptation'},
        {type: 'doc', id: 'reference/tier-resolver',           label: 'Model Tier Resolver'},
        {type: 'doc', id: 'reference/SANITIZATION-CHECKLIST',  label: 'Sanitization Checklist'},
        {type: 'doc', id: 'CHEAT-SHEET',                       label: 'Cheat Sheet'},
        {type: 'doc', id: 'FAQ',                               label: 'FAQ'},
      ],
    },

    // ── Concepts ──────────────────────────────────────────────────────────
    {
      type: 'category',
      label: '💡 Concepts',
      collapsed: true,
      items: [
        {type: 'doc', id: 'concepts/why-kmgraph',                  label: 'Why KMGraph'},
        {type: 'doc', id: 'concepts/what-is-a-knowledge-graph',    label: 'What Is a Knowledge Graph'},
        {type: 'doc', id: 'concepts/four-content-types',           label: 'Four Content Types'},
        {type: 'doc', id: 'concepts/how-kmgraph-is-organized',     label: 'How KMGraph Is Organized'},
      ],
    },

    {type: 'html', value: '<hr class="sidebar-divider" style="margin:8px 16px;" />'},

    {type: 'doc', id: 'troubleshooting/troubleshooting', label: '🔧 Troubleshooting'},
    {
      type: 'link',
      label: '📓 Changelog',
      href: 'https://github.com/technomensch/knowledge-graph/blob/main/CHANGELOG.md',
    },
    {type: 'doc', id: 'GLOSSARY', label: '📖 Glossary'},
    {
      type: 'category',
      label: '🤝 Contributing',
      collapsed: true,
      items: [
        {type: 'doc', id: 'STYLE-GUIDE', label: 'Style Guide'},
        {type: 'doc', id: 'contributing/docs-updates-workflow', label: 'Docs Updates Workflow'},
      ],
    },
  ],
};

module.exports = sidebars;
