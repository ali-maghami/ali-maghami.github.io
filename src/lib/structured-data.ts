import type { PaperRecord, PostRecord, SiteSettings } from './portfolio-data';

/*
 * The JSON-LD each page carries, so a search engine or a link preview knows
 * this is a person's site, which pages are articles by that person, and which
 * publications are theirs. The builders are plain data so they can be tested;
 * the StructuredData component writes one out.
 */

type JsonLd = Record<string, unknown>;

/**
 * JSON for a <script type="application/ld+json">. `<` is escaped so a title
 * containing "</script>" cannot close the element early.
 */
export function serializeJsonLd(data: JsonLd): string {
	return JSON.stringify(data).replace(/</g, '\\u003c');
}

const CONTEXT = 'https://schema.org';

/** The site owner, with the profiles the settings link to. */
export function personSchema(settings: SiteSettings, site: URL, portrait?: string): JsonLd {
	const sameAs = [settings.social.github, settings.social.linkedin, settings.social.scholar].filter(
		(link): link is string => Boolean(link),
	);

	return {
		'@context': CONTEXT,
		'@type': 'Person',
		'@id': new URL('/#person', site).href,
		name: settings.siteTitle,
		url: site.href,
		description: settings.siteDescription,
		...(portrait ? { image: new URL(portrait, site).href } : {}),
		...(sameAs.length ? { sameAs } : {}),
	};
}

/** The site itself, published by that person. */
export function websiteSchema(settings: SiteSettings, site: URL): JsonLd {
	return {
		'@context': CONTEXT,
		'@type': 'WebSite',
		name: settings.siteTitle,
		url: site.href,
		description: settings.siteDescription,
		publisher: { '@id': new URL('/#person', site).href },
	};
}

/** A post, as an article by the owner. */
export function blogPostingSchema(
	post: PostRecord,
	settings: SiteSettings,
	site: URL,
	image?: string,
): JsonLd {
	const url = new URL(`/blog/${post.id}/`, site).href;

	return {
		'@context': CONTEXT,
		'@type': 'BlogPosting',
		'@id': url,
		mainEntityOfPage: url,
		headline: post.title,
		description: post.description,
		datePublished: post.pubDate.toISOString(),
		dateModified: (post.updatedDate ?? post.pubDate).toISOString(),
		...(image ? { image: new URL(image, site).href } : {}),
		...(post.tags.length ? { keywords: post.tags.join(', ') } : {}),
		author: { '@type': 'Person', '@id': new URL('/#person', site).href, name: settings.siteTitle },
		publisher: { '@id': new URL('/#person', site).href },
	};
}

/**
 * A publication. Journal and conference papers, theses and preprints are
 * scholarly articles; a patent has no schema.org type of its own and is a
 * creative work that says so.
 */
export function publicationSchema(paper: PaperRecord, authors: string[], site: URL): JsonLd {
	const doiUrl = paper.doi ? `https://doi.org/${paper.doi}` : undefined;
	const url = paper.url ?? doiUrl;

	return {
		'@context': CONTEXT,
		'@type': paper.kind === 'patent' ? 'CreativeWork' : 'ScholarlyArticle',
		...(paper.kind === 'patent' ? { additionalType: 'Patent' } : {}),
		headline: paper.title,
		name: paper.title,
		author: authors.map((name) => ({ '@type': 'Person', name })),
		datePublished: String(paper.year),
		isPartOf: { '@type': 'Periodical', name: paper.venue },
		...(paper.abstract ? { abstract: paper.abstract } : {}),
		...(paper.doi ? { identifier: paper.doi, sameAs: doiUrl } : {}),
		...(url ? { url } : {}),
		...(paper.tags.length ? { keywords: paper.tags.join(', ') } : {}),
		...(paper.pdf ? { encoding: { '@type': 'MediaObject', contentUrl: new URL(paper.pdf, site).href, encodingFormat: 'application/pdf' } } : {}),
	};
}
