import type { APIRoute } from 'astro';

import { listPosts, listProjects } from '../lib/portfolio-data';
import { latestDate, renderSitemap, type SitemapEntry } from '../lib/sitemap';

/*
 * Rendered per request, not at build time.
 *
 * This is the whole point of the route: the detail pages come from the
 * database, so a build-time sitemap can only ever list the index pages. See
 * lib/sitemap.ts.
 */
export const prerender = false;

/** The routes that exist regardless of what is in the database. */
const staticPaths = [
	'/',
	'/about/',
	'/blog/',
	'/projects/',
	'/papers/',
	'/certificates/',
];

export const GET: APIRoute = async ({ site }) => {
	if (!site) {
		throw new Error('Astro site URL is required to generate the sitemap');
	}

	const [projects, posts] = await Promise.all([listProjects(), listPosts()]);

	// An index page changed when its newest entry did. The papers and
	// certificate rows carry no update time the site reads, so those indexes
	// and the About page go undated rather than misdated.
	const projectsChanged = latestDate(projects.map((project) => project.updatedAt));
	const postsChanged = latestDate(posts.map((post) => post.updatedAt));
	const indexDates: Record<string, Date | undefined> = {
		'/': latestDate([projectsChanged, postsChanged]),
		'/blog/': postsChanged,
		'/projects/': projectsChanged,
	};

	const entries: SitemapEntry[] = [
		...staticPaths.map((path) => ({ path, lastmod: indexDates[path] })),
		...projects.map((project) => ({
			path: `/projects/${project.id}/`,
			lastmod: project.updatedAt,
		})),
		...posts.map((post) => ({
			path: `/blog/${post.id}/`,
			lastmod: post.updatedAt,
		})),
	];

	return new Response(renderSitemap(site, entries), {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
			// Long enough to spare the database a crawler's repeat visits, short
			// enough that a publish is picked up the same day.
			'Cache-Control': 'public, max-age=3600',
		},
	});
};
