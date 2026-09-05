import { describe, expect, it } from 'vitest';

import { renderSitemap } from './sitemap';

const site = new URL('https://maghami.dev');

describe('renderSitemap', () => {
	it('writes absolute URLs against the deployment origin', () => {
		const xml = renderSitemap(site, [{ path: '/' }, { path: '/projects/coilsense/' }]);

		expect(xml).toContain('<loc>https://maghami.dev/</loc>');
		expect(xml).toContain('<loc>https://maghami.dev/projects/coilsense/</loc>');
	});

	it('supports a preview origin without hard-coding production', () => {
		const xml = renderSitemap(new URL('https://preview.example/base/'), [{ path: 'blog/' }]);

		expect(xml).toContain('<loc>https://preview.example/base/blog/</loc>');
	});

	it('carries lastmod as a plain date when one is known', () => {
		const xml = renderSitemap(site, [
			{ path: '/blog/a-post/', lastmod: new Date('2026-09-05T11:22:33.000Z') },
		]);

		expect(xml).toContain('<lastmod>2026-09-05</lastmod>');
	});

	it('omits lastmod rather than emitting an empty or invalid one', () => {
		const xml = renderSitemap(site, [
			{ path: '/papers/' },
			{ path: '/certificates/', lastmod: new Date('not a date') },
		]);

		expect(xml).not.toContain('<lastmod>');
	});

	it('escapes characters a slug could carry into the XML', () => {
		const xml = renderSitemap(site, [{ path: '/projects/a&b/' }]);

		expect(xml).toContain('a&amp;b');
		expect(xml).not.toMatch(/a&b/);
	});

	it('renders a well-formed document even with nothing to list', () => {
		const xml = renderSitemap(site, []);

		expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
		expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
		expect(xml.trimEnd().endsWith('</urlset>')).toBe(true);
	});
});
