import { describe, expect, it } from 'vitest';
import { cardGradient } from './cards';

describe('cardGradient', () => {
	it('fades a single colour out from the top right', () => {
		expect(cardGradient('#BFE3E0')).toBe(
			'radial-gradient(174% 71% at 106% 6%, rgb(191 227 224 / 1) 0%, transparent 70%)',
		);
	});

	it('layers the second colour beneath the first, at its own geometry', () => {
		// The exact figures are the point here — they are a chosen look rather
		// than something derived, so a change to either should be deliberate.
		expect(cardGradient('#4F95CF', '#C066C2')).toBe(
			'radial-gradient(174% 71% at 106% 6%, rgb(79 149 207 / 1) 0%, transparent 70%), ' +
				'radial-gradient(63% 90% at 95% 10%, rgb(192 102 194 / 1) 6%, transparent 60%)',
		);
	});

	it('paints the first colour over the second', () => {
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
