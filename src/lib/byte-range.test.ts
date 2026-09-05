import { describe, expect, it } from 'vitest';

import { contentRange, parseRange } from './byte-range';

describe('parseRange', () => {
	it('sends the whole file when nothing was asked for', () => {
		expect(parseRange(null, 1000)).toEqual({ kind: 'full' });
		expect(parseRange(undefined, 1000)).toEqual({ kind: 'full' });
		expect(parseRange('', 1000)).toEqual({ kind: 'full' });
	});

	it('serves a closed range as given', () => {
		expect(parseRange('bytes=0-499', 1000)).toEqual({ kind: 'partial', start: 0, end: 499 });
		expect(parseRange('bytes=500-999', 1000)).toEqual({ kind: 'partial', start: 500, end: 999 });
	});

	it('runs an open range to the end of the file', () => {
		// What a media element sends first: everything from here on.
		expect(parseRange('bytes=0-', 1000)).toEqual({ kind: 'partial', start: 0, end: 999 });
		expect(parseRange('bytes=750-', 1000)).toEqual({ kind: 'partial', start: 750, end: 999 });
	});

	it('clamps an end past the file to the last byte', () => {
		expect(parseRange('bytes=900-5000', 1000)).toEqual({ kind: 'partial', start: 900, end: 999 });
	});

	it('takes a suffix range from the end', () => {
		expect(parseRange('bytes=-100', 1000)).toEqual({ kind: 'partial', start: 900, end: 999 });
		// Longer than the file is simply the whole file.
		expect(parseRange('bytes=-5000', 1000)).toEqual({ kind: 'partial', start: 0, end: 999 });
	});

	it('refuses a range that starts past the end', () => {
		expect(parseRange('bytes=1000-', 1000)).toEqual({ kind: 'unsatisfiable' });
		expect(parseRange('bytes=1500-1600', 1000)).toEqual({ kind: 'unsatisfiable' });
		expect(parseRange('bytes=0-', 0)).toEqual({ kind: 'unsatisfiable' });
	});

	it('refuses a range that ends before it starts', () => {
		expect(parseRange('bytes=500-100', 1000)).toEqual({ kind: 'unsatisfiable' });
	});

	it('ignores what it does not understand and sends the whole file', () => {
		expect(parseRange('bytes=0-100,200-300', 1000)).toEqual({ kind: 'full' });
		expect(parseRange('items=0-10', 1000)).toEqual({ kind: 'full' });
		expect(parseRange('bytes=-', 1000)).toEqual({ kind: 'full' });
		expect(parseRange('bytes=abc', 1000)).toEqual({ kind: 'full' });
	});
});

describe('contentRange', () => {
	it('describes the slice being sent', () => {
		expect(contentRange({ kind: 'partial', start: 0, end: 499 }, 1000)).toBe('bytes 0-499/1000');
	});

	it('names the file length when the request could not be met', () => {
		expect(contentRange({ kind: 'unsatisfiable' }, 1000)).toBe('bytes */1000');
	});
});
