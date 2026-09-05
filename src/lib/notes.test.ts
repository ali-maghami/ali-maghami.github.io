import { describe, expect, it } from 'vitest';

import type { HastNode } from './external-links';
import { isNoteParagraph, rehypeNotes } from './notes';

const text = (value: string): HastNode => ({ type: 'text', value });
const element = (tagName: string, children: HastNode[], properties: Record<string, unknown> = {}): HastNode => ({
	type: 'element',
	tagName,
	properties,
	children,
});

const noteParagraph = () =>
	element('p', [element('em', [element('code', [text('Images are AI-generated.')])])]);

describe('isNoteParagraph', () => {
	it('recognises a paragraph that is only emphasised code', () => {
		expect(isNoteParagraph(noteParagraph())).toBe(true);
	});

	it('ignores whitespace around the emphasis', () => {
		const spaced = element('p', [text('\n'), element('em', [element('code', [text('x')])]), text(' ')]);
		expect(isNoteParagraph(spaced)).toBe(true);
	});

	it('leaves ordinary paragraphs, code and emphasis alone', () => {
		expect(isNoteParagraph(element('p', [text('Run '), element('code', [text('npm test')])]))).toBe(false);
		expect(isNoteParagraph(element('p', [element('em', [text('just italics')])]))).toBe(false);
		expect(isNoteParagraph(element('p', [element('code', [text('code only')])]))).toBe(false);
		expect(isNoteParagraph(element('p', [element('em', [element('code', [text('a')])]), text(' and more')]))).toBe(false);
		expect(isNoteParagraph(element('div', [element('em', [element('code', [text('a')])])]))).toBe(false);
	});
});

describe('rehypeNotes', () => {
	it('flattens the note to a paragraph with the class and role, keeping the words', () => {
		const tree: HastNode = { type: 'root', children: [noteParagraph(), element('p', [text('Prose.')])] };

		rehypeNotes()(tree);

		expect(tree.children?.[0]).toEqual(
			element('p', [text('Images are AI-generated.')], { className: ['note'], role: 'note' }),
		);
		expect(tree.children?.[1]).toEqual(element('p', [text('Prose.')]));
	});

	it('finds a note nested inside another element', () => {
		const tree: HastNode = { type: 'root', children: [element('blockquote', [noteParagraph()])] };
		rehypeNotes()(tree);
		expect(tree.children?.[0].children?.[0].properties).toEqual({ className: ['note'], role: 'note' });
	});
});
