import { describe, expect, it } from 'vitest';
import { cardGradient } from './cards';

describe('cardGradient', () => {
	it('fades a single colour out from the top right', () => {
		expect(cardGradient('#BFE3E0')).toBe(
			'radial-gradient(52% 48% at 100% 0%, rgb(191 227 224 / 1) 0%, transparent 62%)',
		);
	});

	it('shows the second colour as a band emerging from under the first', () => {
		// Two layers, not one blending through the other, and the outer one
		// starts its colour where the inner is already fading.
		const css = cardGradient('#7DD3FC', '#DCEFC8');
		expect(css.split('), radial-gradient')).toHaveLength(2);
		expect(css).toContain('rgb(125 211 252 / 1) 0%');
		expect(css).toContain('rgb(220 239 200 / 1) 30%');
	});

	it('keeps both pools clear of the lower left, where the title sits', () => {
		// Every stop is gone well before the far corner; a wash that reached it
		// would put the title and description on colour instead of on paper.
		const css = cardGradient('#7DD3FC', '#DCEFC8');
		for (const [, pct] of css.matchAll(/transparent (\d+)%/g)) {
			expect(Number(pct)).toBeLessThanOrEqual(70);
		}
		for (const [, w] of css.matchAll(/radial-gradient\((\d+)%/g)) {
			expect(Number(w)).toBeLessThan(80);
		}
	});

	it('paints the first colour over the second where they overlap', () => {
		const css = cardGradient('#7DD3FC', '#DCEFC8');
		expect(css.indexOf('125 211 252')).toBeLessThan(css.indexOf('220 239 200'));
	});

	it('treats an empty second colour as absent', () => {
		expect(cardGradient('#BFE3E0', '')).toBe(cardGradient('#BFE3E0'));
	});

	it('renders nothing rather than CSS it cannot parse', () => {
		// This reaches a style attribute, so a bad value must not pass through.
		for (const bad of ['red', '#FFF', 'url(x);color:red', '']) {
			expect(cardGradient(bad), bad).toBe('none');
		}
	});

	it('treats an unparseable second colour as absent, not as a dead stop', () => {
		// The card still gets its wash, and falls back to the single-colour
		// fade rather than carrying a transparent stop halfway through it.
		expect(cardGradient('#BFE3E0', 'nonsense')).toBe(cardGradient('#BFE3E0'));
	});
});
