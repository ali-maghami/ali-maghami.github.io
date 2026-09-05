import type { HastNode } from './external-links';

/**
 * A rehype plugin that turns an aside written in the CMS into a styled note.
 *
 * The bodies carry disclaimers such as "Images are AI-generated and used for
 * illustrative purposes", written as an italic run of inline code so they
 * would look different from the prose. In a browser that renders as a
 * paragraph of monospace, which reads as a command rather than a caveat.
 *
 * A paragraph that consists of nothing but emphasised code — `*`text`*` or
 * `_`text`_` — is taken as that intent and becomes a note: a paragraph with
 * role="note" and a class the stylesheet knows. Anything else, including a
 * paragraph that merely contains some code, is left alone.
 */
const isElement = (node: HastNode | undefined, tagName: string) =>
	node?.type === 'element' && node.tagName === tagName;

/** The single element child of `node`, ignoring whitespace-only text. */
function onlyChild(node: HastNode): HastNode | undefined {
	const meaningful = (node.children ?? []).filter(
		(child) => !(child.type === 'text' && !(child.value ?? '').trim()),
	);
	return meaningful.length === 1 ? meaningful[0] : undefined;
}

export function isNoteParagraph(node: HastNode): boolean {
	if (!isElement(node, 'p')) return false;

	const emphasis = onlyChild(node);
	if (!isElement(emphasis, 'em')) return false;

	return isElement(onlyChild(emphasis!), 'code');
}

export function rehypeNotes() {
	return (tree: HastNode) => {
		const walk = (node: HastNode) => {
			node.children?.forEach(walk);

			if (!isNoteParagraph(node)) return;

			const code = onlyChild(onlyChild(node)!)!;
			node.properties = { ...node.properties, className: ['note'], role: 'note' };
			node.children = code.children ?? [];
		};

		walk(tree);
	};
}
