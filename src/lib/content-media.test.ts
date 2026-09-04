import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/*
 * Guards the failure that broke three deploys in one evening.
 *
 * Astro resolves an image in a markdown body against the filesystem, so the
 * path in the markdown has to be the name on disk. The CMS percent-encodes
 * anything that needs escaping in a URL, and a file called
 * "ChatGPT Image Sep 3, 2026, 09_28_37 PM.png" therefore arrives as
 * ...Sep%203%2C%202026... — where %20 decodes and %2C does not.
 *
 * config.yml now slugifies uploads so those names never reach a body. This is
 * the second line: it catches anything already committed, anything added by
 * hand, and a future config edit that turns slugification back off. It runs in
 * milliseconds, against a deploy that takes minutes to tell you the same thing.
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
	 * The singular key is the trap, and the reason this file gained a second
	 * assertion. `media_library` is a union across providers — Cloudinary,
	 * Uploadcare, S3 and the rest — so it requires a `name` saying which one is
	 * meant. Written without one it is not merely ignored: the CMS refuses to
	 * start and every editor sees a configuration error instead of their
	 * content.
	 *
	 * The first version of this test asserted the singular shape and passed,
	 * because it checked the shape the test itself assumed rather than the one
	 * the CMS accepts. A green run is not evidence the CMS will load.
	 */
	it('does not use the singular key, which needs a provider name', async () => {
		expect((await cmsConfig()).media_library).toBeUndefined();
	});
});
