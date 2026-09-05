import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/*
 * The queries, against a real PostgreSQL.
 *
 * Runs when PORTFOLIO_TEST_DATABASE_URL names a database that has had
 * scripts/test-database.sql applied — CI starts one as a service; locally,
 * `docker run -e POSTGRES_PASSWORD=portfolio -p 5432:5432 postgres:17-alpine`
 * and the psql line at the top of that script are enough. Without the
 * variable the whole file is skipped, so the rest of the suite needs nothing.
 *
 * The test owns every row: it empties the tables first and inserts what each
 * case needs, so it never depends on content that happens to be there.
 */
const url = process.env.PORTFOLIO_TEST_DATABASE_URL;

describe.skipIf(!url)('portfolio-data against PostgreSQL', () => {
	let data: typeof import('./portfolio-data');
	let sql: postgres.Sql;

	beforeAll(async () => {
		// The module reads its connection string once, so it is set before the
		// first import and nothing else in the process sees it.
		process.env.PORTFOLIO_DATABASE_URL = url;
		data = await import('./portfolio-data');
		sql = postgres(url!, { max: 1 });

		await sql`
			TRUNCATE portfolio_project, portfolio_post, portfolio_paper, portfolio_certificate,
				portfolio_page, portfolio_setting, portfolio_media
		`;

		await sql`
			INSERT INTO portfolio_setting (key, value) VALUES ('site', ${sql.json({
				siteTitle: 'Test Site',
				siteDescription: 'A description',
				social: { github: 'https://github.com/test' },
				footerBadges: { limit: 2, pages: ['home'] },
			})})
		`;

		await sql`
			INSERT INTO portfolio_page (key, data, body_markdown) VALUES
				('home', ${sql.json({ heading: 'Heading', focusAreas: ['A', 'B'], portrait: '/portrait/p.png' })}, 'Lede'),
				('about', ${sql.json({ title: 'About me', standfirst: 'Short' })}, 'Body')
		`;

		await sql`
			INSERT INTO portfolio_post (slug, title, description, pub_date, tags, hero_image, hero_video, body_markdown, status) VALUES
				('older', 'Older', 'd', '2026-01-01', '{"AI"}', '/hero/a.webp', NULL, 'a', 'published'),
				('newer', 'Newer', 'd', '2026-02-01', '{}', NULL, '/hero/b.mp4', 'b', 'published'),
				('draft', 'Draft', 'd', '2026-03-01', '{}', NULL, NULL, 'c', 'draft'),
				('gone', 'Archived', 'd', '2026-04-01', '{}', NULL, NULL, 'd', 'archived')
		`;

		await sql`
			INSERT INTO portfolio_project (slug, title, description, stage, category, contributors, purpose, pub_date, tags, card_color, status) VALUES
				('active-one', 'Active', 'd', 'piloted', 'active', '{"Someone"}', 'Purpose', '2025-06-01', '{"CV"}', '#c66fb0', 'published'),
				('archived-one', 'Archived', 'd', 'research-prototype', 'archived', '{}', NULL, '2024-06-01', '{}', '#f0b34a', 'published'),
				('hidden', 'Hidden', 'd', 'napkin-sketch', 'active', '{}', NULL, '2026-01-01', '{}', '#ffffff', 'draft')
		`;

		await sql`
			INSERT INTO portfolio_paper (slug, title, authors, venue, year, kind, citations, tags, status) VALUES
				('p1', 'Paper', 'A Maghami', 'Robotica', 2024, 'journal', NULL, '{"Robotics"}', 'published'),
				('p2', 'Unpublished', 'A Maghami', 'Nowhere', 2025, 'preprint', 0, '{}', 'draft')
		`;

		await sql`
			INSERT INTO portfolio_certificate (slug, name, issuer, issue_date, badge, featured, status) VALUES
				('c1', 'Cert', 'Issuer', '2025-01-01', '/badges/c.png', true, 'published')
		`;

		await sql`
			INSERT INTO portfolio_media (path, original_name, mime_type, byte_size, checksum_sha256, width, height) VALUES
				('/uploads/123e4567-e89b-12d3-a456-426614174000.webp', 'rig.webp', 'image/webp', 12345, 'x', 1200, 800),
				('/uploads/00000000-1111-2222-3333-444444444444.mp4', 'clip.mp4', 'video/mp4', 99, 'y', NULL, NULL)
		`;
	});

	afterAll(async () => {
		await data?.closeDatabase();
		await sql?.end();
	});

	it('reaches the database', async () => {
		await expect(data.pingDatabase()).resolves.toBeUndefined();
	});

	it('lists only published posts, newest first, with media columns mapped', async () => {
		const posts = await data.listPosts();
		expect(posts.map((post) => post.id)).toEqual(['newer', 'older']);
		expect(posts[0].heroVideo).toBe('/hero/b.mp4');
		expect(posts[0].heroImage).toBeUndefined();
		expect(posts[1].tags).toEqual(['AI']);
		expect(posts[1].pubDate.toISOString()).toBe('2026-01-01T00:00:00.000Z');
	});

	it('hides a draft from the public lookup but shows it to a verified preview', async () => {
		await expect(data.getPostBySlug('draft')).resolves.toBeUndefined();
		await expect(data.getPostDraft('draft')).resolves.toMatchObject({ id: 'draft', title: 'Draft' });
		await expect(data.getPostBySlug('older')).resolves.toMatchObject({ id: 'older' });
		await expect(data.getPostBySlug('missing')).resolves.toBeUndefined();
	});

	it('lists published projects with their arrays and optionals intact', async () => {
		const projects = await data.listProjects();
		expect(projects.map((project) => project.id)).toEqual(['active-one', 'archived-one']);
		expect(projects[0]).toMatchObject({
			stage: 'piloted',
			category: 'active',
			contributors: ['Someone'],
			purpose: 'Purpose',
			tags: ['CV'],
			cardColorAlt: '',
		});
		expect(projects[1].purpose).toBeUndefined();
		await expect(data.getProjectBySlug('hidden')).resolves.toBeUndefined();
		await expect(data.getProjectDraft('hidden')).resolves.toMatchObject({ id: 'hidden' });
	});

	it('counts what the navigation needs in one query, matching the lists', async () => {
		const counts = await data.countPublished();
		expect(counts).toEqual({ projects: 2, posts: 2, papers: 1 });
		expect(counts.projects).toBe((await data.listProjects()).length);
		expect(counts.posts).toBe((await data.listPosts()).length);
		expect(counts.papers).toBe((await data.listPapers()).length);
	});

	it('maps papers and certificates', async () => {
		const [paper] = await data.listPapers();
		expect(paper).toMatchObject({ id: 'p1', kind: 'journal', year: 2024, tags: ['Robotics'] });
		expect(paper.citations).toBeUndefined();

		const [cert] = await data.listCertificates();
		expect(cert).toMatchObject({ id: 'c1', badge: '/badges/c.png', featured: true });
		expect(cert.issueDate.toISOString()).toBe('2025-01-01T00:00:00.000Z');
	});

	it('reads the pages and the settings, with defaults for what is unset', async () => {
		const home = await data.getHomePage();
		expect(home).toMatchObject({ heading: 'Heading', focusAreas: ['A', 'B'], portrait: '/portrait/p.png' });
		expect(home.portraitSize).toBe(250);
		expect(home.bodyMarkdown).toBe('Lede');

		const about = await data.getAboutPage();
		expect(about).toMatchObject({ title: 'About me', eyebrow: 'About', standfirst: 'Short', skills: [] });

		const settings = await data.getSiteSettings();
		expect(settings.siteTitle).toBe('Test Site');
		expect(settings.social).toEqual({
			github: 'https://github.com/test',
			linkedin: undefined,
			scholar: undefined,
			email: undefined,
		});
		expect(settings.footerBadges).toEqual({ limit: 2, pages: ['home'] });
	});

	it('serves upload metadata and only the sizes that were recorded', async () => {
		await expect(
			data.getUploadedMedia('/uploads/123e4567-e89b-12d3-a456-426614174000.webp'),
		).resolves.toEqual({
			path: '/uploads/123e4567-e89b-12d3-a456-426614174000.webp',
			mimeType: 'image/webp',
			byteSize: 12345,
		});
		await expect(data.getUploadedMedia('/uploads/nope.webp')).resolves.toBeUndefined();

		const sizes = await data.getUploadedDimensions([
			'/uploads/123e4567-e89b-12d3-a456-426614174000.webp',
			'/uploads/00000000-1111-2222-3333-444444444444.mp4',
			'/uploads/missing.png',
		]);
		expect([...sizes.entries()]).toEqual([
			['/uploads/123e4567-e89b-12d3-a456-426614174000.webp', { width: 1200, height: 800 }],
		]);
		await expect(data.getUploadedDimensions([])).resolves.toEqual(new Map());
	});
});
