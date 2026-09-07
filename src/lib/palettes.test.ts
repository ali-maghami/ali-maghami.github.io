import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';

import { runWithRequestCache } from './request-cache';
import {
	PALETTES,
	nextPalette,
	paletteForRequest,
	pickPaletteIndex,
	resetPaletteRotation,
} from './palettes';

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

	it('offer more than one, or nothing could change on a refresh', () => {
		expect(PALETTES.length).toBeGreaterThan(1);
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

describe('pickPaletteIndex', () => {
	it('never repeats the previous palette, so a refresh always changes', () => {
		for (let previous = 0; previous < 6; previous += 1) {
			for (const roll of [0, 0.2, 0.5, 0.99]) {
				const picked = pickPaletteIndex(6, previous, () => roll);
				expect(picked, `previous ${previous}, roll ${roll}`).not.toBe(previous);
				expect(picked).toBeGreaterThanOrEqual(0);
				expect(picked).toBeLessThan(6);
			}
		}
	});

	it('can pick anything when there is no previous, or it is out of range', () => {
		expect(pickPaletteIndex(6, null, () => 0)).toBe(0);
		expect(pickPaletteIndex(6, null, () => 0.99)).toBe(5);
		expect(pickPaletteIndex(6, 99, () => 0)).toBe(0);
		expect(pickPaletteIndex(6, -1, () => 0)).toBe(0);
	});

	it('reaches every alternative rather than favouring one', () => {
		const seen = new Set([0, 0.25, 0.5, 0.75, 0.99].map((roll) => pickPaletteIndex(6, 2, () => roll)));
		expect(seen.size).toBeGreaterThan(3);
		expect(seen.has(2)).toBe(false);
	});

	it('has nowhere else to go with a single palette', () => {
		expect(pickPaletteIndex(1, 0, () => 0.5)).toBe(0);
	});
});

describe('nextPalette', () => {
	beforeEach(resetPaletteRotation);

	it('gives a different palette every time it is asked', () => {
		let previous = nextPalette().name;
		for (let i = 0; i < 20; i += 1) {
			const current = nextPalette().name;
			expect(current).not.toBe(previous);
			previous = current;
		}
	});

	it('serves palettes from the set, and gets around all of them', () => {
		const seen = new Set(Array.from({ length: 60 }, () => nextPalette().name));
		expect(seen.size).toBe(PALETTES.length);
		for (const name of seen) expect(PALETTES.some((p) => p.name === name)).toBe(true);
	});
});

describe('paletteForRequest', () => {
	beforeEach(resetPaletteRotation);

	it('gives one palette to everything rendered in the same request', async () => {
		// The head writes theme-color and the page element writes data-palette;
		// two different colours would show in the browser chrome and the page.
		const [head, body] = await runWithRequestCache(() =>
			Promise.all([paletteForRequest(), paletteForRequest()]),
		);
		expect(head).toBe(body);
	});

	it('gives the next request a different one', async () => {
		const first = await runWithRequestCache(() => paletteForRequest());
		const second = await runWithRequestCache(() => paletteForRequest());
		expect(second.name).not.toBe(first.name);
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

/*
 * The palette changes on every load, so text has to stay readable on all of
 * them, not just on the one that happened to render. The link colour was
 * shipped at 3.89:1 against the brightest surface and a weekly Lighthouse
 * audit caught it; this is the guard that would have caught it first.
 */
describe('text contrast against every surface', () => {
	const css = readFileSync(path.join(process.cwd(), 'src', 'styles', 'global.css'), 'utf8');

	/** The value of a custom property, from the light block or the dark one. */
	function token(name: string, scheme: 'light' | 'dark'): string {
		const all = [...css.matchAll(new RegExp(`--${name}:[ \t]*(#[0-9a-fA-F]{6})`, 'g'))].map((m) => m[1]);
		const value = scheme === 'light' ? all[0] : all[all.length - 1];
		expect(value, `--${name} (${scheme})`).toMatch(HEX);
		return value.toLowerCase();
	}

	const channel = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
	const relative = (hex: string) => {
		const [r, g, b] = [1, 3, 5].map((i) => channel(parseInt(hex.slice(i, i + 2), 16) / 255));
		return 0.2126 * r + 0.7152 * g + 0.0722 * b;
	};
	const contrast = (a: string, b: string) => {
		const [high, low] = [relative(a), relative(b)].sort((x, y) => y - x);
		return (high + 0.05) / (low + 0.05);
	};

	/* Everything below is set at 17px or smaller, so WCAG AA asks for 4.5:1. */
	const foregrounds = ['color-ink', 'color-ink-soft', 'color-ink-muted', 'color-lavender', 'color-lavender-deep'];

	for (const scheme of ['light', 'dark'] as const) {
		it(`keeps every text colour above 4.5:1 in the ${scheme} scheme`, () => {
			const surfaces = [
				token('color-paper', scheme),
				token('color-base', scheme),
				...PALETTES.map((p) => (scheme === 'light' ? p.surface : p.surfaceDark)),
			];

			for (const name of foregrounds) {
				const colour = token(name, scheme);
				for (const surface of surfaces) {
					const ratio = contrast(colour, surface);
					expect(ratio, `${name} on ${surface} (${scheme})`).toBeGreaterThanOrEqual(4.5);
				}
			}
		});
	}
});
