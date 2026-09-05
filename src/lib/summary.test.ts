import { describe, expect, it } from 'vitest';

import { metaDescription, plainText } from './summary';

describe('plainText', () => {
	it('keeps the words of emphasis and links and drops the notation', () => {
		expect(plainText("I'm **Ali**, working on [Physical AI](/about/) and _robotics_.")).toBe(
			"I'm Ali, working on Physical AI and robotics.",
		);
	});

	it('drops images entirely, since they have no words to keep', () => {
		expect(plainText('Before ![A rig](/media/rig.webp) after')).toBe('Before after');
	});

	it('flattens headings, quotes, lists and paragraphs into one line', () => {
		expect(plainText('# Title\n\n> quoted\n\n- one\n- two\n\n1. three')).toBe(
			'Title quoted one two three',
		);
	});

	it('removes code and raw markup', () => {
		expect(plainText('Run `npm test` then ```\nignored\n``` <br> done')).toBe('Run npm test then done');
	});

	it('is empty for an empty body', () => {
		expect(plainText('')).toBe('');
		expect(plainText('   \n  ')).toBe('');
	});
});

describe('metaDescription', () => {
	it('joins the pieces it is given and skips empty ones', () => {
		expect(metaDescription(['Building AI for the physical world.', undefined, '', 'More.'])).toBe(
			'Building AI for the physical world. More.',
		);
	});

	it('returns short text untouched', () => {
		expect(metaDescription(['Short.'])).toBe('Short.');
	});

	it('cuts at the last full sentence inside the limit', () => {
		const lede =
			"I'm Ali, an engineer and researcher working across AI, computer vision, robotics, and systems architecture. I build intelligent systems that connect perception, intelligence, and action.";
		const result = metaDescription(['Building AI for the physical world.', lede]);

		expect(result).toBe(
			"Building AI for the physical world. I'm Ali, an engineer and researcher working across AI, computer vision, robotics, and systems architecture.",
		);
		expect(result.length).toBeLessThanOrEqual(160);
	});

	it('cuts at a word and marks the cut when no sentence ends in time', () => {
		const words = Array.from({ length: 60 }, (_, i) => `word${i}`).join(' ');
		const result = metaDescription([words], 100);

		expect(result.endsWith('…')).toBe(true);
		expect(result.length).toBeLessThanOrEqual(101);
		// Every word survives whole: the cut falls between words, never inside one.
		expect(result.slice(0, -1).split(' ').every((w) => /^word\d+$/.test(w))).toBe(true);
	});

	it('does not stop at a sentence so early that most of the room goes unused', () => {
		const result = metaDescription(['Hi.', Array.from({ length: 40 }, () => 'long').join(' ')], 100);
		expect(result.startsWith('Hi. long long')).toBe(true);
		expect(result.endsWith('…')).toBe(true);
	});
});
