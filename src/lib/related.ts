/**
 * Which entries belong next to each other, decided from what they share.
 *
 * A post and the project it describes carry the same tags, because they are
 * about the same work; nothing else in the database says so. Until the CMS
 * records the link outright, the overlap is the link: the candidates that
 * share the most tags with the source come first, and anything sharing none is
 * left out rather than padded in.
 */
interface Tagged {
	id: string;
	tags: string[];
}

const normalise = (tag: string) => tag.trim().toLowerCase();

/** How many tags two entries have in common, ignoring case and spacing. */
export function sharedTags(a: Tagged, b: Tagged): number {
	const mine = new Set(a.tags.map(normalise));
	return b.tags.filter((tag) => mine.has(normalise(tag))).length;
}

/**
 * The strongest matches for `source` among `candidates`, most shared tags
 * first. Ties keep the candidates' own order, which callers pass newest first.
 */
export function relatedByTags<T extends Tagged>(source: Tagged, candidates: T[], limit = 2): T[] {
	return candidates
		.filter((candidate) => candidate.id !== source.id)
		.map((candidate, index) => ({ candidate, score: sharedTags(source, candidate), index }))
		.filter(({ score }) => score > 0)
		.sort((a, b) => b.score - a.score || a.index - b.index)
		.slice(0, limit)
		.map(({ candidate }) => candidate);
}

/**
 * The entries either side of `id` in a list ordered newest first: `newer` is
 * the one published after it, `older` the one before.
 */
export function neighbours<T extends { id: string }>(
	newestFirst: T[],
	id: string,
): { newer?: T; older?: T } {
	const index = newestFirst.findIndex((entry) => entry.id === id);
	if (index === -1) return {};

	return {
		newer: index > 0 ? newestFirst[index - 1] : undefined,
		older: index < newestFirst.length - 1 ? newestFirst[index + 1] : undefined,
	};
}
