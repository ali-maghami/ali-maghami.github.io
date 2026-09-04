import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/*
 * Guards the media failures that broke four deploys in one evening.
 *
 * Astro resolves an image in a markdown body against the filesystem, so the
 * path in the markdown has to be the name on disk. The CMS percent-encodes
 * anything that needs escaping in a URL, and a file called
 * "ChatGPT Image Sep 3, 2026, 09_28_37 PM.png" therefore arrives as
 * ...Sep%203%2C%202026... — where %20 decodes and %2C does not.
 *
 * Frontmatter has a separate trap: the media browser offers assets from every
 * registered folder, so a hero can be pointed at one the site does not serve.
 *
 * config.yml now slugifies uploads and defaults to a servable folder. This is
 * the second line: it catches what is already committed, what is added by
 * hand, and a config edit that undoes either. It runs in milliseconds, against
 * a deploy that takes minutes to report the same thing.
 */
const root = process.cwd();
const contentDir = path.join(root, 'src', 'content');

/** Every markdown file under src/content, whatever the collection. */
const contentFiles = (dir: string): string[] =>
	readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) return contentFiles(full);
		return /\.mdx?$/.test(entry.name) ? [full] : [];
	});

/** Markdown image and link targets, plus src attributes in raw HTML. */
const mediaReferences = (body: string): string[] => [
	...[...body.matchAll(/!\[[^\]]*\]\(([^)\s]+)/g)].map((m) => m[1]),
	...[...body.matchAll(/<(?:img|video|source)[^>]*\ssrc="([^"]+)"/g)].map((m) => m[1]),
];

const files = contentFiles(contentDir);

describe('media references in content', () => {
	it('finds content to check, so a passing run means something', () => {
		expect(files.length).toBeGreaterThan(0);
	});

	// The exact failure: %2C for a comma never decodes back to the filename.
	it('never percent-encodes a media path', () => {
		const offenders: string[] = [];

		for (const file of files) {
			for (const ref of mediaReferences(readFileSync(file, 'utf8'))) {
				if (/%[0-9A-Fa-f]{2}/.test(ref)) {
					offenders.push(`${path.relative(root, file)} -> ${ref}`);
				}
			}
		}

		expect(offenders, 'percent-encoded media paths break the build').toEqual([]);
	});

	// Slugified names cannot contain these; an unslugified upload can.
	it('never references a filename with a character that needs escaping', () => {
		const offenders: string[] = [];

		for (const file of files) {
			for (const ref of mediaReferences(readFileSync(file, 'utf8'))) {
				if (/[,()\s]/.test(decodeURIComponent(ref))) {
					offenders.push(`${path.relative(root, file)} -> ${ref}`);
				}
			}
		}

		expect(offenders, 'commas, brackets and spaces in a filename break the build').toEqual([]);
	});

	// A reference is only correct if the file is actually there. This is what
	// the build itself checks, several minutes later.
	it('points every relative reference at a file that exists', () => {
		const missing: string[] = [];

		for (const file of files) {
			for (const ref of mediaReferences(readFileSync(file, 'utf8'))) {
				if (/^(https?:|data:|mailto:|#|\/)/.test(ref)) continue;
				const target = path.resolve(path.dirname(file), decodeURIComponent(ref));
				try {
					readFileSync(target);
				} catch {
					missing.push(`${path.relative(root, file)} -> ${ref}`);
				}
			}
		}

		expect(missing, 'referenced file does not exist').toEqual([]);
	});
});

describe('hero media in frontmatter', () => {
	/*
	 * assertHeroMedia rejects these at build time, but the build is minutes
	 * away and runs after the save has already landed on main. The media
	 * browser offers assets from every registered folder, and picking one from
	 * outside public/ writes a path the site cannot serve — which is how a post
	 * hero became /src/assets/work/coilsense-coilbox.png and failed the build.
	 */
	const frontmatter = (file: string): Record<string, string> => {
		const lines = readFileSync(file, 'utf8').split(/\r?\n/);
		if (lines[0] !== '---') return {};

		const end = lines.indexOf('---', 1);
		if (end === -1) return {};

		const pairs = lines
			.slice(1, end)
			.map((line) => line.match(/^(\w+):\s*(.*)$/))
			.filter((m): m is RegExpMatchArray => Boolean(m))
			.map((m): [string, string] => [m[1], m[2].trim().replace(/^['"]|['"]$/g, '')]);

		return Object.fromEntries(pairs);
	};

	const posts = files.filter((f) => f.includes(`${path.sep}blog${path.sep}`));
	const heroFields = ['heroImage', 'heroVideo'];

	it('finds posts to check', () => {
		expect(posts.length).toBeGreaterThan(0);
	});

	it('serves every post hero from a public path', () => {
		const offenders: string[] = [];

		for (const file of posts) {
			const data = frontmatter(file);
			for (const key of heroFields) {
				const value = data[key];
				if (value && !value.startsWith('/hero/')) {
					offenders.push(`${path.relative(root, file)} ${key}=${value}`);
				}
			}
		}

		expect(offenders, 'a hero must live under /hero/, which maps to public/hero').toEqual([]);
	});

	it('points every hero at a file that exists', () => {
		const missing: string[] = [];

		for (const file of posts) {
			const data = frontmatter(file);
			for (const key of heroFields) {
				const value = data[key];
				if (!value || !value.startsWith('/')) continue;
				try {
					readFileSync(path.join(root, 'public', value.slice(1)));
				} catch {
					missing.push(`${path.relative(root, file)} ${key}=${value}`);
				}
			}
		}

		expect(missing, 'hero file does not exist').toEqual([]);
	});
});

describe('the CMS media configuration', () => {
	const cmsConfig = async () => {
		const { parse } = await import('yaml');
		return parse(readFileSync(path.join(root, 'public', 'admin', 'config.yml'), 'utf8'));
	};

	// If this is ever turned off, the problem returns silently on the next
	// upload with an awkward name.
	it('slugifies uploaded filenames', async () => {
		expect((await cmsConfig()).media_libraries?.default?.config?.slugify_filename).toBe(true);
	});

	/*
	 * The singular key is a union across providers — Cloudinary, Uploadcare, S3
	 * and the rest — so it requires a `name` saying which one is meant. Written
	 * without one it is not merely ignored: the CMS refuses to start, and every
	 * editor sees a configuration error instead of their content.
	 *
	 * The first version of this test asserted the singular shape and passed,
	 * because it checked the shape the test itself assumed rather than the one
	 * the CMS accepts. A green run is not evidence the CMS will load.
	 */
	it('does not use the singular key, which needs a provider name', async () => {
		expect((await cmsConfig()).media_library).toBeUndefined();
	});

	// The default folder is what the asset browser offers first, so its public
	// path has to be one the site actually serves.
	it('defaults to a folder the site serves', async () => {
		const config = await cmsConfig();

		expect(config.public_folder).toMatch(/^\//);
		expect(config.public_folder).not.toMatch(/^\/src\//);
		expect(config.media_folder).toMatch(/^public\//);
	});
});
