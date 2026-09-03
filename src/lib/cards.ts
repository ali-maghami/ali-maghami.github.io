import { rgba } from './portrait';

/**
 * The wash on a project card, fading out from its top right corner.
 *
 * Composed here rather than interpolated into the template, for the same
 * reason the portrait colours are: this lands in a style attribute, so an
 * unparseable value has to become nothing rather than reach the page as CSS.
 * `rgba` already returns `transparent` for anything that is not six hex digits.
 *
 * The second colour is optional. With one, the card fades from that colour to
 * nothing; with two, it passes through the second on the way, which is what
 * gives the cards their range without needing a gradient editor.
 */
export function cardGradient(from: string, to = ''): string {
	const start = rgba(from, 100);
	if (start === 'transparent') return 'none';

	// A second colour that cannot be parsed is treated as absent rather than
	// inserted as a transparent stop, which would leave a dead band mid-fade.
	const parsed = to ? rgba(to, 100) : '';
	const mid = parsed === 'transparent' ? '' : parsed;
	const stops = mid
		? `${start} 0%, ${mid} 45%, transparent 85%`
		: `${start} 0%, transparent 72%`;

	// Anchored at 100% 0% — the top right corner — and oversized so the falloff
	// crosses the whole card rather than ending inside it.
	return `radial-gradient(135% 135% at 100% 0%, ${stops})`;
}
