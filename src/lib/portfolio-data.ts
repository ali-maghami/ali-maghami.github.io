import postgres from 'postgres';

import { cached } from './request-cache';
import { READ_COLUMNS, missingColumns } from './schema-contract';

type OptionalString = string | null | undefined;

export interface ProjectRecord {
	id: string;
	title: string;
	description: string;
	stage: 'napkin-sketch' | 'research-prototype' | 'piloted' | 'completed' | 'product';
	category: 'active' | 'archived';
	contributors: string[];
	purpose?: string;
	pubDate: Date;
	tags: string[];
	repoUrl?: string;
	liveUrl?: string;
	heroImage?: string;
	cardColor: string;
	cardColorAlt: string;
	bodyMarkdown: string;
	/** When the entry last changed in the CMS. Drives <lastmod>. */
	updatedAt: Date;
}

export interface PostRecord {
	id: string;
	title: string;
	description: string;
	pubDate: Date;
	updatedDate?: Date;
	tags: string[];
	kind: string;
	heroImage?: string;
	heroVideo?: string;
	heroVideoPlayback: 'loop' | 'once' | 'viewer';
	bodyMarkdown: string;
	/** When the entry last changed in the CMS. Drives <lastmod>. */
	updatedAt: Date;
}

export interface PaperRecord {
	id: string;
	title: string;
	authors: string;
	venue: string;
	year: number;
	kind: 'journal' | 'conference' | 'patent' | 'thesis' | 'preprint';
	abstract?: string;
	doi?: string;
	url?: string;
	pdf?: string;
	citations?: number;
	tags: string[];
	featured: boolean;
	bodyMarkdown: string;
}

export interface CertificateRecord {
	id: string;
	name: string;
	issuer: string;
	issueDate: Date;
	expiryDate?: Date;
	credentialId?: string;
	url?: string;
	badge?: string;
	featured: boolean;
	bodyMarkdown: string;
}

export interface HomePageRecord {
	heading: string;
	focusAreas: string[];
	portrait?: string;
	portraitSize: number;
	portraitBorderWidth: number;
	portraitOpacity: number;
	portraitFilter: 'grayscale' | 'soft-grayscale' | 'sepia' | 'contrast' | 'none';
	portraitBackground: string;
	portraitBackgroundOpacity: number;
	projectCount: number;
	postCount: number;
	/** One line on what the owner is doing at the moment, if the CMS has it. */
	now?: string;
	/** The year the career started, for "N+ years"; unset until the CMS has it. */
	since?: number;
	/**
	 * The figures under the lede as typed in the CMS. Empty means the site
	 * counts them from the published content instead.
	 */
	highlights: Array<{ value: string; label: string }>;
	bodyMarkdown: string;
}

export interface AboutPageRecord {
	title: string;
	eyebrow: string;
	standfirst: string;
	skills: Array<{ area: string; detail: string }>;
	education: Array<{ label: string; detail: string }>;
	bodyMarkdown: string;
}

export interface SiteSettings {
	siteTitle: string;
	siteDescription: string;
	social: {
		github?: string;
		linkedin?: string;
		scholar?: string;
		email?: string;
	};
	footerBadges: {
		limit: number;
		pages: string[];
	};
}

export interface UploadedMediaRecord {
	path: string;
	mimeType: string;
	byteSize: number;
}

let database: ReturnType<typeof postgres> | undefined;

/**
 * The database is the only source of content.
 *
 * This used to return undefined when the variable was missing, and every
 * caller fell back to markdown committed before the CMS cutover — so a deploy
 * that lost .env.reader served months-old content with a 200 and no error
 * anywhere. Failing here instead makes that a visible outage rather than a
 * quiet lie.
 */
function getDatabase() {
	const url = process.env.PORTFOLIO_DATABASE_URL;
	if (!url) {
		throw new Error(
			'PORTFOLIO_DATABASE_URL is not set. The site reads its content from the ' +
				'portfolio database through the read-only role; there is no local fallback. ' +
				'In production it is in /home/ali/apps/portfolio/.env.reader.',
		);
	}
	database ??= postgres(url, { max: 5, prepare: false });
	return database;
}

/** A cheap round trip, so /healthz can tell reachable from merely configured. */
export async function pingDatabase(): Promise<void> {
	const sql = getDatabase();
	await sql`SELECT 1`;
}

/**
 * The columns the site reads but the database does not show it, as
 * "table.column" — empty when the schema still matches. Read from
 * information_schema rather than the CMS's definition, because that reflects
 * both what exists and what the reader role was granted, which are the two
 * ways a column stops arriving. See lib/schema-contract.ts.
 */
