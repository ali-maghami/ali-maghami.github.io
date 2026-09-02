import { describe, expect, it } from 'vitest';
import { portraitStyle, rgba } from './portrait';

const base = {
	size: 250,
	borderWidth: 3,
	opacity: 80,
	filter: 'grayscale',
	background: '#FFFFFF',
	backgroundOpacity: 0,
};

describe('portraitStyle', () => {
	it('emits the custom properties the hero reads', () => {
		expect(portraitStyle(base)).toBe(
			'--portrait-size:250px;--portrait-border:3px;--portrait-opacity:0.8;' +
				'--portrait-filter:grayscale(1);--portrait-bg:rgb(255 255 255 / 0)',
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

describe('rgba', () => {
	it('composes a CSS colour from a hex value and a percentage', () => {
		expect(rgba('#FFFFFF', 100)).toBe('rgb(255 255 255 / 1)');
		expect(rgba('#000000', 0)).toBe('rgb(0 0 0 / 0)');
		expect(rgba('#3D444D', 40)).toBe('rgb(61 68 77 / 0.4)');
	});

	it('accepts the uppercase the CMS colour picker stores', () => {
		expect(rgba('#AABBCC', 50)).toBe(rgba('#aabbcc', 50));
	});

	it('falls back to transparent rather than emitting a value it cannot parse', () => {
		// This lands in a style attribute, so anything unrecognised has to show
		// nothing rather than reach the page as CSS.
		for (const bad of ['red', '#FFF', 'rgb(1,2,3)', '#GGGGGG', '', 'url(x);color:red']) {
			expect(rgba(bad, 100), bad).toBe('transparent');
		}
	});

	it('clamps a percentage outside the range', () => {
		expect(rgba('#FFFFFF', 150)).toBe('rgb(255 255 255 / 1)');
		expect(rgba('#FFFFFF', -20)).toBe('rgb(255 255 255 / 0)');
	});
});
