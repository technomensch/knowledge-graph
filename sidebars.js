/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  docs: [
    {type: 'doc', id: 'index', label: 'Home'},
    {type: 'doc', id: 'GETTING-STARTED', label: 'Getting Started'},
    {type: 'doc', id: 'INSTALL', label: 'Installation'},
    {
      type: 'category',
      label: 'Concepts',
      items: [
        {type: 'doc', id: 'CONCEPTS', label: 'Overview'},
        {type: 'doc', id: 'layers-four', label: 'Four-Layer Architecture'},
        {type: 'doc', id: 'pillars-four', label: 'Four Pillars'},
        {type: 'doc', id: 'PERSONAL-V-PROJECT', label: 'Personal vs Project'},
        {type: 'doc', id: 'SEARCH', label: 'How Search Works'},
      ],
    },
    {
      type: 'category',
      label: 'Commands',
      items: [
        {type: 'doc', id: 'COMMAND-GUIDE', label: 'Command Guide'},
        {type: 'doc', id: 'CHEAT-SHEET', label: 'Cheat Sheet'},
        {type: 'doc', id: 'FAQ', label: 'FAQ'},
      ],
    },
    {type: 'doc', id: 'CONFIGURATION', label: 'Configuration'},
    {type: 'link', label: 'Changelog', href: 'https://github.com/technomensch/knowledge-graph/blob/main/CHANGELOG.md'},
    {
      type: 'category',
      label: 'Contributing',
      items: [
        {type: 'doc', id: 'STYLE-GUIDE', label: 'Style Guide'},
        {type: 'doc', id: 'NAVIGATION-INDEX', label: 'Navigation Index'},
      ],
    },
    {type: 'doc', id: 'GLOSSARY', label: 'Glossary'},
    {
      type: 'category',
      label: 'Advanced',
      items: [
        {type: 'doc', id: 'reference/ARCHITECTURE', label: 'Architecture'},
        {type: 'doc', id: 'reference/WORKFLOWS', label: 'Manual Workflows'},
        {type: 'doc', id: 'reference/PLATFORM-ADAPTATION', label: 'Platform Adaptation'},
        {type: 'doc', id: 'reference/PATTERNS-GUIDE', label: 'Pattern Writing'},
        {type: 'doc', id: 'reference/META-ISSUE-GUIDE', label: 'Meta-Issue Guide'},
        {type: 'doc', id: 'reference/SANITIZATION-CHECKLIST', label: 'Sanitization Checklist'},
      ],
    },
  ],
};

module.exports = sidebars;
