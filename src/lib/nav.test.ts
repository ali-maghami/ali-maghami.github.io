import { describe, expect, it } from 'vitest';
import {
	buildNavItems,
	getNavHref,
	isPublished,
	sectionForPath,
	isNavActive,
	showsFooterBadges,
} from './nav';

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
		const labels = buildNavItems({ projects: 9, blog: 0, papers: 0 }).map((i) => i.label);
		expect(labels).toEqual(['Home', 'Projects', 'About']);
	});

	it('keeps a stable order as sections fill up', () => {
		const labels = buildNavItems({ projects: 9, blog: 2, papers: 3 }).map((i) => i.label);
		expect(labels).toEqual(['Home', 'Posts', 'Projects', 'Papers', 'About']);
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

describe('sectionForPath', () => {
	it('treats the site root as home', () => {
		expect(sectionForPath('/')).toBe('home');
		expect(sectionForPath('')).toBe('home');
	});

	it('uses the first path segment, so a section covers its entries', () => {
		expect(sectionForPath('/projects/')).toBe('projects');
		expect(sectionForPath('/projects/railcar-vision-inspection/')).toBe('projects');
		expect(sectionForPath('/certificates/')).toBe('certificates');
	});

	it('ignores a query string or fragment', () => {
		expect(sectionForPath('/papers/?sort=year')).toBe('papers');
		expect(sectionForPath('/about/#education')).toBe('about');
	});

	it('tolerates a missing trailing slash', () => {
		expect(sectionForPath('/about')).toBe('about');
	});
});

describe('showsFooterBadges', () => {
	const pages = ['home', 'about', 'certificates'];

	it('shows the strip only on the configured sections', () => {
		expect(showsFooterBadges('/', pages)).toBe(true);
		expect(showsFooterBadges('/about/', pages)).toBe(true);
		expect(showsFooterBadges('/certificates/', pages)).toBe(true);
	});

	it('hides it everywhere else, including inside a listed section is not implied', () => {
		expect(showsFooterBadges('/projects/', pages)).toBe(false);
		expect(showsFooterBadges('/blog/a-post/', pages)).toBe(false);
		expect(showsFooterBadges('/papers/', pages)).toBe(false);
	});

	it('shows nothing when no sections are configured', () => {
		expect(showsFooterBadges('/', [])).toBe(false);
	});
});

describe('isNavActive', () => {
	it('lights a section on its own listing page', () => {
		expect(isNavActive('/projects/', '/projects/')).toBe(true);
		expect(isNavActive('/blog/', '/blog/')).toBe(true);
		expect(isNavActive('/about/', '/about/')).toBe(true);
	});

	it('keeps the listing lit while one of its entries is open', () => {
		// The reported fault: opening a post or a project left nothing marked.
		expect(isNavActive('/blog/fourteen-agents-one-trace/', '/blog/')).toBe(true);
		expect(isNavActive('/projects/railcar-vision-inspection/', '/projects/')).toBe(true);
	});

	it('lights Home only at the site root', () => {
		expect(isNavActive('/', '/')).toBe(true);
		expect(isNavActive('/projects/', '/')).toBe(false);
		expect(isNavActive('/blog/a-post/', '/')).toBe(false);
	});

	it('does not light a section from a different one', () => {
		expect(isNavActive('/projects/', '/blog/')).toBe(false);
		expect(isNavActive('/papers/', '/projects/')).toBe(false);
	});

	it('tolerates a missing trailing slash on either side', () => {
		expect(isNavActive('/about', '/about/')).toBe(true);
		expect(isNavActive('/about/', '/about')).toBe(true);
	});
});
