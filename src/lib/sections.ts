import { buildNavItems, type NavItem } from './nav';
import { type CertificateRecord, countPublished, listCertificates } from './portfolio-data';

export interface SiteSections {
	counts: Record<string, number>;
	certificates: CertificateRecord[];
}

/**
 * What the Header and Footer need on every page: which sections have anything
 * in them, and the certificates the footer strip may show.
 *
 * This used to load every published project, post, paper and certificate in
 * full — four SELECT * queries — to read their lengths, and did so once for
 * the Header and again for the Footer. The counts now come from one query
 * that returns three integers, and the request cache means both components
 * share a single execution of it and of the certificate list.
 */
export async function getSiteSections(): Promise<SiteSections> {
	const [counts, certificates] = await Promise.all([countPublished(), listCertificates()]);

	return {
		counts: {
			projects: counts.projects,
			blog: counts.posts,
			papers: counts.papers,
		},
		certificates,
	};
}

export async function getNavItems(): Promise<NavItem[]> {
	return buildNavItems((await getSiteSections()).counts);
}
