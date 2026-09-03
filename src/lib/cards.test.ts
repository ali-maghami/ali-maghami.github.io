import { describe, expect, it } from 'vitest';
import { cardGradient } from './cards';

describe('cardGradient', () => {
	it('fades a single colour out from the top right', () => {
		expect(cardGradient('#BFE3E0')).toBe(
			'radial-gradient(135% 135% at 100% 0%, rgb(191 227 224 / 1) 0%, transparent 72%)',
		);
	});

	it('passes through a second colour when one is given', () => {
		const css = cardGradient('#7DD3FC', '#DCEFC8');
		expect(css).toContain('rgb(125 211 252 / 1) 0%');
		expect(css).toContain('rgb(220 239 200 / 1) 45%');
		expect(css).toContain('transparent 85%');
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
