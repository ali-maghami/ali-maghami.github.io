import postgres from 'postgres';


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

function mapProject(row: Record<string, unknown>): ProjectRecord {
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

function mapPost(row: Record<string, unknown>): PostRecord {
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

function mapPaper(row: Record<string, unknown>): PaperRecord {
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

function mapCertificate(row: Record<string, unknown>): CertificateRecord {
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

export async function listProjects(): Promise<ProjectRecord[]> {
	const sql = getDatabase();
	const rows = await sql`SELECT * FROM portfolio_project WHERE status = 'published' ORDER BY pub_date DESC`;
	return rows.map((row) => mapProject(row));
}

export async function getProjectBySlug(slug: string): Promise<ProjectRecord | undefined> {
	const sql = getDatabase();
	const rows = await sql`SELECT * FROM portfolio_project WHERE slug = ${slug} AND status = 'published' LIMIT 1`;
	return rows[0] ? mapProject(rows[0]) : undefined;
}

export async function listPosts(): Promise<PostRecord[]> {
	const sql = getDatabase();
	const rows = await sql`SELECT * FROM portfolio_post WHERE status = 'published' ORDER BY pub_date DESC`;
	return rows.map((row) => mapPost(row));
}

export async function getPostBySlug(slug: string): Promise<PostRecord | undefined> {
	const sql = getDatabase();
	const rows = await sql`SELECT * FROM portfolio_post WHERE slug = ${slug} AND status = 'published' LIMIT 1`;
	return rows[0] ? mapPost(rows[0]) : undefined;
}

export async function listPapers(): Promise<PaperRecord[]> {
	const sql = getDatabase();
	const rows = await sql`SELECT * FROM portfolio_paper WHERE status = 'published' ORDER BY year DESC`;
	return rows.map((row) => mapPaper(row));
}

export async function listCertificates(): Promise<CertificateRecord[]> {
	const sql = getDatabase();
	const rows = await sql`SELECT * FROM portfolio_certificate WHERE status = 'published' ORDER BY issue_date DESC`;
	return rows.map((row) => mapCertificate(row));
}

export async function getHomePage(): Promise<HomePageRecord> {
	const sql = getDatabase();
	const rows = await sql`SELECT data, body_markdown FROM portfolio_page WHERE key = 'home' LIMIT 1`;
	if (!rows[0]) throw new Error('The home page is missing from the portfolio database.');
	const data = object(rows[0].data);
	const bodyMarkdown = String(rows[0].body_markdown ?? '');
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
		bodyMarkdown,
	};
}

export async function getAboutPage(): Promise<AboutPageRecord> {
	const sql = getDatabase();
	const rows = await sql`SELECT data, body_markdown FROM portfolio_page WHERE key = 'about' LIMIT 1`;
	if (!rows[0]) throw new Error('The about page is missing from the portfolio database.');
	const data = object(rows[0].data);
	const bodyMarkdown = String(rows[0].body_markdown ?? '');
	return {
		title: String(data.title ?? ''),
		eyebrow: String(data.eyebrow ?? 'About'),
		standfirst: String(data.standfirst ?? ''),
		skills: Array.isArray(data.skills) ? (data.skills as AboutPageRecord['skills']) : [],
		education: Array.isArray(data.education) ? (data.education as AboutPageRecord['education']) : [],
		bodyMarkdown,
	};
}

export async function getSiteSettings(): Promise<SiteSettings> {
	const sql = getDatabase();
	const value = object((await sql`SELECT value FROM portfolio_setting WHERE key = 'site' LIMIT 1`)[0]?.value);
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

export async function getUploadedMedia(mediaPath: string): Promise<UploadedMediaRecord | undefined> {
	const sql = getDatabase();
	if (!sql) return undefined;
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
}
