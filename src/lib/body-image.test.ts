import { describe, expect, it } from 'vitest';

import { firstBodyImage, leadImage } from './body-image';

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

describe('leadImage', () => {
	it('prefers the hero when there is one', () => {
		expect(leadImage('/media/hero.webp', '![x](/badges/aws-certified-solutions-architect-associate.png)')).toBe(
			'/media/hero.webp',
		);
	});

	it('falls back to the first body image the site can serve', () => {
		// A real committed file, so this runs against what ships.
		expect(leadImage(undefined, 'Words ![x](/badges/aws-certified-solutions-architect-associate.png)')).toBe(
			'/badges/aws-certified-solutions-architect-associate.png',
		);
		expect(leadImage(undefined, '![x](/uploads/123e4567-e89b-12d3-a456-426614174000.webp)')).toBe(
			'/uploads/123e4567-e89b-12d3-a456-426614174000.webp',
		);
	});

	it('has nothing for a body image that is not there, or no image at all', () => {
		expect(leadImage(undefined, '![x](/media/not-committed.png)')).toBeUndefined();
		expect(leadImage(undefined, 'Only words.')).toBeUndefined();
	});
});
