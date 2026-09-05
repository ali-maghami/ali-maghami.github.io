import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { PALETTES, SECTION_PALETTES, paletteForPath } from './palettes';

const HEX = /^#[0-9a-f]{6}$/;

/** Rough perceived luminance of a six-digit hex colour, 0 to 1. */
function luminance(hex: string): number {
	const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
	return 0.299 * r + 0.587 * g + 0.114 * b;
}

describe('PALETTES', () => {
	it('are all valid six-digit hex colours', () => {
		for (const palette of PALETTES) {
			expect(palette.surface, palette.name).toMatch(HEX);
			expect(palette.surfaceDark, palette.name).toMatch(HEX);
			for (const accent of palette.accents) {
				expect(accent, palette.name).toMatch(HEX);
			}
		}
	});

	it('have unique names', () => {
		expect(new Set(PALETTES.map((p) => p.name)).size).toBe(PALETTES.length);
	});

	it('keep every light surface light enough for the ink to read on', () => {
		// --color-ink is #24292e, so anything below about 0.8 here would start
		// to hurt body-text contrast.
		for (const { name, surface } of PALETTES) {
			expect(luminance(surface), name).toBeGreaterThan(0.85);
		}
	});

	it('keep every dark surface dark enough for the light ink to read on', () => {
		for (const { name, surfaceDark } of PALETTES) {
			expect(luminance(surfaceDark), name).toBeLessThan(0.15);
		}
	});
});

describe('paletteForPath', () => {
	it('gives every section a palette that exists', () => {
		for (const [section, name] of Object.entries(SECTION_PALETTES)) {
			expect(PALETTES.some((p) => p.name === name), section).toBe(true);
		}
	});

	it('gives a section the same palette on every page of it', () => {
		expect(paletteForPath('/blog/').name).toBe('dusk');
		expect(paletteForPath('/blog/some-post/').name).toBe('dusk');
		expect(paletteForPath('/projects/coilsense/').name).toBe(paletteForPath('/projects/').name);
	});

	it('gives different sections different palettes', () => {
		const names = ['/', '/blog/', '/projects/', '/papers/', '/about/', '/certificates/'].map(
			(p) => paletteForPath(p).name,
		);
		expect(new Set(names).size).toBe(names.length);
	});

	it('is stable for a section it has never heard of', () => {
		expect(paletteForPath('/nothing-here/')).toBe(paletteForPath('/nothing-here/'));
		expect(PALETTES).toContain(paletteForPath('/nothing-here/'));
	});
});

/*
 * The stylesheet cannot import this module, so it carries the values again
 * under [data-palette] selectors. This is what keeps that copy honest.
 */
describe('the stylesheet', () => {
	const css = readFileSync(path.join(process.cwd(), 'src', 'styles', 'global.css'), 'utf8');

	it('defines every palette, light and dark, with the same values as PALETTES', () => {
		for (const palette of PALETTES) {
			const selector = `[data-palette='${palette.name}']`;
			const blocks = [...css.matchAll(new RegExp(`\\[data-palette='${palette.name}'\\]\\s*\\{([^}]*)\\}`, 'g'))].map(
				(m) => m[1],
			);
			expect(blocks.length, `${selector} appears twice: light and dark`).toBe(2);

			const [light, dark] = blocks;
			expect(light, selector).toContain(`--surface: ${palette.surface};`);
			palette.accents.forEach((accent, i) => {
				expect(light, selector).toContain(`--accent-${i + 1}: ${accent};`);
			});
			expect(dark, `${selector} dark`).toContain(`--surface: ${palette.surfaceDark};`);
		}
	});
});
