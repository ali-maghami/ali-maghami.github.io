import { z } from 'astro/zod';
import { describe, expect, it } from 'vitest';
import { blankToUndefined, optional, optionalUrl } from './schema';

describe('blankToUndefined', () => {
	it('treats the values the CMS writes for a cleared field as absent', () => {
		expect(blankToUndefined('')).toBeUndefined();
		expect(blankToUndefined(null)).toBeUndefined();
	});

	it('leaves real values alone, including falsy ones that are meaningful', () => {
		expect(blankToUndefined(0)).toBe(0);
		expect(blankToUndefined(false)).toBe(false);
		expect(blankToUndefined('text')).toBe('text');
		expect(blankToUndefined(undefined)).toBeUndefined();
	});
});

describe('optional', () => {
	it('accepts a cleared number, which the CMS writes as null', () => {
		// Regression: `citations: null` from the CMS failed with
		// 'Expected type "number", received "object"' and broke the build.
		const schema = optional(z.number().int().nonnegative());
		expect(schema.parse(null)).toBeUndefined();
		expect(schema.parse(undefined)).toBeUndefined();
		expect(schema.parse(12)).toBe(12);
		expect(schema.parse(0)).toBe(0);
	});

	it('does not turn a cleared date into 1970', () => {
		// Regression: z.coerce.date() coerces null to the epoch rather than
		// erroring, so a cleared expiry date would have rendered as expired.
		const schema = optional(z.coerce.date());
		expect(schema.parse(null)).toBeUndefined();
		expect(schema.parse('')).toBeUndefined();
		expect(schema.parse('2024-01-15')).toEqual(new Date('2024-01-15'));
	});

	it('accepts a cleared string field', () => {
		const schema = optional(z.string());
		expect(schema.parse('')).toBeUndefined();
		expect(schema.parse(null)).toBeUndefined();
		expect(schema.parse('kept')).toBe('kept');
	});

	it('still rejects values that are genuinely wrong', () => {
		expect(() => optional(z.number()).parse('not a number')).toThrow();
	});
});

describe('optionalUrl', () => {
	it('accepts a cleared URL field', () => {
		expect(optionalUrl.parse('')).toBeUndefined();
		expect(optionalUrl.parse(null)).toBeUndefined();
	});

	it('keeps a real URL and still rejects a malformed one', () => {
		expect(optionalUrl.parse('https://example.com')).toBe('https://example.com');
		expect(() => optionalUrl.parse('not-a-url')).toThrow();
	});
});
