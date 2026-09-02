import { describe, expect, it } from 'vitest';
import { PALETTES, pickPaletteIndex } from './palettes';

describe('PALETTES', () => {
	it('are all valid six-digit hex colours', () => {
		const hex = /^#[0-9a-f]{6}$/;
		for (const palette of PALETTES) {
			expect(palette.surface, palette.name).toMatch(hex);
			for (const accent of palette.accents) {
				expect(accent, palette.name).toMatch(hex);
			}
		}
	});

	it('have unique names', () => {
		expect(new Set(PALETTES.map((p) => p.name)).size).toBe(PALETTES.length);
	});

	it('keep every surface light enough for the ink to read on', () => {
		// Rough perceived luminance. --color-ink is #303026, so anything below
		// about 0.8 here would start to hurt body-text contrast.
		for (const { name, surface } of PALETTES) {
			const [r, g, b] = [1, 3, 5].map((i) => parseInt(surface.slice(i, i + 2), 16) / 255);
			expect((0.299 * r + 0.587 * g + 0.114 * b), name).toBeGreaterThan(0.85);
		}
	});
});

describe('pickPaletteIndex', () => {
	it('never repeats the previous palette, so a refresh always changes', () => {
		for (let previous = 0; previous < PALETTES.length; previous += 1) {
			for (const r of [0, 0.2, 0.5, 0.75, 0.999]) {
				const next = pickPaletteIndex(PALETTES.length, previous, () => r);
				expect(next).not.toBe(previous);
				expect(next).toBeGreaterThanOrEqual(0);
				expect(next).toBeLessThan(PALETTES.length);
			}
		}
	});

	it('can reach every alternative', () => {
		const seen = new Set<number>();
		for (let i = 0; i < 200; i += 1) {
			seen.add(pickPaletteIndex(PALETTES.length, 2, () => i / 200));
		}
		expect(seen.size).toBe(PALETTES.length - 1);
		expect(seen.has(2)).toBe(false);
	});

	it('allows any index when there is no previous', () => {
		expect(pickPaletteIndex(PALETTES.length, null, () => 0)).toBe(0);
		expect(pickPaletteIndex(PALETTES.length, null, () => 0.999)).toBe(PALETTES.length - 1);
	});

	it('handles degenerate counts without looping', () => {
		expect(pickPaletteIndex(1, 0)).toBe(0);
		expect(pickPaletteIndex(0, null)).toBe(0);
	});

	it('ignores an out-of-range previous index', () => {
		expect(pickPaletteIndex(PALETTES.length, 99, () => 0)).toBe(0);
	});
});
