/**
 * Background palettes, one picked at random on every page load — the trick
 * githubnext.com uses to make the site feel alive without animating anything.
 *
 * These are deliberately a curated set rather than random hues. The type is
 * near-black warm ink on a light ground, so an arbitrary colour would wreck
 * contrast; every `surface` here sits in the same narrow lightness band as the
 * default paper tone, and the accents are drawn from the existing theme.
 */
export interface Palette {
	/** Stable identifier, useful when debugging which one rendered. */
	name: string;
	/** Page background. Must stay light enough for --color-ink to read on. */
	surface: string;
	/** The four blurred blobs behind the hero, in painting order. */
	accents: [string, string, string, string];
}

export const PALETTES: Palette[] = [
	{
		name: 'bloom',
		surface: '#fdf7fb',
		accents: ['#f2a0d0', '#b795f0', '#8fb8f5', '#f9c9e4'],
	},
	{
		name: 'dusk',
		surface: '#faf6fd',
		accents: ['#c0abfd', '#f0a6fb', '#9fb0fc', '#fbc8e8'],
	},
	{
		name: 'lagoon',
		surface: '#f2fbfd',
		accents: ['#6ecbfb', '#5fe3f2', '#9db0fb', '#8ef0dd'],
	},
	{
		name: 'meadow',
		surface: '#f5fcf4',
		accents: ['#79e9a4', '#b8ee5f', '#6ecbfb', '#fbe07a'],
	},
	{
		name: 'citrus',
		surface: '#fffaf2',
		accents: ['#fcb265', '#fb9d9d', '#fbcf47', '#fb9fb0'],
	},
	{
		name: 'coral',
		surface: '#fff6f5',
		accents: ['#fb9dab', '#fcb265', '#f79ad2', '#fdd0a4'],
	},
];

/**
 * Picks an index different from `previous`, so a refresh always visibly
 * changes something. With `previous` unset or unknown, any index may win.
 *
 * `random` is injected so the behaviour can be tested without stubbing globals.
 */
export function pickPaletteIndex(
	count: number,
	previous: number | null,
	random: () => number = Math.random,
): number {
	if (count <= 1) return 0;

	// Draw from the other n-1 slots, then shift past the excluded one. This
	// picks uniformly among the alternatives rather than re-rolling until it
	// differs, so it cannot loop.
	if (previous === null || previous < 0 || previous >= count) {
		return Math.floor(random() * count) % count;
	}

	const offset = Math.floor(random() * (count - 1)) % (count - 1);
	return offset >= previous ? offset + 1 : offset;
}
