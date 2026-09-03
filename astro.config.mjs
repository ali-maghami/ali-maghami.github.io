// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig, fontProviders } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import { rehypeExternalLinks } from './src/lib/external-links';
import { rehypeBodyMedia } from './src/lib/body-media';

// https://astro.build/config
export default defineConfig({
  site: 'https://ali-maghami.github.io',
  integrations: [mdx(), sitemap()],

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
