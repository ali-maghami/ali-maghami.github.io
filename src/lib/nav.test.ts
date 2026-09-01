import { describe, expect, it } from 'vitest';
import { getNavHref } from './nav';

describe('getNavHref', () => {
	it('returns root paths unchanged', () => {
		expect(getNavHref('/')).toBe('/');
	});

	it('returns nested paths unchanged', () => {
		expect(getNavHref('/projects/')).toBe('/projects/');
	});
});
