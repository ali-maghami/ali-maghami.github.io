/**
 * The sitemap, built from the content that actually exists.
 *
 * @astrojs/sitemap resolved routes when the image was built, which stopped
 * working the moment content moved into PostgreSQL: `/projects/[...slug]` and
 * `/blog/[...slug]` are answered per request, so the build could not see a
 * single one of them and shipped a sitemap of six index pages. Nothing failed —
 * the file was simply short, which is the hard kind of wrong to notice.
 *
 * Rendering it from the same queries the pages use means it cannot drift: a
 * project that is published is in the sitemap, and one that is a draft is not,
 * without anything having to be kept in step by hand.
 */

export interface SitemapEntry {
	/** Root-relative, with the trailing slash the site's own links use. */
	path: string;
	/** When the content last changed, if it is known. */
	lastmod?: Date;
}

/** The five characters XML cannot carry raw. */
function escapeXml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

/** W3C date, which is what <lastmod> accepts. Invalid dates are dropped. */
function formatLastmod(date: Date): string | undefined {
	const time = date.getTime();
	if (Number.isNaN(time)) return undefined;
	return date.toISOString().slice(0, 10);
}

/**
 * The most recent of a set of dates, for an index page whose content is the
 * entries beneath it: the blog index changed when its newest post did.
 * Undefined when there is nothing to date it by.
 */
export function latestDate(dates: Array<Date | undefined>): Date | undefined {
	let latest: Date | undefined;
	for (const date of dates) {
		if (date && !Number.isNaN(date.getTime()) && (!latest || date > latest)) latest = date;
	}
	return latest;
}

export function renderSitemap(site: URL, entries: SitemapEntry[]): string {
	const urls = entries.map((entry) => {
		const location = escapeXml(new URL(entry.path, site).href);
		const lastmod = entry.lastmod && formatLastmod(entry.lastmod);

		return lastmod
			? `\t<url>\n\t\t<loc>${location}</loc>\n\t\t<lastmod>${lastmod}</lastmod>\n\t</url>`
			: `\t<url>\n\t\t<loc>${location}</loc>\n\t</url>`;
	});

	return [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
		...urls,
		'</urlset>',
		'',
	].join('\n');
}
