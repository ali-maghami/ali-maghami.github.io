import { describe, expect, it } from 'vitest';
import { isExternalHref, rehypeExternalLinks, type HastNode } from './external-links';

describe('isExternalHref', () => {
	it('treats an address on another origin as external', () => {
		expect(isExternalHref('https://github.com/ali-maghami')).toBe(true);
	});

	it('treats http as external too, not only https', () => {
		expect(isExternalHref('http://example.com/paper')).toBe(true);
	});

	it('leaves relative links alone', () => {
		expect(isExternalHref('/projects/')).toBe(false);
		expect(isExternalHref('../about/')).toBe(false);
	});

	it('leaves fragments and query-only links alone', () => {
		expect(isExternalHref('#overview')).toBe(false);
		expect(isExternalHref('?page=2')).toBe(false);
	});

	// A new tab for a mail client or a dialler is meaningless, and on some
	// platforms it leaves an empty tab behind after the handler opens.
	it('leaves schemes that are not web pages alone', () => {
		expect(isExternalHref('mailto:seyedali.maghami@gmail.com')).toBe(false);
		expect(isExternalHref('tel:+15140000000')).toBe(false);
	});

	// The site's own absolute URLs appear in content written before a page was
	// moved, and in anything pasted from the address bar.
	it('does not treat the site itself as external', () => {
		expect(isExternalHref('https://ali-maghami.github.io/projects/')).toBe(false);
	});

	it('compares origins, so a subdomain is external', () => {
		expect(isExternalHref('https://docs.ali-maghami.github.io/')).toBe(true);
	});

	it('returns false for an empty or unparseable href', () => {
		expect(isExternalHref('')).toBe(false);
		expect(isExternalHref('http://[')).toBe(false);
	});
});

const link = (href: string): HastNode => ({
	type: 'root',
	children: [
		{
			type: 'element',
			tagName: 'a',
			properties: { href },
			children: [{ type: 'text', value: 'read it' }],
		},
	],
});

describe('rehypeExternalLinks', () => {
	it('opens an external link in a new tab, safely', () => {
		const tree = link('https://example.com/paper');
		rehypeExternalLinks()(tree);

		const a = tree.children![0];
		expect(a.properties!.target).toBe('_blank');
		expect(a.properties!.rel).toEqual(['noopener', 'noreferrer']);
	});

	it('marks it with an arrow and a note, without disturbing the label', () => {
		const tree = link('https://example.com/paper');
		rehypeExternalLinks()(tree);

		const [label, arrow, note] = tree.children![0].children!;
		expect(label).toEqual({ type: 'text', value: 'read it' });
		expect(arrow!.properties).toEqual({ className: ['ext'], 'aria-hidden': 'true' });
		expect(note!.properties).toEqual({ className: ['sr-only'] });
		expect(note!.children![0].value).toBe(' (opens in a new tab)');
	});

	it('leaves an internal link completely untouched', () => {
		const tree = link('/projects/vision-calibration-tools/');
		const before = JSON.stringify(tree);
		rehypeExternalLinks()(tree);

		expect(JSON.stringify(tree)).toBe(before);
	});

	// Links in the body are rarely at the top level: they sit inside a
	// paragraph, a list item, or a table cell.
	it('reaches links nested anywhere in the tree', () => {
		const tree: HastNode = {
			type: 'root',
			children: [
				{
					type: 'element',
					tagName: 'ul',
					children: [
						{
							type: 'element',
							tagName: 'li',
							children: [link('https://example.com/one').children![0]],
						},
					],
				},
			],
		};
		rehypeExternalLinks()(tree);

		const a = tree.children![0].children![0].children![0];
		expect(a.properties!.target).toBe('_blank');
	});

	it('does nothing to a document with no links', () => {
		const tree: HastNode = {
			type: 'root',
			children: [
				{ type: 'element', tagName: 'p', children: [{ type: 'text', value: 'no links here' }] },
			],
		};
		expect(() => rehypeExternalLinks()(tree)).not.toThrow();
	});
});
