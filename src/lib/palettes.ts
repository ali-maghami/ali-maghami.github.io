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
		name: 'paper',
		surface: '#f6f7ee',
		accents: ['#c4d7d9', '#fdc987', '#dedfbd', '#d78a67'],
	},
	{
		name: 'mist',
		surface: '#eef3f7',
		accents: ['#c4d7d9', '#b4bdcb', '#dedfbd', '#60a0b3'],
	},
	{
		name: 'blush',
		surface: '#faf1ee',
		accents: ['#d78a67', '#fdc987', '#dedfbd', '#ce6d53'],
	},
	{
		name: 'lilac',
		surface: '#f2f1f9',
		accents: ['#b4bdcb', '#c4d7d9', '#dedfbd', '#6b73d1'],
	},
	{
		name: 'sage',
		surface: '#eff5ef',
		accents: ['#dedfbd', '#c4d7d9', '#fdc987', '#60a0b3'],
	},
	{
		name: 'sand',
		surface: '#f8f4e8',
		accents: ['#fdc987', '#d78a67', '#dedfbd', '#c4d7d9'],
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
