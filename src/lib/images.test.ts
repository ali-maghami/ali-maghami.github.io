import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
	imageVersion,
	isResizable,
	publicFile,
	publicImageSize,
	renderResized,
	resizedImage,
	videoPoster,
} from './images';

// Real files committed under public/, so these run against what ships.
const BADGE = '/badges/aws-certified-solutions-architect-associate.png';
const CLIP = '/hero/ai-observability-animated.mp4';

describe('publicFile', () => {
	it('finds a file in a folder the CMS may name', () => {
		expect(publicFile(BADGE)).toMatch(/aws-certified-solutions-architect-associate\.png$/);
	});

	it('refuses anything outside those folders', () => {
		expect(publicFile('/favicon.svg')).toBeUndefined();
		expect(publicFile('/og/default.jpg')).toBeUndefined();
		expect(publicFile('badges/x.png')).toBeUndefined();
	});

	it('refuses a path that climbs out of public/', () => {
		expect(publicFile('/badges/../../package.json')).toBeUndefined();
		expect(publicFile('/media/..%2F..%2Fpackage.json')).toBeUndefined();
	});

	it('is undefined for a file that is not there', () => {
		expect(publicFile('/badges/nope.png')).toBeUndefined();
	});
});

describe('resizedImage', () => {
	it('points a resizable image at the endpoint, versioned by its content', () => {
		const version = imageVersion(BADGE);
		expect(version).toMatch(/^[0-9a-f]{8}$/);
		expect(resizedImage(BADGE, 104)).toBe(`/img/${version}/104${BADGE}`);
	});

	it('percent-encodes a path with spaces so the attribute is a valid URL', () => {
		const spaced = '/portrait/Untitled - September 02, 2026 at 19.02.02.png';
		if (!isResizable(spaced)) return; // the portrait is CMS content and may be replaced

		expect(resizedImage(spaced, 320)).toBe(
			`/img/${imageVersion(spaced)}/320/portrait/Untitled%20-%20September%2002,%202026%20at%2019.02.02.png`,
		);
	});

	it('hands back what it cannot resize, so a caller never branches', () => {
		expect(resizedImage(CLIP, 320)).toBe(CLIP);
		expect(resizedImage('/uploads/123e4567-e89b-12d3-a456-426614174000.webp', 88)).toBe(
			'/uploads/123e4567-e89b-12d3-a456-426614174000.webp',
		);
		expect(resizedImage('/badges/missing.png', 88)).toBe('/badges/missing.png');
		expect(resizedImage(undefined, 88)).toBeUndefined();
	});

	it('gives the same version for the same bytes', () => {
		expect(imageVersion(BADGE)).toBe(imageVersion(BADGE));
	});
});

describe('videoPoster', () => {
	it('finds the still saved beside a clip', () => {
		expect(videoPoster(CLIP)).toBe('/hero/ai-observability-animated.jpg');
	});

	it('has none for a clip without one, or for no clip at all', () => {
		expect(videoPoster('/media/reflective-surface-vision-animation.mp4')).toBeUndefined();
		expect(videoPoster('/hero/noext')).toBeUndefined();
		expect(videoPoster(undefined)).toBeUndefined();
	});
});

describe('publicImageSize', () => {
	it('measures a committed image', async () => {
		// Badges are kept at 250px, twice their display size (see badges.ts).
		await expect(publicImageSize(BADGE)).resolves.toEqual({ width: 250, height: 250 });
	});

	it('has no size for a video, a missing file, or nothing', async () => {
		await expect(publicImageSize(CLIP)).resolves.toBeUndefined();
		await expect(publicImageSize('/badges/missing.png')).resolves.toBeUndefined();
		await expect(publicImageSize(undefined)).resolves.toBeUndefined();
	});
});

