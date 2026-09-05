/**
 * The first image a body embeds, for a page that has no hero of its own.
 *
 * Several projects carry their lead image in the body rather than the hero
 * field, so a share of the page showed the site card instead of the work.
 * The first still in the markdown is the next best thing. Videos are skipped:
 * a share card cannot play one.
 */
const EMBED = /!\[[^\]]*\]\(\s*(<[^>]*>|[^\s)]+)[^)]*\)/g;
const STILL = /\.(?:png|jpe?g|webp|gif)$/i;

export function firstBodyImage(markdown: string): string | undefined {
	EMBED.lastIndex = 0;
	for (const match of markdown.matchAll(EMBED)) {
		const target = match[1].replace(/^<|>$/g, '').split(/[?#]/)[0];
		if (STILL.test(target)) return target;
	}
	return undefined;
}
