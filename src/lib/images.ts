import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import sharp from 'sharp';

import { MEDIA_PREFIXES } from './badges';

/*
 * Sized copies of the images in public/.
 *
 * The CMS stores a path to a file in public/, and the site used to hand that
 * path straight to every <img>. The portrait is the clear case: one 80 KB PNG
 * served as the hero and again as every 44px and 52px avatar on the page — ten
 * times on the projects index. Nothing in public/ is processed at build time,
 * because the CMS has to be able to preview the path it saved.
 *
 * So the resizing happens on request instead. A component asks for the image
 * at one of a few fixed widths and gets a URL under /img/ that the endpoint in
 * src/pages/img answers with a WebP rendered by sharp. The URL carries a short
 * hash of the source file, so it can be cached for a year: a later deploy that
 * changes the file changes the URL too, and an old URL is redirected to the
 * new one rather than serving stale bytes.
 *
 * public/ is baked into the image, so everything here is cached without expiry.
 */

/** The widths a component may ask for. Each is a 2× version of a display size. */
export const IMAGE_WIDTHS = [88, 104, 320, 640, 1280] as const;
export type ImageWidth = (typeof IMAGE_WIDTHS)[number];

/** What sharp will be asked to resize. Video and SVG pass through untouched. */
const RESIZABLE = /\.(?:png|jpe?g|webp)$/i;

/** A still to show before a video plays, if one was saved beside it. */
const POSTER_EXTENSIONS = ['.jpg', '.jpeg', '.webp', '.png'];

const PUBLIC_DIR = path.join(process.cwd(), 'public');

/**
 * The file a public path names, or undefined when there is none the site
 * would serve: only the folders the CMS may write to, and no way back up the
 * tree from them.
 */
export function publicFile(publicPath: string): string | undefined {
	if (!publicPath.startsWith('/') || publicPath.includes('..') || publicPath.includes('\0')) {
		return undefined;
	}
	if (!MEDIA_PREFIXES.some((prefix) => publicPath.startsWith(prefix))) return undefined;

	const file = path.join(PUBLIC_DIR, publicPath);
	return existsSync(file) ? file : undefined;
}

export function isResizable(publicPath: string): boolean {
	return RESIZABLE.test(publicPath) && publicFile(publicPath) !== undefined;
}

const versions = new Map<string, string>();

/** Eight hex characters of the file's content hash, for cache-safe URLs. */
export function imageVersion(publicPath: string): string | undefined {
	const file = publicFile(publicPath);
	if (!file) return undefined;

	let version = versions.get(publicPath);
	if (!version) {
		version = createHash('sha1').update(readFileSync(file)).digest('hex').slice(0, 8);
		versions.set(publicPath, version);
	}
	return version;
}

/**
 * The URL of `publicPath` rendered at most `width` pixels wide.
 *
 * Anything that cannot be resized — an upload, a video, a missing file — comes
 * back as the path it was given, so a caller never has to branch.
 */
export function resizedImage(publicPath: string | undefined, width: ImageWidth): string | undefined {
	if (!publicPath) return undefined;
	if (!isResizable(publicPath)) return publicPath;

	return `/img/${imageVersion(publicPath)}/${width}${encodeURI(publicPath)}`;
}

/**
 * The poster for a video: a still with the same name and an image extension,
 * saved in the same folder. `/hero/clip.mp4` looks for `/hero/clip.jpg`, then
 * `.jpeg`, `.webp` and `.png`.
 *
 * Without a poster a video paints nothing until enough of it has downloaded,
 * and a card that defers that download would sit blank. With one, the card
 * shows the first frame at once and fetches the clip only when it is in view.
 */
export function videoPoster(video: string | undefined): string | undefined {
	if (!video) return undefined;

	const extension = path.posix.extname(video);
	if (!extension) return undefined;

	const stem = video.slice(0, -extension.length);
	return POSTER_EXTENSIONS.map((candidate) => stem + candidate).find(
		(candidate) => publicFile(candidate) !== undefined,
	);
}

export interface Dimensions {
	width: number;
	height: number;
}

const sizes = new Map<string, Promise<Dimensions | undefined>>();

/**
 * The intrinsic size of an image in public/, so an <img> can carry width and
 * height and the browser can reserve its space before the bytes arrive.
 */
export function publicImageSize(publicPath: string | undefined): Promise<Dimensions | undefined> {
	if (!publicPath) return Promise.resolve(undefined);

	let pending = sizes.get(publicPath);
	if (!pending) {
		pending = measure(publicPath);
		sizes.set(publicPath, pending);
	}
	return pending;
}

async function measure(publicPath: string): Promise<Dimensions | undefined> {
	const file = publicFile(publicPath);
	if (!file || !RESIZABLE.test(publicPath)) return undefined;

	try {
		const meta = await sharp(file).metadata();
		if (!meta.width || !meta.height) return undefined;

		// A camera that stored the photo rotated says so in EXIF; the browser
		// honours it, so the layout size has the axes the other way round.
		const rotated = (meta.orientation ?? 1) >= 5;
		return rotated
			? { width: meta.height, height: meta.width }
			: { width: meta.width, height: meta.height };
	} catch {
		return undefined;
	}
}

const renders = new Map<string, Promise<Buffer>>();

/** The WebP bytes of `publicPath` at `width`, rendered once and kept. */
export function renderResized(publicPath: string, width: ImageWidth): Promise<Buffer> | undefined {
	const file = publicFile(publicPath);
	if (!file || !RESIZABLE.test(publicPath)) return undefined;

	const key = `${width}:${publicPath}`;
	let pending = renders.get(key);
	if (!pending) {
		pending = sharp(file)
			.rotate()
			.resize({ width, withoutEnlargement: true })
			.webp({ quality: 82 })
			.toBuffer();
		pending.catch(() => {
			renders.delete(key);
		});
		renders.set(key, pending);
	}
	return pending;
}
