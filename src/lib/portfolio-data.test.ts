import { describe, expect, it } from 'vitest';

import {
	mapAboutPage,
	mapCertificate,
	mapHomePage,
	mapPaper,
	mapPost,
	mapProject,
	mapSiteSettings,
} from './portfolio-data';

/*
 * The row-to-record mapping, without a database. The queries themselves are
 * covered in portfolio-data.integration.test.ts against PostgreSQL; this is
 * the coercion layer between what a driver hands back and what the pages
 * trust, which is where a null, a string date or a missing JSON key becomes a
 * blank card or a crashed render.
 */
describe('mapProject', () => {
	const row = {
		slug: 'coilsense',
		title: 'CoilSense',
		description: 'Teaching steel equipment to see',
		stage: 'piloted',
		category: 'active',
		contributors: ['Sina Alborzi'],
		purpose: '  Real-time perception for a coilbox  ',
		pub_date: '2025-06-01',
		tags: ['Computer Vision'],
		repo_url: null,
		live_url: '',
		hero_image: '/media/herocoilbox.webp',
		card_color: '#c66fb0',
		card_color_alt: null,
		body_markdown: null,
		updated_at: '2026-09-04T10:00:00.000Z',
	};

	it('maps the columns the pages read', () => {
		const project = mapProject(row);
		expect(project.id).toBe('coilsense');
		expect(project.stage).toBe('piloted');
		expect(project.contributors).toEqual(['Sina Alborzi']);
		expect(project.tags).toEqual(['Computer Vision']);
		expect(project.heroImage).toBe('/media/herocoilbox.webp');
		expect(project.cardColor).toBe('#c66fb0');
	});

	it('reads a date column as midnight UTC, so the day never shifts with the server zone', () => {
		expect(mapProject(row).pubDate.toISOString()).toBe('2025-06-01T00:00:00.000Z');
		expect(mapProject(row).updatedAt.toISOString()).toBe('2026-09-04T10:00:00.000Z');
	});

	it('turns null and blank optionals into undefined, and trims the rest', () => {
		const project = mapProject(row);
		expect(project.repoUrl).toBeUndefined();
		expect(project.liveUrl).toBeUndefined();
		expect(project.purpose).toBe('Real-time perception for a coilbox');
	});

	it('never yields undefined for the strings a template prints', () => {
		const project = mapProject(row);
		expect(project.cardColorAlt).toBe('');
		expect(project.bodyMarkdown).toBe('');
	});

	it('treats a missing array as empty rather than crashing the card', () => {
		const project = mapProject({ ...row, contributors: null, tags: undefined });
		expect(project.contributors).toEqual([]);
		expect(project.tags).toEqual([]);
	});
});

describe('mapPost', () => {
	const row = {
		slug: 'a-post',
		title: 'A post',
		description: 'About something',
		pub_date: '2026-09-04',
		updated_date: null,
		tags: ['AI'],
		kind: 'Post',
		hero_image: null,
		hero_video: '/hero/clip.mp4',
		hero_video_playback: 'loop',
		body_markdown: '# Hi',
		updated_at: new Date('2026-09-05T00:00:00Z'),
	};

	it('maps a post with a video and no image', () => {
		const post = mapPost(row);
		expect(post.heroImage).toBeUndefined();
		expect(post.heroVideo).toBe('/hero/clip.mp4');
		expect(post.heroVideoPlayback).toBe('loop');
		expect(post.updatedDate).toBeUndefined();
		expect(post.bodyMarkdown).toBe('# Hi');
	});

	it('keeps an update date when there is one', () => {
		expect(mapPost({ ...row, updated_date: '2026-09-06' }).updatedDate?.toISOString()).toBe(
			'2026-09-06T00:00:00.000Z',
		);
	});

	it('accepts a Date from the driver as well as a string', () => {
		expect(mapPost({ ...row, pub_date: new Date('2026-09-04T00:00:00Z') }).pubDate.toISOString()).toBe(
			'2026-09-04T00:00:00.000Z',
		);
	});
});

