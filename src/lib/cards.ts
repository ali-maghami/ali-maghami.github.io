import { rgba } from './portrait';

/**
 * The wash on a project card.
 *
 * Two overlapping radial gradients, both anchored just off the top right
 * corner. The first is wide and shallow and sits on top; the second is
 * narrower and taller and shows through where the first has faded, so the two
 * colours blend into a third where they overlap rather than meeting at an
 * edge. The geometry is fixed — only the colours come from the CMS.
 *
 * Composed here rather than interpolated into the template, for the same
 * reason the portrait colours are: this lands in a style attribute, so an
 * unparseable value has to become nothing rather than reach the page as CSS.
 * `rgba` already returns `transparent` for anything that is not six hex digits.
 */
export function cardGradient(from: string, to = ''): string {
	const start = rgba(from, 100);
	if (start === 'transparent') return 'none';

	// A second colour that cannot be parsed is treated as absent rather than
	// layered as a transparent gradient, which would do nothing.
	const parsed = to ? rgba(to, 100) : '';
	const second = parsed === 'transparent' ? '' : parsed;

	const top = `radial-gradient(174% 71% at 106% 6%, ${start} 0%, transparent 70%)`;
	if (!second) return top;

	// Listed second, so it paints beneath the first and reads through it.
	const under = `radial-gradient(63% 90% at 95% 10%, ${second} 6%, transparent 60%)`;
	return `${top}, ${under}`;
}
