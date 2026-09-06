import { cached } from './request-cache';

/**
 * Background palettes, one picked afresh on every page load — the trick
 * githubnext.com uses to make a site feel alive without animating anything.
 *
 * Picked on the server rather than by a script in the head. The script this
 * replaces had to run before first paint or the page visibly repainted, and
 * it could not be hashed into the content security policy. Rendering the
 * choice into the HTML costs nothing, cannot flash, and needs no JavaScript
 * at all.
 *
 * The set is curated rather than random hues. The type is near-black warm ink
 * on a light ground, so every light `surface` sits in the same narrow
 * lightness band as the default paper tone; every dark surface is a tint of
 * the same hue on the dark base. The accents are drawn from the theme.
 *
 * The stylesheet carries the same values under `[data-palette]` selectors;
 * palettes.test.ts keeps the two in step.
 */
export interface Palette {
	/** Stable identifier; the value of `data-palette` on <html>. */
	name: string;
	/** Page background in light mode. Must stay light enough for --color-ink. */
	surface: string;
	/** Page background in dark mode: the same hue over the dark base. */
	surfaceDark: string;
	/** The four blurred blobs behind the hero, in painting order. */
	accents: [string, string, string, string];
}

export const PALETTES: Palette[] = [
	{
		name: 'bloom',
		surface: '#fdf7fb',
		surfaceDark: '#191219',
		accents: ['#f2a0d0', '#b795f0', '#8fb8f5', '#f9c9e4'],
	},
	{
		name: 'dusk',
		surface: '#faf6fd',
		surfaceDark: '#16131d',
		accents: ['#c0abfd', '#f0a6fb', '#9fb0fc', '#fbc8e8'],
	},
	{
		name: 'lagoon',
		surface: '#f2fbfd',
		surfaceDark: '#0f171b',
		accents: ['#6ecbfb', '#5fe3f2', '#9db0fb', '#8ef0dd'],
	},
	{
		name: 'meadow',
		surface: '#f5fcf4',
		surfaceDark: '#111a14',
		accents: ['#79e9a4', '#b8ee5f', '#6ecbfb', '#fbe07a'],
	},
	{
		name: 'citrus',
		surface: '#fffaf2',
		surfaceDark: '#1a1610',
		accents: ['#fcb265', '#fb9d9d', '#fbcf47', '#fb9fb0'],
	},
	{
		name: 'coral',
		surface: '#fff6f5',
		surfaceDark: '#1a1213',
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

/*
 * The last palette this process served, so the next request gets a different
 * one. The browser used to remember this per visitor in sessionStorage; the
 * server can only remember what it sent last, which comes to the same thing
 * for one reader refreshing, and still guarantees that no two consecutive
 * renders share a palette.
 */
let lastServed: number | null = null;

/** The next palette in the rotation. Advances the state; see `paletteForRequest`. */
export function nextPalette(random: () => number = Math.random): Palette {
	lastServed = pickPaletteIndex(PALETTES.length, lastServed, random);
	return PALETTES[lastServed];
}

/**
 * The palette for the page being rendered.
 *
 * Cached per request, because the head and the page element both ask for it
 * and a page whose `theme-color` disagreed with its own background would show
 * one colour in the browser chrome and another below it.
 */
export function paletteForRequest(): Promise<Palette> {
	return cached('palette', async () => nextPalette());
}

/** Forgets the rotation, so a test can start from a known state. */
export function resetPaletteRotation(): void {
	lastServed = null;
}
