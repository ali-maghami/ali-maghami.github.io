import { publicImageSize } from './images';
import { getUploadedDimensions } from './portfolio-data';

/**
 * Intrinsic sizes for body media, so an embed can reserve its space before it
 * loads.
 *
 * The markdown pipeline is built once and its plugins run synchronously, so
 * there is nowhere to await a query inside them. Rather than rebuild the
 * processor per render, or thread per-request state through a shared plugin —
 * which two concurrent requests would interleave — the sizes are loaded into
 * this cache before rendering starts and read from it synchronously during.
 *
 * Two kinds of file arrive here. Uploads have their size recorded in the
 * database by the CMS; files committed under public/ are measured once from
 * disk. Caching without expiry is correct for both: an upload's path contains
 * a UUID minted at upload and nothing ever rewrites the file behind it, and
 * public/ is baked into the image and cannot change while it runs.
 */
export interface Dimensions {
	width: number;
	height: number;
}

const cache = new Map<string, Dimensions | null>();

/** Every upload path mentioned in a body, in the shape the CMS mints. */
const UPLOAD_PATH = /\/uploads\/[0-9a-f-]{36}\.(?:gif|jpe?g|png|webp|mp4|webm|pdf)/gi;

/** Every image in public/ a body embeds, in the folders the CMS may name. */
const PUBLIC_IMAGE_PATH = /\/(?:media|hero|badges|portrait)\/[^\s()"'<>]+?\.(?:png|jpe?g|webp)(?=[\s)"'<>]|$)/gi;

export function uploadPathsIn(markdown: string): string[] {
	UPLOAD_PATH.lastIndex = 0;
	return [...new Set([...markdown.matchAll(UPLOAD_PATH)].map((match) => match[0]))];
}

export function publicImagePathsIn(markdown: string): string[] {
	PUBLIC_IMAGE_PATH.lastIndex = 0;
	return [...new Set([...markdown.matchAll(PUBLIC_IMAGE_PATH)].map((match) => match[0]))];
}

/**
 * Loads any sizes not already known: uploads in one query, public files from
 * disk.
 *
 * A path with no dimensions is cached as null: older uploads predate the
 * column being written, and asking again on every render would not change
 * the answer.
 */
export async function primeDimensions(paths: string[]): Promise<void> {
	const missing = paths.filter((path) => !cache.has(path));
	if (!missing.length) return;

	const uploads = missing.filter((path) => path.startsWith('/uploads/'));
	const committed = missing.filter((path) => !path.startsWith('/uploads/'));

	const [recorded, measured] = await Promise.all([
		uploads.length ? getUploadedDimensions(uploads) : new Map<string, Dimensions>(),
		Promise.all(committed.map(async (path) => [path, await publicImageSize(path)] as const)),
	]);

	for (const path of uploads) {
		cache.set(path, recorded.get(path) ?? null);
	}
	for (const [path, size] of measured) {
		cache.set(path, size ?? null);
	}
}

/** The size of a body image, if it is known. Synchronous by design. */
export function dimensionsFor(src: string): Dimensions | null {
	return cache.get(src.split(/[?#]/)[0]) ?? null;
}
