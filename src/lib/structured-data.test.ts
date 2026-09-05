import { describe, expect, it } from 'vitest';

import type { PaperRecord, PostRecord, SiteSettings } from './portfolio-data';
import { blogPostingSchema, personSchema, publicationSchema, serializeJsonLd, websiteSchema } from './structured-data';

const site = new URL('https://maghami.dev');

const settings: SiteSettings = {
	siteTitle: 'Ali Maghami',
	siteDescription: 'Computer vision, AI, robotics',
	social: { github: 'https://github.com/ali-maghami', linkedin: 'https://www.linkedin.com/in/x/', scholar: undefined, email: 'a@b.c' },
	footerBadges: { limit: 0, pages: [] },
};

describe('serializeJsonLd', () => {
	it('escapes the one character that could end the script element', () => {
		expect(serializeJsonLd({ headline: 'a </script><b>' })).toBe('{"headline":"a \\u003c/script>\\u003cb>"}');
	});
});

describe('personSchema', () => {
	it('names the owner with their profiles, and never their email', () => {
		const person = personSchema(settings, site, '/portrait/me.png');
		expect(person).toMatchObject({
			'@type': 'Person',
			'@id': 'https://maghami.dev/#person',
			name: 'Ali Maghami',
			url: 'https://maghami.dev/',
			image: 'https://maghami.dev/portrait/me.png',
			sameAs: ['https://github.com/ali-maghami', 'https://www.linkedin.com/in/x/'],
		});
		expect(JSON.stringify(person)).not.toContain('a@b.c');
	});

	it('omits what is not set rather than writing empty fields', () => {
		const person = personSchema({ ...settings, social: {} }, site);
		expect(person).not.toHaveProperty('image');
		expect(person).not.toHaveProperty('sameAs');
	});
});

describe('websiteSchema', () => {
	it('points the site at its publisher', () => {
		expect(websiteSchema(settings, site)).toMatchObject({
			'@type': 'WebSite',
			url: 'https://maghami.dev/',
			publisher: { '@id': 'https://maghami.dev/#person' },
		});
	});
});

describe('blogPostingSchema', () => {
	const post: PostRecord = {
		id: 'a-post',
		title: 'A post',
		description: 'About it',
		pubDate: new Date('2026-09-04T00:00:00Z'),
		updatedDate: undefined,
		tags: ['AI', 'Robotics'],
		kind: 'Post',
		heroImage: '/hero/a.webp',
		heroVideoPlayback: 'loop',
		bodyMarkdown: '',
		updatedAt: new Date(),
	};

	it('describes the post as an article by the owner', () => {
		expect(blogPostingSchema(post, settings, site, post.heroImage)).toMatchObject({
			'@type': 'BlogPosting',
			'@id': 'https://maghami.dev/blog/a-post/',
			headline: 'A post',
			datePublished: '2026-09-04T00:00:00.000Z',
			dateModified: '2026-09-04T00:00:00.000Z',
			image: 'https://maghami.dev/hero/a.webp',
			keywords: 'AI, Robotics',
			author: { '@type': 'Person', name: 'Ali Maghami' },
		});
	});

	it('uses the update date as the modification date when there is one', () => {
		const updated = { ...post, updatedDate: new Date('2026-09-06T00:00:00Z') };
		expect(blogPostingSchema(updated, settings, site).dateModified).toBe('2026-09-06T00:00:00.000Z');
	});
});

describe('publicationSchema', () => {
	const paper: PaperRecord = {
		id: 'p',
		title: 'Vision-based target localization',
		authors: 'A Maghami',
		venue: 'Robotica',
		year: 2024,
		kind: 'journal',
		doi: '10.1017/S0263574724001255',
		pdf: '/pdf/robotica.pdf',
		tags: ['Robotics'],
		featured: false,
		bodyMarkdown: '',
	};

	it('describes a paper with its venue, DOI and PDF', () => {
		expect(publicationSchema(paper, ['A Maghami'], site)).toMatchObject({
			'@type': 'ScholarlyArticle',
			headline: 'Vision-based target localization',
			author: [{ '@type': 'Person', name: 'A Maghami' }],
			datePublished: '2024',
			isPartOf: { '@type': 'Periodical', name: 'Robotica' },
			identifier: '10.1017/S0263574724001255',
			sameAs: 'https://doi.org/10.1017/S0263574724001255',
			url: 'https://doi.org/10.1017/S0263574724001255',
			encoding: { contentUrl: 'https://maghami.dev/pdf/robotica.pdf' },
		});
	});

	it('types a patent as a creative work that says it is a patent', () => {
		const patent = publicationSchema({ ...paper, kind: 'patent', doi: undefined, url: 'https://patents.google.com/x' }, ['A'], site);
		expect(patent).toMatchObject({ '@type': 'CreativeWork', additionalType: 'Patent', url: 'https://patents.google.com/x' });
		expect(patent).not.toHaveProperty('identifier');
	});
});
