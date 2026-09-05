import { describe, expect, it } from 'vitest';

import { feedItems } from './feed';
import type { PostRecord } from './portfolio-data';

const post = (overrides: Partial<PostRecord> & { id: string }): PostRecord => ({
	title: 'A post',
	description: 'What it is about',
	pubDate: new Date('2026-01-01'),
	tags: [],
	kind: 'Post',
	heroVideoPlayback: 'loop',
	bodyMarkdown: '',
	updatedAt: new Date('2026-01-01'),
	...overrides,
});

describe('feedItems', () => {
	it('links each item at the address the site serves it from', () => {
		const [item] = feedItems([post({ id: 'teaching-equipment-to-see' })]);

		expect(item.link).toBe('/blog/teaching-equipment-to-see/');
	});

	it('carries the title and description a reader sees in their client', () => {
		const [item] = feedItems([
			post({ id: 'a', title: 'Teaching equipment to see', description: 'Steel, steam and cameras' }),
		]);

		expect(item.title).toBe('Teaching equipment to see');
		expect(item.description).toBe('Steel, steam and cameras');
	});

	it('orders newest first regardless of the order it was given', () => {
		const items = feedItems([
			post({ id: 'oldest', pubDate: new Date('2024-01-01') }),
			post({ id: 'newest', pubDate: new Date('2026-06-01') }),
			post({ id: 'middle', pubDate: new Date('2025-03-01') }),
		]);

		expect(items.map((item) => item.link)).toEqual([
			'/blog/newest/',
			'/blog/middle/',
			'/blog/oldest/',
		]);
	});

	it('does not mutate the list it was handed', () => {
		const posts = [
			post({ id: 'oldest', pubDate: new Date('2024-01-01') }),
			post({ id: 'newest', pubDate: new Date('2026-06-01') }),
		];

		feedItems(posts);

		expect(posts.map((entry) => entry.id)).toEqual(['oldest', 'newest']);
	});

	it('passes tags through as categories', () => {
		const [item] = feedItems([post({ id: 'a', tags: ['Computer Vision', 'Robotics'] })]);

		expect(item.categories).toEqual(['Computer Vision', 'Robotics']);
	});

	it('omits categories rather than emitting an empty list', () => {
		const [item] = feedItems([post({ id: 'a', tags: [] })]);

		expect(item.categories).toBeUndefined();
	});

	it('produces nothing when there is nothing published', () => {
		expect(feedItems([])).toEqual([]);
	});
});
