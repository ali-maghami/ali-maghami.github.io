import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

/*
 * A CMS save should start the deploy and nothing else. That relies on two
 * workflows ignoring every path the CMS writes to — and the media folders have
 * to be listed one by one, so adding a collection with a new folder silently
 * breaks it. That is exactly what happened when the portrait folder was added:
 * uploading a photo made the push look like a code change and all three
 * workflows ran.
 */
const root = process.cwd();

const readWorkflow = (name: string) =>
	parse(readFileSync(path.join(root, '.github', 'workflows', name), 'utf8'));

const ignoredOnPush = (name: string): string[] =>
	readWorkflow(name).on.push['paths-ignore'] ?? [];

/**
 * Media folders the CMS is configured to upload into, as public/<dir>.
 *
 * Walked rather than read at fixed depths: a media_folder can sit on a
 * collection, on a file, or on a single field — the projects body field has
 * its own, because the collection's folder is relative for Astro's image()
 * helper and cannot serve a URL. A field-level folder read at collection depth
 * would have been missed, which is the silent breakage this file exists to
 * catch.
 */
const cmsMediaFolders = (): string[] => {
	const config = parse(readFileSync(path.join(root, 'public', 'admin', 'config.yml'), 'utf8'));
	const folders = new Set<string>();

	const walk = (node: unknown) => {
		if (Array.isArray(node)) return node.forEach(walk);
		if (!node || typeof node !== 'object') return;

		for (const [key, value] of Object.entries(node)) {
			if (key === 'media_folder' && typeof value === 'string' && value.startsWith('/public/')) {
				folders.add(value.slice(1));
			}
			walk(value);
		}
	};

	walk(config.collections);
	return [...folders];
};

describe('workflow path filters', () => {
	it('ignores every folder the CMS uploads into', () => {
		const media = cmsMediaFolders();
		expect(media.length).toBeGreaterThan(0);

		for (const workflow of ['pr-checks.yml', 'codeql.yml']) {
			const ignored = ignoredOnPush(workflow);
			for (const folder of media) {
				expect(ignored, `${workflow} must ignore ${folder}`).toContain(`${folder}/**`);
			}
		}
	});

	it('ignores the content and data the CMS writes', () => {
		for (const workflow of ['pr-checks.yml', 'codeql.yml']) {
			const ignored = ignoredOnPush(workflow);
			expect(ignored, workflow).toContain('src/content/**');
			expect(ignored, workflow).toContain('src/data/**');
		}
	});

	it('keeps both workflows on the same list, so a save skips both or neither', () => {
		expect([...ignoredOnPush('pr-checks.yml')].sort()).toEqual(
			[...ignoredOnPush('codeql.yml')].sort(),
		);
	});

	it('never filters the deploy — a save must always publish', () => {
		expect(readWorkflow('deploy.yml').on.push['paths-ignore']).toBeUndefined();
	});
});