export async function verifySchema(): Promise<string[]> {
	const sql = getDatabase();
	const tables = Object.keys(READ_COLUMNS);
	const rows = await sql`
		SELECT table_name, column_name
		FROM information_schema.columns
		WHERE table_schema = 'public' AND table_name = ANY(${tables})
	`;
	return missingColumns(
		READ_COLUMNS,
		rows.map((row) => ({ table: String(row.table_name), column: String(row.column_name) })),
	);
}

/** Closes the pool. For tests, which would otherwise leave a worker waiting on it. */
export async function closeDatabase(): Promise<void> {
	const open = database;
	database = undefined;
	await open?.end();
}

function optional(value: OptionalString): string | undefined {
	return value?.trim() || undefined;
}

function asDate(value: string | Date): Date {
	if (value instanceof Date) return value;
	return new Date(`${value}T00:00:00.000Z`);
}

function stringArray(value: unknown): string[] {
	return Array.isArray(value) ? value.map(String) : [];
}

function object(value: unknown): Record<string, unknown> {
	return value && typeof value === 'object' && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function number(value: unknown, fallback: number): number {
	return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/*
 * The mappers are exported for their tests: they are where a database row is
 * coerced into the shape the pages trust, and that coercion is the part worth
 * pinning down without a database in the loop.
 */
export function mapProject(row: Record<string, unknown>): ProjectRecord {
	return {
		id: String(row.slug),
		title: String(row.title),
		description: String(row.description),
		stage: row.stage as ProjectRecord['stage'],
		category: row.category as ProjectRecord['category'],
		contributors: stringArray(row.contributors),
		purpose: optional(row.purpose as OptionalString),
		pubDate: asDate(row.pub_date as string | Date),
		tags: stringArray(row.tags),
		repoUrl: optional(row.repo_url as OptionalString),
		liveUrl: optional(row.live_url as OptionalString),
		heroImage: optional(row.hero_image as OptionalString),
		cardColor: String(row.card_color),
		cardColorAlt: String(row.card_color_alt ?? ''),
		bodyMarkdown: String(row.body_markdown ?? ''),
		updatedAt: new Date(row.updated_at as string | Date),
	};
}

export function mapPost(row: Record<string, unknown>): PostRecord {
	return {
		id: String(row.slug),
		title: String(row.title),
		description: String(row.description),
		pubDate: asDate(row.pub_date as string | Date),
		updatedDate: row.updated_date ? asDate(row.updated_date as string | Date) : undefined,
		tags: stringArray(row.tags),
		kind: String(row.kind),
		heroImage: optional(row.hero_image as OptionalString),
		heroVideo: optional(row.hero_video as OptionalString),
		heroVideoPlayback: row.hero_video_playback as PostRecord['heroVideoPlayback'],
		bodyMarkdown: String(row.body_markdown ?? ''),
		updatedAt: new Date(row.updated_at as string | Date),
	};
}

export function mapPaper(row: Record<string, unknown>): PaperRecord {
	return {
		id: String(row.slug),
		title: String(row.title),
		authors: String(row.authors),
		venue: String(row.venue),
		year: Number(row.year),
		kind: row.kind as PaperRecord['kind'],
		abstract: optional(row.abstract as OptionalString),
		doi: optional(row.doi as OptionalString),
		url: optional(row.url as OptionalString),
		pdf: optional(row.pdf as OptionalString),
		citations: row.citations === null || row.citations === undefined ? undefined : Number(row.citations),
		tags: stringArray(row.tags),
		featured: row.featured === true,
		bodyMarkdown: String(row.body_markdown ?? ''),
	};
}

export function mapCertificate(row: Record<string, unknown>): CertificateRecord {
	return {
		id: String(row.slug),
		name: String(row.name),
		issuer: String(row.issuer),
		issueDate: asDate(row.issue_date as string | Date),
		expiryDate: row.expiry_date ? asDate(row.expiry_date as string | Date) : undefined,
		credentialId: optional(row.credential_id as OptionalString),
		url: optional(row.url as OptionalString),
		badge: optional(row.badge as OptionalString),
		featured: row.featured === true,
		bodyMarkdown: String(row.body_markdown ?? ''),
	};
}

/*
 * Every public read below is wrapped in the request cache: within one page
 * render, the Header, the Footer and the page itself share a single execution
 * of each query, and nothing outlives the request. See lib/request-cache.ts.
 */

export interface PublishedCounts {
	projects: number;
	posts: number;
	papers: number;
}

/**
 * How many entries each section has, in one round trip.
 *
 * The navigation hides an empty section, which used to be decided by loading
 * every row of every section and counting the arrays. Three integers are all
 * that question needs.
 */
export function countPublished(): Promise<PublishedCounts> {
	return cached('counts', async () => {
		const sql = getDatabase();
		const [row] = await sql`
			SELECT
				(SELECT count(*) FROM portfolio_project WHERE status = 'published')::int AS projects,
				(SELECT count(*) FROM portfolio_post WHERE status = 'published')::int AS posts,
				(SELECT count(*) FROM portfolio_paper WHERE status = 'published')::int AS papers
		`;
		return {
			projects: Number(row?.projects ?? 0),
			posts: Number(row?.posts ?? 0),
			papers: Number(row?.papers ?? 0),
		};
	});
}

export function listProjects(): Promise<ProjectRecord[]> {
	return cached('projects', async () => {
		const sql = getDatabase();
		const rows = await sql`SELECT * FROM portfolio_project WHERE status = 'published' ORDER BY pub_date DESC`;
		return rows.map((row) => mapProject(row));
	});
}

export function getProjectBySlug(slug: string): Promise<ProjectRecord | undefined> {
	return cached(`project:${slug}`, async () => {
		const sql = getDatabase();
		const rows = await sql`SELECT * FROM portfolio_project WHERE slug = ${slug} AND status = 'published' LIMIT 1`;
		return rows[0] ? mapProject(rows[0]) : undefined;
	});
}

export function listPosts(): Promise<PostRecord[]> {
	return cached('posts', async () => {
		const sql = getDatabase();
		const rows = await sql`SELECT * FROM portfolio_post WHERE status = 'published' ORDER BY pub_date DESC`;
		return rows.map((row) => mapPost(row));
	});
}

/*
 * Draft previews read the same row without the published filter. Kept as
 * separate functions rather than a flag on the public ones, so a caller cannot
 * reach an unpublished entry by passing something falsy by accident — every
 * use of these is a place a signed token was checked.
 */
export async function getProjectDraft(slug: string): Promise<ProjectRecord | undefined> {
	const sql = getDatabase();
	const rows = await sql`SELECT * FROM portfolio_project WHERE slug = ${slug} LIMIT 1`;
	return rows[0] ? mapProject(rows[0]) : undefined;
}

export async function getPostDraft(slug: string): Promise<PostRecord | undefined> {
	const sql = getDatabase();
	const rows = await sql`SELECT * FROM portfolio_post WHERE slug = ${slug} LIMIT 1`;
	return rows[0] ? mapPost(rows[0]) : undefined;
}

export function getPostBySlug(slug: string): Promise<PostRecord | undefined> {
	return cached(`post:${slug}`, async () => {
		const sql = getDatabase();
		const rows = await sql`SELECT * FROM portfolio_post WHERE slug = ${slug} AND status = 'published' LIMIT 1`;
		return rows[0] ? mapPost(rows[0]) : undefined;
	});
}

export function listPapers(): Promise<PaperRecord[]> {
	return cached('papers', async () => {
		const sql = getDatabase();
		const rows = await sql`SELECT * FROM portfolio_paper WHERE status = 'published' ORDER BY year DESC`;
		return rows.map((row) => mapPaper(row));
	});
}

export function listCertificates(): Promise<CertificateRecord[]> {
	return cached('certificates', async () => {
		const sql = getDatabase();
		const rows = await sql`SELECT * FROM portfolio_certificate WHERE status = 'published' ORDER BY issue_date DESC`;
		return rows.map((row) => mapCertificate(row));
	});
}

export function getHomePage(): Promise<HomePageRecord> {
	return cached('page:home', async () => {
		const sql = getDatabase();
		const rows = await sql`SELECT data, body_markdown FROM portfolio_page WHERE key = 'home' LIMIT 1`;
		if (!rows[0]) throw new Error('The home page is missing from the portfolio database.');
		return mapHomePage(rows[0]);
	});
}

export function mapHomePage(row: Record<string, unknown>): HomePageRecord {
	const data = object(row.data);
	const bodyMarkdown = String(row.body_markdown ?? '');
	return {
		heading: String(data.heading ?? ''),
		focusAreas: stringArray(data.focusAreas),
		portrait: optional(data.portrait as OptionalString),
		portraitSize: number(data.portraitSize, 250),
		portraitBorderWidth: number(data.portraitBorderWidth, 3),
		portraitOpacity: number(data.portraitOpacity, 80),
		portraitFilter: (data.portraitFilter ?? 'grayscale') as HomePageRecord['portraitFilter'],
		portraitBackground: String(data.portraitBackground ?? '#FFFFFF'),
		portraitBackgroundOpacity: number(data.portraitBackgroundOpacity, 0),
		projectCount: number(data.projectCount, 4),
		postCount: number(data.postCount, 5),
		now: optional(data.now as OptionalString),
		since: typeof data.since === 'number' && Number.isInteger(data.since) ? data.since : undefined,
		highlights: highlightList(data.highlights),
		bodyMarkdown,
	};
}

/** Rows with both a value and a label; anything else in the list is skipped. */
function highlightList(value: unknown): Array<{ value: string; label: string }> {
	if (!Array.isArray(value)) return [];
	return value.flatMap((item) => {
		// JSON keys, not columns: named so the schema-contract test does not
		// mistake them for a row being read.
		const entry = object(item);
		const figure = optional(entry.value as OptionalString);
		const label = optional(entry.label as OptionalString);
		return figure && label ? [{ value: figure, label }] : [];
	});
}

export function getAboutPage(): Promise<AboutPageRecord> {
	return cached('page:about', async () => {
		const sql = getDatabase();
		const rows = await sql`SELECT data, body_markdown FROM portfolio_page WHERE key = 'about' LIMIT 1`;
		if (!rows[0]) throw new Error('The about page is missing from the portfolio database.');
		return mapAboutPage(rows[0]);
	});
}

export function mapAboutPage(row: Record<string, unknown>): AboutPageRecord {
	const data = object(row.data);
	const bodyMarkdown = String(row.body_markdown ?? '');
	return {
		title: String(data.title ?? ''),
		eyebrow: String(data.eyebrow ?? 'About'),
		standfirst: String(data.standfirst ?? ''),
		skills: Array.isArray(data.skills) ? (data.skills as AboutPageRecord['skills']) : [],
		education: Array.isArray(data.education) ? (data.education as AboutPageRecord['education']) : [],
		bodyMarkdown,
	};
}

export function getSiteSettings(): Promise<SiteSettings> {
	return cached('settings', async () => {
		const sql = getDatabase();
		const rows = await sql`SELECT value FROM portfolio_setting WHERE key = 'site' LIMIT 1`;
		return mapSiteSettings(rows[0]?.value);
	});
}

export function mapSiteSettings(raw: unknown): SiteSettings {
	const value = object(raw);
	const social = object(value.social);
	const footerBadges = object(value.footerBadges);
	return {
		siteTitle: String(value.siteTitle ?? 'Ali Maghami'),
		siteDescription: String(value.siteDescription ?? 'Ali Maghami - Computer Vision, AI, Robotics'),
		social: {
			github: optional(social.github as OptionalString),
			linkedin: optional(social.linkedin as OptionalString),
			scholar: optional(social.scholar as OptionalString),
			email: optional(social.email as OptionalString),
		},
		footerBadges: {
			limit: number(footerBadges.limit, 0),
			pages: stringArray(footerBadges.pages),
		},
	};
}

export function getUploadedMedia(mediaPath: string): Promise<UploadedMediaRecord | undefined> {
	return cached(`media:${mediaPath}`, async () => {
		const sql = getDatabase();
		const rows = await sql`
			SELECT path, mime_type, byte_size
			FROM portfolio_media
			WHERE path = ${mediaPath}
			LIMIT 1
		`;
		if (!rows[0]) return undefined;
		return {
			path: String(rows[0].path),
			mimeType: String(rows[0].mime_type),
			byteSize: Number(rows[0].byte_size),
		};
	});
}

/**
 * Intrinsic sizes for a set of uploads, in one query.
 *
 * Only rows that actually carry dimensions come back: uploads predating the
 * CMS recording them have nulls, and a caller cannot reserve space it does not
 * know.
 */
export async function getUploadedDimensions(
	paths: string[],
): Promise<Map<string, { width: number; height: number }>> {
	const sizes = new Map<string, { width: number; height: number }>();
	if (!paths.length) return sizes;

	const sql = getDatabase();
	const rows = await sql`
		SELECT path, width, height
		FROM portfolio_media
		WHERE path = ANY(${paths}) AND width IS NOT NULL AND height IS NOT NULL
	`;

	for (const row of rows) {
		sizes.set(String(row.path), { width: Number(row.width), height: Number(row.height) });
	}

	return sizes;
}
