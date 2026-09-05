import { sectionForPath } from './nav';

/**
 * Background palettes, one per section of the site.
 *
 * These used to be picked at random on every page load, the trick
 * githubnext.com uses to make a site feel alive. Here it meant the brand
 * surface changed between two visits, and between two tabs of the same site.
 * Each section now owns a palette: the projects pages are always the lagoon,
 * the posts always the dusk, so a reader learns where they are from the
 * colour, and the palette is set on the server rather than by a script that
 * had to run before first paint.
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

/** Which palette each section owns. */
export const SECTION_PALETTES: Record<string, string> = {
	home: 'bloom',
	blog: 'dusk',
	projects: 'lagoon',
	papers: 'meadow',
	about: 'citrus',
	certificates: 'coral',
};

/**
 * The palette for a URL: the one its section owns, or for a section not
 * listed — a new route, the 404 page — one chosen from the section name, so
 * it is still the same on every visit.
 */
export function paletteForPath(pathname: string): Palette {
	const section = sectionForPath(pathname);
	const named = SECTION_PALETTES[section];
	const found = named && PALETTES.find((palette) => palette.name === named);
	if (found) return found;

	let hash = 0;
	for (const char of section) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
	return PALETTES[hash % PALETTES.length];
}
