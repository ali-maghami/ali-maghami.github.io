import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
// Optional fields go through these helpers so a field an editor cleared in the
// CMS is read as absent rather than as an empty string or null. See lib/schema.
import { optional, optionalUrl } from './lib/schema';

const projects = defineCollection({
	loader: glob({ base: './src/content/projects', pattern: '**/*.{md,mdx}' }),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			type: z.enum(['personal', 'previous']),
			pubDate: z.coerce.date(),
			tags: z.array(z.string()).default([]),
			repoUrl: optionalUrl,
			liveUrl: optionalUrl,
			featured: z.boolean().default(false),
			heroImage: optional(image()),
		}),
});

const blog = defineCollection({
	loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			pubDate: z.coerce.date(),
			updatedDate: optional(z.coerce.date()),
			tags: z.array(z.string()).default([]),
			// Drafts stay out of the built site but remain editable in the CMS,
			// so a half-written post can be saved without publishing it.
			draft: z.boolean().default(false),
			heroImage: optional(image()),
		}),
});

const papers = defineCollection({
	loader: glob({ base: './src/content/papers', pattern: '**/*.{md,mdx}' }),
	schema: z.object({
		title: z.string(),
		// Free text rather than a list: citation order matters and authors are
		// written the way the venue printed them, e.g. "Maghami, A., Salehi, M."
		authors: z.string(),
		venue: z.string(),
		year: z.coerce.number().int(),
		kind: z.enum(['journal', 'conference', 'patent', 'thesis', 'preprint']).default('journal'),
		abstract: optional(z.string()),
		doi: optional(z.string()),
		url: optionalUrl,
		pdfUrl: optionalUrl,
		citations: optional(z.number().int().nonnegative()),
		featured: z.boolean().default(false),
	}),
});

const certificates = defineCollection({
	loader: glob({ base: './src/content/certificates', pattern: '**/*.{md,mdx}' }),
	schema: ({ image }) =>
		z.object({
			name: z.string(),
			issuer: z.string(),
			issueDate: z.coerce.date(),
			expiryDate: optional(z.coerce.date()),
			credentialId: optional(z.string()),
			url: optionalUrl,
			// Issuer badge artwork, supplied at 125x125 and rendered small — see
			// certificates/index.astro and Footer.astro — so it reads as a mark
			// rather than as an image.
			badge: optional(image()),
			// Only featured certificates go in the site footer; the rest live on
			// the certificates page. Without this the footer grows without limit.
			featured: z.boolean().default(false),
		}),
});

const posts = defineCollection({
	loader: glob({ base: './src/content/posts', pattern: '**/*.{md,mdx}' }),
	schema: z.object({
		title: z.string(),
		// The numeric id from a LinkedIn post URL, used to build the official
		// embed iframe. See docs/cms.md for how to find it.
		postId: z.string(),
		pubDate: z.coerce.date(),
		summary: optional(z.string()),
	}),
});

const home = defineCollection({
	loader: glob({ base: './src/content/home', pattern: '**/*.{md,mdx}' }),
	schema: z.object({
		heading: z.string(),
		focusAreas: z.array(z.string()).default([]),
	}),
});

const about = defineCollection({
	loader: glob({ base: './src/content/about', pattern: '**/*.{md,mdx}' }),
	schema: z.object({
		title: z.string(),
		eyebrow: z.string().default('About'),
		standfirst: z.string(),
		skills: z
			.array(z.object({ area: z.string(), detail: z.string() }))
			.default([]),
		education: z
			.array(z.object({ label: z.string(), detail: z.string() }))
			.default([]),
	}),
});

export const collections = { projects, blog, papers, certificates, posts, home, about };
