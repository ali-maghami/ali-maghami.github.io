import { describe, expect, it } from 'vitest';
import { portraitStyle } from './portrait';

const base = { size: 250, borderWidth: 3, opacity: 80, filter: 'grayscale' };

describe('portraitStyle', () => {
	it('emits the custom properties the hero reads', () => {
		expect(portraitStyle(base)).toBe(
			'--portrait-size:250px;--portrait-border:3px;--portrait-opacity:0.8;--portrait-filter:grayscale(1)',
		);
	});

	it('converts the percentage an editor types into a CSS opacity', () => {
		expect(portraitStyle({ ...base, opacity: 100 })).toContain('--portrait-opacity:1');
		expect(portraitStyle({ ...base, opacity: 45 })).toContain('--portrait-opacity:0.45');
	});

	it('maps every filter the CMS offers', () => {
		for (const [name, css] of [
			['grayscale', 'grayscale(1)'],
			['soft-grayscale', 'grayscale(0.55)'],
			['sepia', 'sepia(0.55)'],
			['contrast', 'grayscale(1) contrast(1.15)'],
			['none', 'none'],
		]) {
			expect(portraitStyle({ ...base, filter: name })).toContain(`--portrait-filter:${css}`);
		}
	});

	it('falls back rather than emitting an unknown value as CSS', () => {
		// The schema constrains this, but the map is what actually reaches the
		// style attribute, so it must not pass anything through unchecked.
		expect(portraitStyle({ ...base, filter: 'url(evil)' })).toContain(
			'--portrait-filter:grayscale(1)',
		);
	});

	it('allows a border of zero', () => {
		expect(portraitStyle({ ...base, borderWidth: 0 })).toContain('--portrait-border:0px');
	});
});
