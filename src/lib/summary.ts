/**
 * Turns CMS markdown into the plain sentence a <meta name="description"> and
 * a share card can carry.
 *
 * The home page lede is markdown — it bolds a name and links a phrase — and a
 * description that quoted it raw would show asterisks and brackets in search
 * results. This strips the notation and keeps the words.
 */
export function plainText(markdown: string): string {
	return markdown
		.replace(/```[\s\S]*?```/g, ' ')
		.replace(/`([^`]*)`/g, '$1')
		.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
		.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
		.replace(/^\s{0,3}#{1,6}\s+/gm, '')
		.replace(/^\s{0,3}>\s?/gm, '')
		.replace(/^\s*(?:[-*+]|\d+\.)\s+/gm, '')
		.replace(/(\*\*|__)(.+?)\1/g, '$2')
		.replace(/(\*|_)(.+?)\1/g, '$2')
		.replace(/<[^>]+>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

/**
 * Joins the pieces of a description and fits them to the length search
 * engines show, ending on a sentence where one falls inside the limit and on
 * a word otherwise.
 */
export function metaDescription(parts: Array<string | undefined>, limit = 160): string {
	const text = parts
		.map((part) => part?.trim())
		.filter((part): part is string => Boolean(part))
		.join(' ')
		.replace(/\s+/g, ' ');

	if (text.length <= limit) return text;

	const window = text.slice(0, limit);

	// Prefer to stop where the writer did.
	const sentenceEnd = Math.max(window.lastIndexOf('. '), window.lastIndexOf('! '), window.lastIndexOf('? '));
	if (sentenceEnd >= limit / 2) return window.slice(0, sentenceEnd + 1);

	const wordEnd = window.lastIndexOf(' ');
	return `${window.slice(0, wordEnd > 0 ? wordEnd : limit).replace(/[,;:]$/, '')}…`;
}
