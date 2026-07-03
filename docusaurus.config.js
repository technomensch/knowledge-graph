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
  trailingSlash: undefined,

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

  plugins: [
    [
      '@docusaurus/plugin-client-redirects',
      {
        redirects: [
          // Phase 4+: redirects added as pages are confirmed moved
          // Note: only add 'from' paths that do NOT currently exist as pages
        ],
      },
    ],
    [
      '@docusaurus/plugin-content-blog',
      {
        id: 'docs-updates',
        routeBasePath: 'docs-updates',
        path: './docs-updates',
        blogTitle: 'Documentation Updates',
        blogDescription: 'Changes to the KMGraph documentation site',
        showReadingTime: false,
        feedOptions: {
          type: ['rss', 'atom'],
          title: 'KMGraph Docs Updates',
        },
        blogSidebarCount: 'ALL',
      },
    ],
    'plugin-image-zoom',
    [
      '@orama/plugin-docusaurus-v3',
      {
        analytics: { enabled: false },
      },
    ],
  ],

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          routeBasePath: '/',
          editUrl: 'https://github.com/technomensch/knowledge-graph/edit/main/',
          exclude: ['plans/**', 'chat-history/**', 'sessions/**', '_test-layout.md', 'enhancements/**', 'issues/**', 'knowledge/**'],
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
      colorMode: {
        defaultMode: 'dark',
        disableSwitch: false,
        respectPrefersColorScheme: false,
      },
      navbar: {
        title: 'KMGraph',
        logo: {
          alt: 'Staying in Sync',
          src: 'img/avatar.png',
        },
        items: [
          {to: '/quickstart', label: 'Getting Started', position: 'left'},
          {to: '/reference/command-guide', label: 'Commands', position: 'left'},
          {to: '/CONFIGURATION', label: 'Configuration', position: 'left'},
          {
            href: 'https://github.com/technomensch/knowledge-graph',
            position: 'right',
            className: 'header-github-link',
            'aria-label': 'GitHub repository',
          },
          {
            href: 'https://www.linkedin.com/in/marckaplan/',
            position: 'right',
            className: 'header-linkedin-link',
            'aria-label': 'LinkedIn profile',
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
              {label: 'Getting Started', to: '/quickstart'},
              {label: 'Command Guide', to: '/reference/command-guide'},
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
