export interface NavItem {
	href: string;
	label: string;
}

export function getNavHref(path: string): string {
	return path;
}

/**
 * Every optional section, in the order it should appear in the navigation.
 * `key` matches the counts gathered from the content collections.
 */
const OPTIONAL_SECTIONS: { key: string; href: string; label: string }[] = [
	{ key: 'projects', href: '/projects/', label: 'Projects' },
	{ key: 'blog', href: '/blog/', label: 'Posts' },
	{ key: 'papers', href: '/papers/', label: 'Papers' },
	// Named for its source rather than "Posts", which now belongs to the
	// writing above it — two sections cannot share a label.
	{ key: 'posts', href: '/posts/', label: 'LinkedIn' },
];

/**
 * Builds the main navigation, hiding sections that have no published entries.
 *
 * A portfolio linking to an empty page looks broken, and several of these
 * collections start empty by design — they fill up as entries are added through
 * the CMS. This stays pure (counts in, items out) so it can be tested without
 * the content layer, which is also why it lives here rather than in sections.ts.
 */
export function buildNavItems(counts: Record<string, number>): NavItem[] {
	return [
		{ href: '/', label: 'Home' },
		...OPTIONAL_SECTIONS.filter((section) => (counts[section.key] ?? 0) > 0).map(
			({ href, label }) => ({ href, label }),
		),
		{ href: '/about/', label: 'About' },
	];
}

/** Drafts are editable in the CMS but never built into the site. */
export function isPublished(entry: { data: { draft?: boolean } }): boolean {
	return entry.data.draft !== true;
}

/**
 * The section a URL belongs to, as used by the footer badge setting.
 *
 * The site root is `home`; everything else is its first path segment, so
 * `/projects/railcar-vision/` and `/projects/` are both `projects`. Keeping it
 * to the first segment means a setting picks a whole section rather than
 * needing every individual entry listed.
 */
export function sectionForPath(pathname: string): string {
	const trimmed = pathname.split('?')[0].split('#')[0].replace(/^\/+|\/+$/g, '');
	return trimmed === '' ? 'home' : trimmed.split('/')[0];
}

/** Whether the footer should show the certificate badge strip on this page. */
export function showsFooterBadges(pathname: string, pages: readonly string[]): boolean {
	return pages.includes(sectionForPath(pathname));
}
