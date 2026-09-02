import { describe, expect, it } from 'vitest';
import { assertBadge } from './badges';

describe('assertBadge', () => {
	it('returns nothing for a certificate with no badge', () => {
		expect(assertBadge(undefined)).toBeUndefined();
		expect(assertBadge('')).toBeUndefined();
	});

	it('accepts a badge that is actually in public/badges', () => {
		expect(assertBadge('/badges/aws-certified-solutions-architect-associate.png')).toBe(
			'/badges/aws-certified-solutions-architect-associate.png',
		);
	});

	it('rejects a path that names no file, rather than shipping a broken image', () => {
		// A public path is just a string, so nothing else would catch a typo.
		expect(() => assertBadge('/badges/not-here.png')).toThrow(/Badge image not found/);
	});

	it('rejects the old src/assets form, which the CMS could never preview', () => {
		expect(() => assertBadge('/src/assets/certificates/aws.png')).toThrow(/must start with/);
		expect(() => assertBadge('../../assets/certificates/aws.png')).toThrow(/must start with/);
	});
});
