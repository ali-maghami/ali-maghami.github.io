import { createHmac } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { verifyPreviewToken, type PreviewCollection } from './preview';

const SECRET = 'a-shared-secret';
const NOW = 1_800_000_000_000;

/** What the CMS does when it hands out a link. */
const token = (
	collection: PreviewCollection,
	slug: string,
	expiry: number,
	secret = SECRET,
): string =>
	`${expiry}.${createHmac('sha256', secret).update(`${collection}|${slug}|${expiry}`).digest('hex')}`;

const inThirtyMinutes = Math.floor(NOW / 1000) + 30 * 60;

describe('verifyPreviewToken', () => {
	it('accepts a token the CMS signed for this entry', () => {
		const granted = token('projects', 'coilsense', inThirtyMinutes);

		expect(verifyPreviewToken(granted, 'projects', 'coilsense', SECRET, NOW)).toBe(true);
	});

	it('grants one entry, not a collection', () => {
		// Otherwise a link to one draft would open every draft.
		const granted = token('projects', 'coilsense', inThirtyMinutes);

		expect(verifyPreviewToken(granted, 'projects', 'something-else', SECRET, NOW)).toBe(false);
	});

	it('does not carry across collections', () => {
		const granted = token('projects', 'shared-slug', inThirtyMinutes);

		expect(verifyPreviewToken(granted, 'posts', 'shared-slug', SECRET, NOW)).toBe(false);
	});

	it('expires', () => {
		const expired = token('projects', 'coilsense', Math.floor(NOW / 1000) - 1);

		expect(verifyPreviewToken(expired, 'projects', 'coilsense', SECRET, NOW)).toBe(false);
	});

	it('cannot be extended by editing the expiry', () => {
		// The expiry is signed, so moving it invalidates the signature.
		const granted = token('projects', 'coilsense', inThirtyMinutes);
		const tampered = `${inThirtyMinutes + 86_400}.${granted.split('.')[1]}`;

		expect(verifyPreviewToken(tampered, 'projects', 'coilsense', SECRET, NOW)).toBe(false);
	});

	it('cannot be forged with a different secret', () => {
		const forged = token('projects', 'coilsense', inThirtyMinutes, 'not-the-secret');

		expect(verifyPreviewToken(forged, 'projects', 'coilsense', SECRET, NOW)).toBe(false);
	});

	it('is off, not open, when no secret is configured', () => {
		const granted = token('projects', 'coilsense', inThirtyMinutes);

		expect(verifyPreviewToken(granted, 'projects', 'coilsense', undefined, NOW)).toBe(false);
		expect(verifyPreviewToken(granted, 'projects', 'coilsense', '', NOW)).toBe(false);
	});

	it('refuses malformed tokens rather than throwing', () => {
		for (const bad of ['', 'nonsense', '.', 'abc.def', `${inThirtyMinutes}.`, '1e9.deadbeef']) {
			expect(verifyPreviewToken(bad, 'projects', 'coilsense', SECRET, NOW)).toBe(false);
		}
		expect(verifyPreviewToken(null, 'projects', 'coilsense', SECRET, NOW)).toBe(false);
	});

	it('refuses a signature of the wrong length without throwing', () => {
		// timingSafeEqual requires equal lengths; a short one must not crash.
		expect(verifyPreviewToken(`${inThirtyMinutes}.aa`, 'projects', 'coilsense', SECRET, NOW)).toBe(
			false,
		);
	});
});