describe('mapPaper', () => {
	const row = {
		slug: 'robotica-2024',
		title: 'Vision-based target localization',
		authors: 'A Maghami',
		venue: 'Robotica',
		year: 2024,
		kind: 'journal',
		abstract: null,
		doi: '10.1017/S0263574724001255',
		url: null,
		pdf: null,
		citations: null,
		tags: ['Robotics'],
		featured: true,
		body_markdown: '',
	};

	it('distinguishes no citation count from a count of zero', () => {
		expect(mapPaper(row).citations).toBeUndefined();
		expect(mapPaper({ ...row, citations: 0 }).citations).toBe(0);
		expect(mapPaper({ ...row, citations: 12 }).citations).toBe(12);
	});

	it('reads featured strictly as a boolean true', () => {
		expect(mapPaper(row).featured).toBe(true);
		expect(mapPaper({ ...row, featured: 'true' }).featured).toBe(false);
		expect(mapPaper({ ...row, featured: null }).featured).toBe(false);
	});
});

describe('mapCertificate', () => {
	it('maps dates and optionals', () => {
		const cert = mapCertificate({
			slug: 'aws-saa',
			name: 'AWS Certified Solutions Architect – Associate',
			issuer: 'AWS',
			issue_date: '2025-01-01',
			expiry_date: '2028-01-01',
			credential_id: ' ABC ',
			url: null,
			badge: '/badges/aws.png',
			featured: true,
			body_markdown: null,
		});
		expect(cert.issueDate.toISOString()).toBe('2025-01-01T00:00:00.000Z');
		expect(cert.expiryDate?.toISOString()).toBe('2028-01-01T00:00:00.000Z');
		expect(cert.credentialId).toBe('ABC');
		expect(cert.url).toBeUndefined();
		expect(cert.bodyMarkdown).toBe('');
	});
});

describe('mapHomePage', () => {
	it('fills every presentation option with its default when the CMS has not set it', () => {
		const home = mapHomePage({ data: {}, body_markdown: null });
		expect(home).toMatchObject({
			heading: '',
			focusAreas: [],
			portrait: undefined,
			portraitSize: 250,
			portraitBorderWidth: 3,
			portraitOpacity: 80,
			portraitFilter: 'grayscale',
			portraitBackground: '#FFFFFF',
			portraitBackgroundOpacity: 0,
			projectCount: 4,
			postCount: 5,
			bodyMarkdown: '',
		});
	});

	it('takes what is set and ignores a value of the wrong type', () => {
		const home = mapHomePage({
			data: { heading: 'Building AI.', focusAreas: ['Robotics', 7], portraitSize: '300', postCount: 2 },
			body_markdown: 'Hello',
		});
		expect(home.heading).toBe('Building AI.');
		expect(home.focusAreas).toEqual(['Robotics', '7']);
		expect(home.portraitSize).toBe(250);
		expect(home.postCount).toBe(2);
		expect(home.bodyMarkdown).toBe('Hello');
	});

	it('tolerates data that is not an object at all', () => {
		expect(mapHomePage({ data: 'nonsense', body_markdown: '' }).heading).toBe('');
		expect(mapHomePage({ data: ['a'], body_markdown: '' }).focusAreas).toEqual([]);
	});
});

describe('mapAboutPage', () => {
	it('defaults the eyebrow and keeps structured lists', () => {
		const about = mapAboutPage({
			data: { title: 'Ali', skills: [{ area: 'CV', detail: '3D' }] },
			body_markdown: 'Body',
		});
		expect(about.eyebrow).toBe('About');
		expect(about.title).toBe('Ali');
		expect(about.skills).toEqual([{ area: 'CV', detail: '3D' }]);
		expect(about.education).toEqual([]);
	});
});

describe('mapSiteSettings', () => {
	it('has a usable site identity when the settings row is missing entirely', () => {
		const settings = mapSiteSettings(undefined);
		expect(settings.siteTitle).toBe('Ali Maghami');
		expect(settings.siteDescription.length).toBeGreaterThan(0);
		expect(settings.social).toEqual({
			github: undefined,
			linkedin: undefined,
			scholar: undefined,
			email: undefined,
		});
		expect(settings.footerBadges).toEqual({ limit: 0, pages: [] });
	});

	it('reads the nested social and footer settings', () => {
		const settings = mapSiteSettings({
			siteTitle: 'Someone Else',
			social: { github: 'https://github.com/x', email: '' },
			footerBadges: { limit: 3, pages: ['home', 'about'] },
		});
		expect(settings.siteTitle).toBe('Someone Else');
		expect(settings.social.github).toBe('https://github.com/x');
		expect(settings.social.email).toBeUndefined();
		expect(settings.footerBadges).toEqual({ limit: 3, pages: ['home', 'about'] });
	});
});
