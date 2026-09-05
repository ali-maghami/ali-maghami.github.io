import { describe, expect, it } from 'vitest';

import { highlights } from './highlights';
import type { CertificateRecord, PaperRecord, ProjectRecord } from './portfolio-data';

const paper = (kind: PaperRecord['kind']): PaperRecord => ({
	id: kind,
	title: 't',
	authors: 'a',
	venue: 'v',
	year: 2024,
	kind,
	tags: [],
	featured: false,
	bodyMarkdown: '',
});

const project = {} as ProjectRecord;
const certificate = {} as CertificateRecord;

describe('highlights', () => {
	it('counts publications apart from patents, then projects and certifications', () => {
		expect(
			highlights({
				papers: [paper('journal'), paper('conference'), paper('thesis'), paper('patent'), paper('patent')],
				projects: [project, project, project],
				certificates: [certificate],
			}),
		).toEqual([
			{ value: '3', label: 'publications' },
			{ value: '2', label: 'patents' },
			{ value: '3', label: 'projects' },
			{ value: '1', label: 'certification' },
		]);
	});

	it('leads with years in the field when the start year is set', () => {
		const today = new Date('2026-09-05T00:00:00Z');
		expect(highlights({ papers: [], projects: [], certificates: [], since: 2015 }, today)[0]).toEqual({
			value: '11+',
			label: 'years in the field',
		});
		expect(highlights({ papers: [], projects: [], certificates: [], since: 2025 }, today)[0]).toEqual({
			value: '1+',
			label: 'year in the field',
		});
	});

	it('leaves out a start year that is unset, in the future, or this year', () => {
		const today = new Date('2026-09-05T00:00:00Z');
		expect(highlights({ papers: [], projects: [], certificates: [] }, today)).toEqual([]);
		expect(highlights({ papers: [], projects: [], certificates: [], since: 2030 }, today)).toEqual([]);
		expect(highlights({ papers: [], projects: [], certificates: [], since: 2026 }, today)).toEqual([]);
	});

	it('shows nothing for a count of zero rather than "0 patents"', () => {
		expect(highlights({ papers: [paper('journal')], projects: [], certificates: [] })).toEqual([
			{ value: '1', label: 'publication' },
		]);
	});
});
