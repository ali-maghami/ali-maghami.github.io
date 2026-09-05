import type { APIRoute } from 'astro';

/*
 * The address @astrojs/sitemap used to publish, and the one already submitted
 * to search engines and named in older copies of robots.txt. Kept as a
 * permanent redirect so those crawls land on the real sitemap instead of a 404.
 */
export const prerender = false;

export const GET: APIRoute = ({ site }) => {
	if (!site) {
		throw new Error('Astro site URL is required to redirect the legacy sitemap');
	}

	return new Response(null, {
		status: 301,
		headers: { Location: new URL('sitemap.xml', site).href },
	});
};
