// @ts-check

import mdx from '@astrojs/mdx';
import node from '@astrojs/node';
import { defineConfig, fontProviders } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import { rehypeExternalLinks } from './src/lib/external-links';
import { rehypeBodyMedia } from './src/lib/body-media';

// https://astro.build/config
export default defineConfig({
  // The apex is now canonical. SITE_URL remains overridable for preview builds
  // without letting the GitHub Pages fallback claim to be the primary site.
  site: process.env.SITE_URL ?? 'https://maghami.dev',
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  // No sitemap integration: it resolves routes at build time, and the project
  // and post pages come from the database per request. src/pages/sitemap.xml.ts
  // renders the real one.
  integrations: [mdx()],

  // Links written in a body are plain markdown, with no way to say whether they
  // leave the site. This decides from the address instead.
  markdown: {
    rehypePlugins: [rehypeExternalLinks, rehypeBodyMedia],
  },

  fonts: [
      {
          // GitHub's own typeface, used for headings and body copy.
          provider: fontProviders.google(),
          name: 'Mona Sans',
          cssVariable: '--font-mona',
          weights: [300, 400, 500, 600, 700],
          styles: ['normal'],
          subsets: ['latin'],
          fallbacks: ['system-ui', 'sans-serif'],
      },
      {
          // Monospace for dates, badges and other metadata.
          provider: fontProviders.google(),
          name: 'JetBrains Mono',
          cssVariable: '--font-jetbrains',
          weights: [400, 500],
          styles: ['normal'],
          subsets: ['latin'],
          fallbacks: ['ui-monospace', 'monospace'],
      },
	],

  vite: {
    plugins: [tailwindcss()],
  },
});
