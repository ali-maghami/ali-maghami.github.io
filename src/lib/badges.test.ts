import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { badgeImage, heroMedia, portraitImage } from './badges';

/*
 * These used to throw on a path that named no file, which was right when the
 * site was a static build: the failure landed on whoever ran the build. Since
 * the site renders per request from the database, the same throw became a 500
 * for every visitor — a hero image saved with a typo in the CMS would take out
 * the home page, the projects and blog indexes, and every project page.
 *
 * A dropped image is now a degraded page and a warning in the log.
 */
describe('media paths from the CMS', () => {
	beforeEach(() => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('returns nothing when no path is set', () => {
		expect(badgeImage(undefined)).toBeUndefined();
		expect(badgeImage('')).toBeUndefined();
		expect(portraitImage(undefined)).toBeUndefined();
	});

	it('accepts a file that is actually in public/', () => {
		expect(badgeImage('/badges/aws-certified-solutions-architect-associate.png')).toBe(
			'/badges/aws-certified-solutions-architect-associate.png',
		);
	});

	it('accepts immutable files from the shared CMS upload volume', () => {
		expect(badgeImage('/uploads/123e4567-e89b-12d3-a456-426614174000.webp')).toBe(
			'/uploads/123e4567-e89b-12d3-a456-426614174000.webp',
		);
	});

	it('omits a path that names no file, rather than throwing', () => {
		expect(badgeImage('/badges/not-here.png')).toBeUndefined();
		expect(portraitImage('/portrait/nobody.jpg')).toBeUndefined();
		expect(heroMedia('/hero/typo.webp')).toBeUndefined();
	});

	it('omits a path with the wrong prefix, rather than throwing', () => {
		expect(badgeImage('/src/assets/certificates/aws.png')).toBeUndefined();
		expect(badgeImage('../../assets/certificates/aws.png')).toBeUndefined();
		expect(portraitImage('/badges/aws.png')).toBeUndefined();
	});

	it('says which field it dropped and why, so the log is actionable', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

		portraitImage('/portrait/nobody.jpg');
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('Portrait image'));
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('/portrait/nobody.jpg'));

		warn.mockClear();
		badgeImage('/elsewhere/aws.png');
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('does not start with /badges/'));
	});

	it('keeps answering consistently for a path it has already resolved', () => {
		// public/ is baked into the image, so a miss stays a miss for the life
		// of the container and the result is cached rather than re-stat'd.
		expect(badgeImage('/badges/not-here.png')).toBeUndefined();
		expect(badgeImage('/badges/not-here.png')).toBeUndefined();
		expect(badgeImage('/badges/aws-certified-solutions-architect-associate.png')).toBeTruthy();
		expect(badgeImage('/badges/aws-certified-solutions-architect-associate.png')).toBeTruthy();
	});
});
