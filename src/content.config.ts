import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Sveltia CMS writes an empty string for an optional field an editor filled in
// and then cleared, which would fail .url() and break the build on a PR the CMS
// itself opened. Treat blank as absent.
const blankToUndefined = (value: unknown) => (value === '' ? undefined : value);

const projects = defineCollection({
	loader: glob({ base: './src/content/projects', pattern: '**/*.{md,mdx}' }),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			type: z.enum(['personal', 'previous']),
			pubDate: z.coerce.date(),
			tags: z.array(z.string()).default([]),
			repoUrl: z.preprocess(blankToUndefined, z.string().url().optional()),
			liveUrl: z.preprocess(blankToUndefined, z.string().url().optional()),
			featured: z.boolean().default(false),
			heroImage: z.optional(image()),
		}),
});

export const collections = { projects };
