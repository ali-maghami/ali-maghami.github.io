import { rgba } from './portrait';

/**
 * The wash on a project card: a small pool of colour in its top right corner,
 * with a second hue emerging from beneath it and falling off quickly.
 *
 * Composed here rather than interpolated into the template, for the same
 * reason the portrait colours are: this lands in a style attribute, so an
 * unparseable value has to become nothing rather than reach the page as CSS.
 * `rgba` already returns `transparent` for anything that is not six hex digits.
 *
 * Kept small on purpose. A wash that reaches the lower left puts the title and
 * description on saturated colour instead of on paper, and two gradients of
 * similar size read as one symmetrical blur rather than as two colours. The
 * inner one is the tighter of the two and sits on top; the outer starts its
 * colour where the inner is already fading, so it appears as a band around it
 * rather than as a second wash of its own.
 */
export function cardGradient(from: string, to = ''): string {
	const start = rgba(from, 100);
	if (start === 'transparent') return 'none';

	// A second colour that cannot be parsed is treated as absent rather than
	// layered as a transparent gradient, which would do nothing.
	const parsed = to ? rgba(to, 100) : '';
	const second = parsed === 'transparent' ? '' : parsed;

	const inner = `radial-gradient(52% 48% at 100% 0%, ${start} 0%, transparent 62%)`;
	if (!second) return inner;

	// Listed second, so it paints beneath the inner pool. Its colour begins at
	// 30% — under the inner one — and is gone by 60%, which is the quick fade
	// out from behind rather than a wash spreading across the card.
	const outer = `radial-gradient(74% 66% at 100% 0%, ${second} 30%, transparent 60%)`;
	return `${inner}, ${outer}`;
}
