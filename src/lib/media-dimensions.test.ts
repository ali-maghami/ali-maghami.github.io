import { describe, expect, it } from 'vitest';

import { publicImagePathsIn, uploadPathsIn } from './media-dimensions';

const A = '/uploads/123e4567-e89b-12d3-a456-426614174000.webp';
const B = '/uploads/00000000-1111-2222-3333-444444444444.mp4';

describe('uploadPathsIn', () => {
	it('finds an embed in a body', () => {
		expect(uploadPathsIn(`Words.\n\n![loop: A clip](${B})\n\nMore.`)).toEqual([B]);
	});

	it('finds several and returns each once', () => {
		// The list becomes one query, so a repeated image should not be asked
		// for twice.
		expect(uploadPathsIn(`![](${A}) ![](${B}) ![](${A})`)).toEqual([A, B]);
	});

	it('ignores public files, which are not uploads and have no row', () => {
		expect(uploadPathsIn('![](/media/rig.webp) ![](/badges/aws.png)')).toEqual([]);
	});

	it('ignores anything that is not the shape the CMS mints', () => {
		expect(uploadPathsIn('![](/uploads/not-a-uuid.png)')).toEqual([]);
		expect(uploadPathsIn('no media here at all')).toEqual([]);
	});

	it('returns nothing for an empty body', () => {
		expect(uploadPathsIn('')).toEqual([]);
	});
});

describe('publicImagePathsIn', () => {
	it('finds committed images in the folders the CMS may name', () => {
		expect(
			publicImagePathsIn('![A rig](/media/rig.webp) then ![](/hero/still.jpg) and ![](/badges/aws.png)'),
		).toEqual(['/media/rig.webp', '/hero/still.jpg', '/badges/aws.png']);
	});

	it('returns each once and leaves uploads to the other matcher', () => {
		expect(publicImagePathsIn(`![](/media/a.png) ![](/media/a.png) ![](${A})`)).toEqual(['/media/a.png']);
	});

	it('ignores video and PDF, which have no image size to reserve', () => {
		expect(publicImagePathsIn('![loop](/media/clip.mp4) [paper](/pdf/thesis.pdf)')).toEqual([]);
	});

	it('returns nothing for an empty body', () => {
		expect(publicImagePathsIn('')).toEqual([]);
	});
});
