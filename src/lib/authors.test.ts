import { describe, expect, it } from 'vitest';

import { formatAuthors } from './authors';

const OWNER = 'Ali Maghami';

describe('formatAuthors', () => {
	it('splits a comma list and picks out the owner', () => {
		expect(formatAuthors('Ali Maghami, Alaïs Imbert, Gabriel Côté, Bruno Monsarrat, Lionel Birglen', OWNER)).toEqual([
			{ name: 'Ali Maghami', self: true },
			{ name: 'Alaïs Imbert', self: false },
			{ name: 'Gabriel Côté', self: false },
			{ name: 'Bruno Monsarrat', self: false },
			{ name: 'Lionel Birglen', self: false },
		]);
	});

	it('evens out surnames printed in capitals', () => {
		expect(formatAuthors('Ali MAGHAMI, Maurizio Darini, Ivan MARINCIC, Ammaar ZIA', OWNER).map((a) => a.name)).toEqual([
			'Ali Maghami',
			'Maurizio Darini',
			'Ivan Marincic',
			'Ammaar Zia',
		]);
	});

	it('recognises the owner by initial and by a longer given name', () => {
		expect(formatAuthors('A Maghami', OWNER)).toEqual([{ name: 'A Maghami', self: true }]);
		expect(formatAuthors('A. Maghami, B. Someone', OWNER)[0].self).toBe(true);
		expect(formatAuthors('Seyedali Maghami', OWNER)[0].self).toBe(true);
		expect(formatAuthors('S. A. Maghami', OWNER)[0].self).toBe(true);
	});

	it('does not mistake another Maghami, or another Ali, for the owner', () => {
		expect(formatAuthors('Reza Maghami', OWNER)[0].self).toBe(false);
		expect(formatAuthors('Ali Someone', OWNER)[0].self).toBe(false);
	});

	it('accepts "and", ampersands and semicolons as separators', () => {
		expect(formatAuthors('Yousef Alborzi and Ali Maghami & Bhavin Dharia; Michael Newman', OWNER).map((a) => a.name)).toEqual([
			'Yousef Alborzi',
			'Ali Maghami',
			'Bhavin Dharia',
			'Michael Newman',
		]);
	});

	it('leaves short capitals and mixed case alone', () => {
		expect(formatAuthors('J. R. R. Tolkien, Ronald McDonald, AI Lab', OWNER).map((a) => a.name)).toEqual([
			'J. R. R. Tolkien',
			'Ronald McDonald',
			'AI Lab',
		]);
	});

	it('marks nobody when the owner name is a single word', () => {
		expect(formatAuthors('Ali Maghami', 'Ali').every((a) => !a.self)).toBe(true);
	});

	it('is empty for an empty string', () => {
		expect(formatAuthors('', OWNER)).toEqual([]);
	});
});
