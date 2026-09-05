/**
 * The author line of a paper, tidied and with the site owner picked out.
 *
 * Authors arrive as one string copied from wherever the paper was indexed, so
 * the same person appears as "Ali Maghami", "A Maghami", "Ali MAGHAMI" and
 * "Seyedali Maghami" across the list, and surnames come back in capitals from
 * patent offices. The page bolds the owner on every line, which is what a
 * reader scanning a publication list looks for, and evens out the case
 * without rewriting what the publication actually printed.
 */
export interface Author {
	name: string;
	/** Whether this is the site owner. */
	self: boolean;
}

/** Splits on commas, semicolons, ampersands and the word "and". */
function splitAuthors(authors: string): string[] {
	return authors
		.split(/\s*(?:,|;|&|\band\b)\s*/i)
		.map((name) => name.trim())
		.filter(Boolean);
}

/** "MAGHAMI" becomes "Maghami"; "AI" and "McD" are left as they are. */
function evenCase(word: string): string {
	if (word.length < 3 || word !== word.toUpperCase()) return word;
	return word[0] + word.slice(1).toLowerCase();
}

/**
 * Whether a printed name is the owner: the surname must match, and the given
 * part must begin with the owner's first initial or contain their first name
 * (so "Seyedali" is Ali).
 */
function isSelf(name: string, ownFirst: string, ownLast: string): boolean {
	const words = name.split(/\s+/);
	if (words.length < 2) return false;

	const last = words[words.length - 1].toLowerCase();
	if (last !== ownLast.toLowerCase()) return false;

	const given = words.slice(0, -1).join(' ').toLowerCase();
	const first = ownFirst.toLowerCase();
	return given.includes(first) || given.split(/[\s.]+/).some((part) => part.startsWith(first[0]));
}

export function formatAuthors(authors: string, ownName: string): Author[] {
	const ownWords = ownName.trim().split(/\s+/);
	const ownFirst = ownWords[0] ?? '';
	const ownLast = ownWords[ownWords.length - 1] ?? '';

	return splitAuthors(authors).map((raw) => {
		const name = raw.split(/\s+/).map(evenCase).join(' ');
		return { name, self: ownWords.length > 1 && isSelf(name, ownFirst, ownLast) };
	});
}
