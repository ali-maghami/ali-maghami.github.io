import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Sveltia CMS writes an empty string for an optional field an editor filled in
// and then cleared, which would fail .url() and break the build on a PR the CMS
// itself opened. Treat blank as absent.
const blankToUndefined = (value: unknown) => (value === '' ? undefined : value);

/** An optional URL that tolerates the empty string the CMS writes for a cleared field. */
const optionalUrl = z.preprocess(blankToUndefined, z.string().url().optional());

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
			heroImage: z.optional(image()),
		}),
});

const blog = defineCollection({
	loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			pubDate: z.coerce.date(),
			updatedDate: z.optional(z.coerce.date()),
			tags: z.array(z.string()).default([]),
			// Drafts stay out of the built site but remain editable in the CMS,
			// so a half-written post can be saved without publishing it.
			draft: z.boolean().default(false),
			heroImage: z.optional(image()),
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
		abstract: z.optional(z.string()),
		doi: z.optional(z.string()),
		url: optionalUrl,
		pdfUrl: optionalUrl,
		citations: z.optional(z.number().int().nonnegative()),
		featured: z.boolean().default(false),
	}),
});

const certificates = defineCollection({
	loader: glob({ base: './src/content/certificates', pattern: '**/*.{md,mdx}' }),
	schema: z.object({
		name: z.string(),
		issuer: z.string(),
		issueDate: z.coerce.date(),
		expiryDate: z.optional(z.coerce.date()),
		credentialId: z.optional(z.string()),
		url: optionalUrl,
		// Only featured certificates go in the site footer; the rest live on the
		// certificates page. Without this the footer grows without limit.
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
		summary: z.optional(z.string()),
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
