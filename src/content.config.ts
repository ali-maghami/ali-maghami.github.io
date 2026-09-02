import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const projects = defineCollection({
	loader: glob({ base: './src/content/projects', pattern: '**/*.{md,mdx}' }),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			type: z.enum(['personal', 'previous']),
			pubDate: z.coerce.date(),
			tags: z.array(z.string()).default([]),
			repoUrl: z.string().url().optional(),
			liveUrl: z.string().url().optional(),
			featured: z.boolean().default(false),
			heroImage: z.optional(image()),
		}),
});

export const collections = { projects };
