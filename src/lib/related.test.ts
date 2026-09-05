import { describe, expect, it } from 'vitest';

import { neighbours, relatedByTags, sharedTags } from './related';

const post = { id: 'coilsense-post', tags: ['Computer Vision', 'Industrial AI', 'Edge AI'] };

const projects = [
	{ id: 'stripsense', tags: ['Computer Vision', 'Stereo Vision'] },
	{ id: 'coilsense', tags: ['computer vision', 'Industrial AI', 'Edge AI', 'Deep Learning'] },
	{ id: 'bin-picking', tags: ['3D Perception'] },
	{ id: 'railcar', tags: ['Computer Vision', 'Industrial AI'] },
];

describe('sharedTags', () => {
	it('counts tags in common regardless of case and stray spaces', () => {
		expect(sharedTags({ id: 'a', tags: ['AI', ' Robotics'] }, { id: 'b', tags: ['ai', 'robotics '] })).toBe(2);
	});

	it('is zero with nothing in common', () => {
		expect(sharedTags(post, projects[2])).toBe(0);
	});
});

describe('relatedByTags', () => {
	it('ranks by how much is shared and drops what shares nothing', () => {
		expect(relatedByTags(post, projects, 3).map((p) => p.id)).toEqual(['coilsense', 'railcar', 'stripsense']);
	});

	it('honours the limit', () => {
		expect(relatedByTags(post, projects).map((p) => p.id)).toEqual(['coilsense', 'railcar']);
		expect(relatedByTags(post, projects, 1).map((p) => p.id)).toEqual(['coilsense']);
	});

	it('keeps the candidates’ own order between equal scores', () => {
		const source = { id: 's', tags: ['X'] };
		const candidates = [
			{ id: 'newer', tags: ['X'] },
			{ id: 'older', tags: ['X'] },
		];
		expect(relatedByTags(source, candidates).map((c) => c.id)).toEqual(['newer', 'older']);
	});

	it('never relates an entry to itself', () => {
		expect(relatedByTags(projects[1], projects).map((p) => p.id)).not.toContain('coilsense');
	});

	it('is empty when the source has no tags or nothing matches', () => {
		expect(relatedByTags({ id: 'bare', tags: [] }, projects)).toEqual([]);
		expect(relatedByTags(post, [])).toEqual([]);
	});
});

describe('neighbours', () => {
	const posts = [{ id: 'third' }, { id: 'second' }, { id: 'first' }];

	it('finds the newer and older entries around one in the middle', () => {
		expect(neighbours(posts, 'second')).toEqual({ newer: { id: 'third' }, older: { id: 'first' } });
	});

	it('has nothing newer than the newest, nothing older than the oldest', () => {
		expect(neighbours(posts, 'third')).toEqual({ newer: undefined, older: { id: 'second' } });
		expect(neighbours(posts, 'first')).toEqual({ newer: { id: 'second' }, older: undefined });
	});

	it('is empty for an entry that is not in the list', () => {
		expect(neighbours(posts, 'draft')).toEqual({});
	});
});
