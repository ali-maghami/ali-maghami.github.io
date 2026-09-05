import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';

import { feedItems } from '../lib/feed';
import { getSiteSettings, listPosts } from '../lib/portfolio-data';

/*
 * Rendered per request, for the same reason the sitemap is: the posts live in
 * the database, so a build-time feed would be frozen at whatever was published
 * when the image was made.
 *
 * The title and description come from the CMS settings rather than a constant,
 * so renaming the site in one place renames it in the feed too.
 */
export const prerender = false;

export const GET: APIRoute = async (context) => {
	if (!context.site) {
		throw new Error('Astro site URL is required to generate the feed');
	}

	const [posts, settings] = await Promise.all([listPosts(), getSiteSettings()]);

	return rss({
		title: settings.siteTitle,
		description: settings.siteDescription,
		site: context.site,
		items: feedItems(posts),
		trailingSlash: true,
		// Points a reader at the site it came from, which several clients show
		// beside the feed name.
		customData: '<language>en</language>',
	});
};