describe('renderResized', () => {
	it('renders a WebP no wider than asked and never enlarges', async () => {
		const small = await renderResized(BADGE, 104);
		const large = await renderResized(BADGE, 1280);
		expect(small).toBeInstanceOf(Buffer);
		expect(large).toBeInstanceOf(Buffer);

		const { default: sharp } = await import('sharp');
		await expect(sharp(small).metadata()).resolves.toMatchObject({ format: 'webp', width: 104 });
		// The source is 250px, so 1280 stays at 250 rather than being blown up.
		await expect(sharp(large).metadata()).resolves.toMatchObject({ format: 'webp', width: 250 });
	});

	it('refuses what is not a resizable public image', () => {
		expect(renderResized(CLIP, 320)).toBeUndefined();
		expect(renderResized('/badges/../package.json', 320)).toBeUndefined();
	});
});

/*
 * The card a share shows when a page has no image of its own. BaseHead names
 * it by path and declares its size, so both have to hold.
 */
describe('the share card', () => {
	it('is committed at the size the metadata declares', async () => {
		const { default: sharp } = await import('sharp');
		await expect(sharp('public/og/default.jpg').metadata()).resolves.toMatchObject({
			format: 'jpeg',
			width: 1200,
			height: 630,
		});
	});
});

/*
 * The icons and the manifest are built by scripts/build-icons.mjs and
 * committed. Nothing at build time regenerates them, so these check that what
 * is in the repository is what the head and the manifest promise.
 */
describe('the brand icons', () => {
	const sizes: Array<[string, number, number]> = [
		['public/apple-touch-icon.png', 180, 180],
		['public/icon-192.png', 192, 192],
		['public/icon-512.png', 512, 512],
		['public/icon-maskable-512.png', 512, 512],
	];

	it.each(sizes)('%s is committed at %ix%i', async (file, width, height) => {
		const { default: sharp } = await import('sharp');
		await expect(sharp(file).metadata()).resolves.toMatchObject({ format: 'png', width, height });
	});

	it('ships an icon iOS can use, with no transparency to composite onto black', async () => {
		const { default: sharp } = await import('sharp');
		const { channels, hasAlpha } = await sharp('public/apple-touch-icon.png').metadata();
		const opaque = await sharp('public/apple-touch-icon.png').stats();
		expect(channels).toBeGreaterThanOrEqual(3);
		// Whatever the channel count, every pixel has to be fully opaque.
		if (hasAlpha) expect(opaque.channels[3].min).toBe(255);
	});

	it('has an .ico holding the small sizes, as a real icon container', () => {
		const bytes = readFileSync('public/favicon.ico');
		// ICONDIR: reserved 0, type 1 (icon), then the count.
		expect(bytes.readUInt16LE(0)).toBe(0);
		expect(bytes.readUInt16LE(2)).toBe(1);
		const count = bytes.readUInt16LE(4);
		expect(count).toBeGreaterThanOrEqual(3);

		const declared = Array.from({ length: count }, (_, i) => bytes.readUInt8(6 + i * 16));
		expect(declared).toEqual([16, 32, 48]);
	});

	it('has an SVG favicon on a square viewBox, so it cannot render stretched', () => {
		const svg = readFileSync('public/favicon.svg', 'utf8');
		const box = svg.match(/viewBox="([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+)"/);
		expect(box, 'favicon.svg declares a viewBox').not.toBeNull();
		const [, , , w, h] = box!.map(Number);
		expect(w).toBeCloseTo(h, 1);
		expect(svg).toContain('<path');
	});

	it('has a manifest whose icons all exist at the sizes it claims', async () => {
		const { default: sharp } = await import('sharp');
		const manifest = JSON.parse(readFileSync('public/site.webmanifest', 'utf8'));

		expect(manifest.name).toMatch(/\w/);
		expect(manifest.start_url).toBe('/');
		expect(manifest.icons.length).toBeGreaterThan(0);
		// A launcher crops a maskable icon; without one it crops the plain icon.
		expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true);

		for (const icon of manifest.icons) {
			const [width, height] = icon.sizes.split('x').map(Number);
			await expect(sharp(`public${icon.src}`).metadata(), icon.src).resolves.toMatchObject({
				width,
				height,
			});
		}
	});

	it('is linked from the head, every file the browser is told about', () => {
		const head = readFileSync('src/components/BaseHead.astro', 'utf8');
		for (const href of ['/favicon.svg', '/favicon.ico', '/apple-touch-icon.png', '/site.webmanifest']) {
			expect(head, href).toContain(`href="${href}"`);
		}
	});
});
