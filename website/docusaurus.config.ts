import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import llmsTxt from './plugins/llms-txt';

const repoUrl = 'https://github.com/jdarshan5/sheet-scope';

const config: Config = {
  title: 'sheet-scope',
  tagline:
    'Scoped, lazily-mounted, typed bottom sheet manager for React Native, built on @gorhom/bottom-sheet',
  favicon: 'img/favicon.svg',

  future: {
    v4: true,
  },

  // Served by GitHub Pages at https://jdarshan5.github.io/sheet-scope/
  url: 'https://jdarshan5.github.io',
  baseUrl: '/sheet-scope/',
  organizationName: 'jdarshan5',
  projectName: 'sheet-scope',
  // GitHub Pages redirects /docs/api to /docs/api/ when the page is a folder,
  // which the canonical URL and the sitemap then disagree with. This emits
  // docs/api.html instead, so the URL without the slash is the real one.
  trailingSlash: false,

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: `${repoUrl}/tree/main/website/`,
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
        sitemap: {
          // Search engines read lastmod and ignore the other two.
          lastmod: 'date',
          changefreq: null,
          priority: null,
        },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [llmsTxt],

  themeConfig: {
    // The preview shown when a page is shared. 1200x630.
    image: 'img/social-card.png',
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'sheet-scope',
      logo: {
        alt: 'sheet-scope logo',
        src: 'img/logo.svg',
        srcDark: 'img/logo-dark.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docs',
          position: 'left',
          label: 'Docs',
        },
        { to: '/docs/api', label: 'API', position: 'left' },
        { href: repoUrl, label: 'GitHub', position: 'right' },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        { label: 'Why sheet-scope', to: '/docs/why' },
        { label: 'Getting started', to: '/docs/getting-started' },
        { label: 'GitHub', href: repoUrl },
        { label: 'Issues', href: `${repoUrl}/issues` },
      ],
      copyright: 'MIT licensed. Built with Docusaurus.',
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
