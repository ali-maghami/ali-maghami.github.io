import { getUploadedDimensions } from './portfolio-data';

/**
 * Intrinsic sizes for uploaded media, so a body embed can reserve its space
 * before it loads.
 *
 * The markdown pipeline is built once and its plugins run synchronously, so
 * there is nowhere to await a query inside them. Rather than rebuild the
 * processor per render, or thread per-request state through a shared plugin —
 * which two concurrent requests would interleave — the sizes are loaded into
 * this cache before rendering starts and read from it synchronously during.
 *
 * Caching without expiry is correct here rather than merely convenient: an
 * upload is immutable. The path contains a UUID minted at upload, and nothing
 * ever rewrites the file behind it, so a size that was right once stays right.
 */
export interface Dimensions {
	width: number;
	height: number;
}

const cache = new Map<string, Dimensions | null>();

/** Every upload path mentioned in a body, in the shape the CMS mints. */
const UPLOAD_PATH = /\/uploads\/[0-9a-f-]{36}\.(?:gif|jpe?g|png|webp|mp4|webm|pdf)/gi;

export function uploadPathsIn(markdown: string): string[] {
	UPLOAD_PATH.lastIndex = 0;
	return [...new Set([...markdown.matchAll(UPLOAD_PATH)].map((match) => match[0]))];
}

/**
 * Loads any sizes not already known, in one query.
 *
 * A path with no dimensions recorded is cached as null: older uploads predate
 * the column being written, and asking again on every render would not change
 * the answer.
 */
export async function primeDimensions(paths: string[]): Promise<void> {
	const missing = paths.filter((path) => !cache.has(path));
	if (!missing.length) return;

	const found = await getUploadedDimensions(missing);
	for (const path of missing) {
		cache.set(path, found.get(path) ?? null);
	}
}

/** The size of an upload, if it is known. Synchronous by design. */
export function dimensionsFor(src: string): Dimensions | null {
	return cache.get(src.split(/[?#]/)[0]) ?? null;
}
