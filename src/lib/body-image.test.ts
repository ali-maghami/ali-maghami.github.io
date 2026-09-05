import { describe, expect, it } from 'vitest';

import { firstBodyImage } from './body-image';

describe('firstBodyImage', () => {
	it('finds the first still in a body', () => {
		expect(firstBodyImage('Words.\n\n![A rig](/media/rig.webp)\n\n![Another](/media/b.jpg)')).toBe('/media/rig.webp');
	});

	it('skips a video to reach a still', () => {
		expect(firstBodyImage('![loop hero: clip](/media/clip.mp4)\n\n![Still](/uploads/123e4567-e89b-12d3-a456-426614174000.png)')).toBe(
			'/uploads/123e4567-e89b-12d3-a456-426614174000.png',
		);
	});

	it('ignores a title, a query string and angle brackets around the target', () => {
		expect(firstBodyImage('![x](/media/a.png "Title")')).toBe('/media/a.png');
		expect(firstBodyImage('![x](/media/a.png?v=2)')).toBe('/media/a.png');
		expect(firstBodyImage('![x](</media/a.png>)')).toBe('/media/a.png');
	});

	it('is undefined when there is no still at all', () => {
		expect(firstBodyImage('Only words.')).toBeUndefined();
		expect(firstBodyImage('![clip](/media/clip.mp4)')).toBeUndefined();
		expect(firstBodyImage('')).toBeUndefined();
	});
});
