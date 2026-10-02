import type { LoadedContent } from '@docusaurus/plugin-content-docs';
import type { Plugin } from '@docusaurus/types';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const npmUrl = 'https://www.npmjs.com/package/@jdarshan5/sheet-scope';

// The paragraph under the tagline in llms.txt. It has to stand on its own: an
// assistant may read this file and nothing else.
const about = `sheet-scope (npm: \`@jdarshan5/sheet-scope\`) manages @gorhom/bottom-sheet v5 modals in React Native and Expo apps. A sheet is opened with one typed call, \`await sheets.show('confirm', { title })\`, which resolves with the sheet's result. A sheet is mounted only while it's open, and it closes when the \`<SheetScope>\` that owns it unmounts. The library is JavaScript only, with no native code.`;

/** Turns a docs page's MDX into Markdown that reads without the site. */
function toMarkdown(source: string, videoUrl: (name: string) => string) {
  const markdown = source
    .replace(/^---\n[\s\S]*?\n---\n/, '')
    .replace(/^import \w+ from '@site\/[^']+';\n/gm, '')
    .replace(
      /<DemoVideo\s+name="([^"]+)"\s+caption="([^"]+)"\s*\/>/g,
      (_, name: string, caption: string) =>
        `Video: [${caption}](${videoUrl(name)})`
    );
  return `${markdown.trim()}\n`;
}

/**
 * Writes the docs out as Markdown for AI assistants and their crawlers:
 * `llms.txt` (an index, see https://llmstxt.org), `llms-full.txt` (every page
 * in one file), and a `.md` copy next to each docs page.
 */
export default function llmsTxt(): Plugin {
  return {
    name: 'llms-txt',

    async postBuild({ siteConfig, siteDir, outDir, plugins }) {
      const siteUrl = siteConfig.url + siteConfig.baseUrl;
      const repoUrl = `https://github.com/${siteConfig.organizationName}/${siteConfig.projectName}`;
      const videoUrl = (name: string) => `${siteUrl}video/${name}.mp4`;

      const content = plugins.find(
        (plugin) => plugin.name === 'docusaurus-plugin-content-docs'
      )?.content as LoadedContent | undefined;
      const docs = [...(content?.loadedVersions[0]?.docs ?? [])].sort(
        (a, b) => (a.sidebarPosition ?? 0) - (b.sidebarPosition ?? 0)
      );

      const pages = await Promise.all(
        docs.map(async (doc) => {
          const source = await readFile(
            path.join(siteDir, doc.source.replace('@site/', '')),
            'utf8'
          );
          const permalink = doc.permalink.replace(/\/$/, '');
          return {
            title: doc.title,
            description: doc.description,
            url: siteConfig.url + permalink,
            file: `${permalink.slice(siteConfig.baseUrl.length)}.md`,
            markdown: toMarkdown(source, videoUrl),
          };
        })
      );

      for (const page of pages) {
        const file = path.join(outDir, page.file);
        await mkdir(path.dirname(file), { recursive: true });
        await writeFile(file, page.markdown);
      }

      const index = [
        `# ${siteConfig.title}`,
        `> ${siteConfig.tagline}`,
        about,
        `Every page below is plain Markdown. [llms-full.txt](${siteUrl}llms-full.txt) has all of them in one file.`,
        '## Docs',
        pages
          .map(
            (page) => `- [${page.title}](${page.url}.md): ${page.description}`
          )
          .join('\n'),
        '## Optional',
        [
          `- [Source code](${repoUrl}): the library, its tests and an example app`,
          `- [npm package](${npmUrl})`,
        ].join('\n'),
      ];
      await writeFile(path.join(outDir, 'llms.txt'), `${index.join('\n\n')}\n`);

      // Pages link to each other as `./page.md`, which only resolves next to
      // the per-page copies.
      const full = [
        `# ${siteConfig.title}\n\n> ${siteConfig.tagline}\n\n${about}\n`,
        ...pages.map((page) => {
          const folder = page.url.slice(0, page.url.lastIndexOf('/') + 1);
          const markdown = page.markdown.replace(/\]\(\.\//g, `](${folder}`);
          return `Source: ${page.url}\n\n${markdown}`;
        }),
      ];
      await writeFile(
        path.join(outDir, 'llms-full.txt'),
        full.join('\n---\n\n')
      );
    },
  };
}
