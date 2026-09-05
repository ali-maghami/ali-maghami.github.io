import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { READ_COLUMNS, missingColumns } from './schema-contract';

/*
 * The list is only a contract if it matches the code. Both directions are
 * checked against the source of portfolio-data.ts: every column the mappers
 * read is declared, and every declared column is actually read somewhere.
 * Without that the list becomes a second thing to remember.
 */
describe('READ_COLUMNS against portfolio-data.ts', () => {
	const source = readFileSync(path.join(process.cwd(), 'src', 'lib', 'portfolio-data.ts'), 'utf8');
	const declared = new Set(Object.values(READ_COLUMNS).flat());

	it('declares every column the mappers read off a row', () => {
		const read = new Set(
			[...source.matchAll(/\brows?(?:\[0\])?\.([a-z_]+)\b/g)].map((match) => match[1]),
		);
		// Array methods on the result set are not columns, and the schema check
		// reads information_schema rather than a content table.
		for (const notAColumn of ['map', 'length', 'table_name', 'column_name']) read.delete(notAColumn);

		const undeclared = [...read].filter((column) => !declared.has(column));
		expect(undeclared).toEqual([]);
	});

	it('reads every column it declares', () => {
		const unread = [...declared].filter((column) => !new RegExp(`\\b${column}\\b`).test(source));
		expect(unread).toEqual([]);
	});

	it('names only the tables the reader role is granted', () => {
		expect(Object.keys(READ_COLUMNS).sort()).toEqual([
			'portfolio_certificate',
			'portfolio_media',
			'portfolio_page',
			'portfolio_paper',
			'portfolio_post',
			'portfolio_project',
			'portfolio_setting',
		]);
	});
});

describe('missingColumns', () => {
	const expected = { things: ['id', 'name'], other: ['key'] };

	it('is empty when everything expected is visible', () => {
		expect(
			missingColumns(expected, [
				{ table: 'things', column: 'id' },
				{ table: 'things', column: 'name' },
				{ table: 'things', column: 'extra_the_cms_added' },
				{ table: 'other', column: 'key' },
			]),
		).toEqual([]);
	});

	it('names a column that has gone', () => {
		expect(
			missingColumns(expected, [
				{ table: 'things', column: 'id' },
				{ table: 'other', column: 'key' },
			]),
		).toEqual(['things.name']);
	});

	it('reports a whole table when none of it is visible', () => {
		expect(missingColumns(expected, [{ table: 'things', column: 'id' }, { table: 'things', column: 'name' }])).toEqual([
			'other.*',
		]);
	});
});
