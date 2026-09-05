import { buildNavItems, type NavItem } from './nav';
import {
	type CertificateRecord,
	listCertificates,
	listPapers,
	listPosts,
	listProjects,
} from './portfolio-data';

export interface SiteSections {
	counts: Record<string, number>;
	certificates: CertificateRecord[];
}

/**
 * Header and Footer both render on every page and both need this, so without a
 * cache the content layer is queried twice per page. Astro shares this module
 * across the whole static build, so one promise serves every page — which also
 * keeps the "collection is empty" notice for a not-yet-populated section down to
 * one line per build instead of one per page.
 */
async function loadSections(): Promise<SiteSections> {
	const [projects, blog, papers, certificates] = await Promise.all([
		listProjects(),
		listPosts(),
		listPapers(),
		listCertificates(),
	]);

	return {
		counts: {
			projects: projects.length,
			blog: blog.length,
			papers: papers.length,
		},
		certificates,
	};
}

export function getSiteSections(): Promise<SiteSections> {
	return loadSections();
}

export async function getNavItems(): Promise<NavItem[]> {
	return buildNavItems((await getSiteSections()).counts);
}
