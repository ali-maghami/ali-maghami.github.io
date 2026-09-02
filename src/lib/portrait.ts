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
}

/**
 * Turns the CMS values into the custom properties the hero styles read.
 *
 * Returned as a string for the `style` attribute. Opacity is stored as a
 * percentage because that is what reads sensibly in an editor, and converted
 * here rather than asking anyone to type 0.8.
 */
export function portraitStyle({ size, borderWidth, opacity, filter }: PortraitStyle): string {
	return [
		`--portrait-size:${size}px`,
		`--portrait-border:${borderWidth}px`,
		`--portrait-opacity:${opacity / 100}`,
		`--portrait-filter:${FILTERS[filter] ?? FILTERS.grayscale}`,
	].join(';');
}
