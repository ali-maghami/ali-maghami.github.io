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
			heroImage: optional(image()),
			// The pill above the title on the home page card.
			label: z.string().default('Project'),
			// The card's wash, fading from its top right corner. Set per project
			// and stored, so a card keeps its colour between visits rather than
			// changing with the page palette.
			cardColor: z
				.string()
				.regex(/^#[0-9a-fA-F]{6}$/, 'Must be a hex colour like #7DD3FC')
				.default('#BFE3E0'),
			cardColorAlt: z
				.string()
				.regex(/^(#[0-9a-fA-F]{6})?$/, 'Must be a hex colour like #DCEFC8, or empty')
				.default(''),
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
			// The small label on the card, e.g. Post or Little ideas. Free text
			// rather than a fixed list so a new kind of writing does not need a
			// code change to appear.
			kind: z.string().default('Post'),
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
	schema: z.object({
		name: z.string(),
		issuer: z.string(),
		issueDate: z.coerce.date(),
		expiryDate: optional(z.coerce.date()),
		credentialId: optional(z.string()),
		url: optionalUrl,
		// Issuer badge artwork as a public path, e.g. /badges/aws.png. A served
		// file rather than an image() import, because the CMS has to be able to
		// fetch it to preview it — see src/lib/badges.ts.
		badge: optional(z.string()),
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
		summary: optional(z.string()),
	}),
});

const home = defineCollection({
	loader: glob({ base: './src/content/home', pattern: '**/*.{md,mdx}' }),
	schema: z.object({
		heading: z.string(),
		focusAreas: z.array(z.string()).default([]),
		// Portrait beside the hero, as a public path like /portrait/ali.jpg.
		// Public rather than an image() import so the CMS can preview it — the
		// same reason certificate badges live there. Optional: with no portrait
		// the hero simply renders as text.
		portrait: optional(z.string()),
		// Presentation, all editable from the CMS. Bounded rather than free
		// text: these become CSS, so a number with a range and a fixed set of
		// filters keeps the styling out of reach of whatever gets typed in.
		portraitSize: z.number().int().min(80).max(420).default(250),
		portraitBorderWidth: z.number().int().min(0).max(16).default(3),
		portraitOpacity: z.number().int().min(10).max(100).default(80),
		portraitFilter: z
			.enum(['grayscale', 'soft-grayscale', 'sepia', 'contrast', 'none'])
			.default('grayscale'),
		// Fill behind the photo, inside the ring. Constrained to six hex digits
		// because it becomes CSS; the opacity is separate so the colour can be
		// dialled up or down without picking it again. Transparent by default,
		// so nothing changes until it is set.
		portraitBackground: z
			.string()
			.regex(/^#[0-9a-fA-F]{6}$/, 'Must be a hex colour like #FFFFFF')
			.default('#FFFFFF'),
		portraitBackgroundOpacity: z.number().int().min(0).max(100).default(0),
		// How many of each list the page shows, newest first.
		projectCount: z.number().int().min(1).max(12).default(4),
		postCount: z.number().int().min(1).max(12).default(5),
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
