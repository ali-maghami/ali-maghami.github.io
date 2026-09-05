import { describe, expect, it } from 'vitest';
import { assertBadge, assertPortrait } from './badges';

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

	it('accepts immutable files from the shared CMS upload volume', () => {
		expect(assertBadge('/uploads/123e4567-e89b-12d3-a456-426614174000.webp')).toBe(
			'/uploads/123e4567-e89b-12d3-a456-426614174000.webp',
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

describe('assertPortrait', () => {
	it('returns nothing when no portrait is set', () => {
		// The hero renders as text alone until one is uploaded, so absent is a
		// valid state rather than an error.
		expect(assertPortrait(undefined)).toBeUndefined();
		expect(assertPortrait('')).toBeUndefined();
	});

	it('rejects a path outside public/portrait', () => {
		expect(() => assertPortrait('/badges/aws.png')).toThrow(/must start with \/portrait\//);
	});

	it('rejects a portrait that is not on disk', () => {
		expect(() => assertPortrait('/portrait/nobody.jpg')).toThrow(/Portrait image not found/);
	});
});
