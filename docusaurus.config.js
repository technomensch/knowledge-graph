// @ts-check
const {themes: prismThemes} = require('prism-react-renderer');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Knowledge Management Graph',
  tagline: 'Structured knowledge capture and cross-session memory for Claude Code projects.',
  favicon: 'img/square.png',

  url: 'https://technomensch.github.io',
  baseUrl: '/knowledge-graph/',

  organizationName: 'technomensch',
  projectName: 'knowledge-graph',
  trailingSlash: true,

  onBrokenLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  themes: ['@docusaurus/theme-mermaid'],

  markdown: {
    mermaid: true,
    format: 'detect',
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          routeBasePath: '/',
          editUrl: 'https://github.com/technomensch/knowledge-graph/edit/main/',
          exclude: ['plans/**', 'chat-history/**', 'sessions/**', '_test-layout.md'],
        },
        blog: false,
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      mermaid: {
        theme: {light: 'neutral', dark: 'dark'},
      },
      navbar: {
        title: 'KMGraph',
        logo: {
          alt: 'Staying in Sync',
          src: 'img/avatar.png',
        },
        items: [
          {to: '/GETTING-STARTED', label: 'Getting Started', position: 'left'},
          {to: '/CONCEPTS', label: 'Concepts', position: 'left'},
          {to: '/COMMAND-GUIDE', label: 'Commands', position: 'left'},
          {to: '/CONFIGURATION', label: 'Configuration', position: 'left'},
          {
            href: 'https://github.com/technomensch/knowledge-graph',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        logo: {
          alt: 'Staying in Sync',
          src: 'img/banner.jpeg',
          href: 'https://github.com/technomensch/knowledge-graph',
          width: 160,
        },
        links: [
          {
            title: 'Docs',
            items: [
              {label: 'Getting Started', to: '/GETTING-STARTED'},
              {label: 'Command Guide', to: '/COMMAND-GUIDE'},
              {label: 'Cheat Sheet', to: '/CHEAT-SHEET'},
              {label: 'FAQ', to: '/FAQ'},
            ],
          },
          {
            title: 'Community',
            items: [
              {
                label: 'GitHub',
                href: 'https://github.com/technomensch/knowledge-graph',
              },
              {
                label: 'LinkedIn',
                href: 'https://www.linkedin.com/in/marckaplan/',
              },
              {
                label: 'Buy Me a Coffee',
                href: 'https://buymeacoffee.com/technomensch',
              },
            ],
          },
        ],
        copyright: 'Staying in Sync',
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
      },
    }),
};

module.exports = config;
