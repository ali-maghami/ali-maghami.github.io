import { type CollectionEntry, getCollection } from 'astro:content';
import { buildNavItems, isPublished, type NavItem } from './nav';

export interface SiteSections {
	counts: Record<string, number>;
	certificates: CollectionEntry<'certificates'>[];
}

/**
 * Header and Footer both render on every page and both need this, so without a
 * cache the content layer is queried twice per page. Astro shares this module
 * across the whole static build, so one promise serves every page — which also
 * keeps the "collection is empty" notice for a not-yet-populated section down to
 * one line per build instead of one per page.
 */
let cached: Promise<SiteSections> | undefined;

async function loadSections(): Promise<SiteSections> {
	const [projects, blog, papers, certificates] = await Promise.all([
		getCollection('projects'),
		getCollection('blog'),
		getCollection('papers'),
		getCollection('certificates'),
	]);

	return {
		counts: {
			projects: projects.length,
			blog: blog.filter(isPublished).length,
			papers: papers.length,
		},
		certificates: certificates.sort(
			(a, b) => b.data.issueDate.valueOf() - a.data.issueDate.valueOf(),
		),
	};
}

export function getSiteSections(): Promise<SiteSections> {
	cached ??= loadSections();
	return cached;
}

export async function getNavItems(): Promise<NavItem[]> {
	return buildNavItems((await getSiteSections()).counts);
}
