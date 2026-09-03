/**
 * Marks links that leave the site so they open in a new tab.
 *
 * Applied to markdown bodies at build time rather than offered as a choice in
 * the editor: whether a link is external is a fact about its address, not a
 * decision, and asking per link invites forgetting.
 */
const SITE_ORIGIN = 'https://ali-maghami.github.io';

/**
 * Whether an href points off this site.
 *
 * Only absolute http(s) addresses to another origin count. Relative paths,
 * fragments, and schemes like mailto: or tel: are left alone — a new tab for a
 * mail client is meaningless, and a fragment leaving the page is wrong.
 */
export function isExternalHref(href: string, origin: string = SITE_ORIGIN): boolean {
	if (!href) return false;

	try {
		const url = new URL(href, origin);
		if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
		return url.origin !== new URL(origin).origin;
	} catch {
		// Not parseable as a URL even against a base, so not a link off-site.
		return false;
	}
}

export interface HastNode {
	type?: string;
	tagName?: string;
	properties?: Record<string, unknown>;
	children?: HastNode[];
	/* Text nodes carry their content here rather than in children. */
	value?: string;
}

/**
 * A rehype plugin that opens external links in a new tab.
 *
 * The tree is walked directly rather than with unist-util-visit, which is
 * present only as a transitive dependency and could disappear on an install.
 *
 * The arrow and the hidden note are the same pair the ExternalLink component
 * uses, so a link written in the CMS is marked exactly like one written in a
 * template: the arrow shows a sighted reader where the link goes before they
 * click, and the note tells everyone else. `rel` carries noopener so the new
 * page cannot reach back through window.opener.
 */
export function rehypeExternalLinks() {
	return (tree: HastNode) => {
		const walk = (node: HastNode) => {
			if (node.type === 'element' && node.tagName === 'a') {
				const href = String(node.properties?.href ?? '');
				if (isExternalHref(href)) {
					node.properties = {
						...node.properties,
						target: '_blank',
						rel: ['noopener', 'noreferrer'],
					};
					node.children = [
						...(node.children ?? []),
						{
							type: 'element',
							tagName: 'span',
							properties: { className: ['ext'], 'aria-hidden': 'true' },
							children: [{ type: 'text', value: '↗' }],
						},
						{
							type: 'element',
							tagName: 'span',
							properties: { className: ['sr-only'] },
							children: [{ type: 'text', value: ' (opens in a new tab)' }],
						},
					];
				}
			}
			node.children?.forEach(walk);
		};
		walk(tree);
	};
}
