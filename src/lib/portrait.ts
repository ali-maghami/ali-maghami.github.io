/**
 * The CSS each portrait filter option maps to.
 *
 * A fixed map rather than a free-text field: these values go straight into a
 * style attribute, so letting the CMS supply arbitrary CSS would hand the page
 * to whatever gets typed into the editor. The names are what the CMS shows.
 */
const FILTERS: Record<string, string> = {
	grayscale: 'grayscale(1)',
	// Most of the colour drained, a little left, so it still reads as a photo.
	'soft-grayscale': 'grayscale(0.55)',
	sepia: 'sepia(0.55)',
	contrast: 'grayscale(1) contrast(1.15)',
	none: 'none',
};

export interface PortraitStyle {
	size: number;
	borderWidth: number;
	opacity: number;
	filter: string;
	background: string;
	backgroundOpacity: number;
}

/**
 * Turns a #RRGGBB colour and a percentage into a CSS colour.
 *
 * Composed here rather than letting the value through as written, because it
 * lands in a style attribute — a malformed or hostile string would otherwise be
 * CSS. Anything that is not six hex digits falls back to transparent, which
 * shows nothing rather than something unintended.
 */
export function rgba(hex: string, opacityPercent: number): string {
	const match = /^#([0-9a-f]{6})$/i.exec(hex.trim());
	if (!match) return 'transparent';

	const [r, g, b] = [0, 2, 4].map((i) => Number.parseInt(match[1].slice(i, i + 2), 16));
	const alpha = Math.min(100, Math.max(0, opacityPercent)) / 100;
	return `rgb(${r} ${g} ${b} / ${alpha})`;
}

/**
 * Turns the CMS values into the custom properties the hero styles read.
 *
 * Returned as a string for the `style` attribute. Opacity is stored as a
 * percentage because that is what reads sensibly in an editor, and converted
 * here rather than asking anyone to type 0.8.
 */
export function portraitStyle({
	size,
	borderWidth,
	opacity,
	filter,
	background,
	backgroundOpacity,
}: PortraitStyle): string {
	return [
		`--portrait-size:${size}px`,
		`--portrait-border:${borderWidth}px`,
		`--portrait-opacity:${opacity / 100}`,
		`--portrait-filter:${FILTERS[filter] ?? FILTERS.grayscale}`,
		`--portrait-bg:${rgba(background, backgroundOpacity)}`,
	].join(';');
}
