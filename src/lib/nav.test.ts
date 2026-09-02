import { describe, expect, it } from 'vitest';
import { buildNavItems, getNavHref, isPublished } from './nav';

describe('getNavHref', () => {
	it('returns root paths unchanged', () => {
		expect(getNavHref('/')).toBe('/');
	});

	it('returns nested paths unchanged', () => {
		expect(getNavHref('/projects/')).toBe('/projects/');
	});
});

describe('buildNavItems', () => {
	it('always shows Home and About', () => {
		expect(buildNavItems({}).map((i) => i.label)).toEqual(['Home', 'About']);
	});

	it('hides sections with no entries so the nav never links to an empty page', () => {
		const labels = buildNavItems({ projects: 9, blog: 0, papers: 0, posts: 0 }).map((i) => i.label);
		expect(labels).toEqual(['Home', 'Projects', 'About']);
	});

	it('keeps a stable order as sections fill up', () => {
		const labels = buildNavItems({ projects: 9, blog: 2, papers: 3, posts: 1 }).map((i) => i.label);
		expect(labels).toEqual(['Home', 'Projects', 'Blog', 'Papers', 'Posts', 'About']);
	});
});

describe('isPublished', () => {
	it('treats a missing draft flag as published', () => {
		expect(isPublished({ data: {} })).toBe(true);
	});

	it('excludes drafts', () => {
		expect(isPublished({ data: { draft: true } })).toBe(false);
		expect(isPublished({ data: { draft: false } })).toBe(true);
	});
});
