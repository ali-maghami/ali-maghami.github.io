import { existsSync } from 'node:fs';
import path from 'node:path';

/*
 * Badge artwork lives in public/ rather than src/assets, which costs Astro's
 * image optimisation but is the only way the CMS can preview it: files under
 * src/ are never served — Astro emits them under hashed /_astro/ names the CMS
 * cannot predict — so any preview URL pointing there 404s and the editor shows
 * a blank. public/ is served verbatim at the path the CMS records.
 *
 * The committed files are therefore what visitors download, so they are kept
 * at 250px (twice the 125px display size) rather than at whatever the issuer
 * happened to export.
 */
const PUBLIC_DIR = 'public';

/**
 * The prefixes a stored media path may use, each mapping to a folder in
 * public/. Anything else is a value the site cannot serve.
 */
export const MEDIA_PREFIXES = ['/media/', '/hero/', '/badges/', '/portrait/', '/pdf/'] as const;

/** Files in the shared upload volume, served by src/pages/uploads/[...path].ts. */
const UPLOAD_PATH = /^\/uploads\/[0-9a-f-]{36}\.(?:gif|jpe?g|png|webp|mp4|webm|pdf)$/i;

/*
 * public/ is baked into the image and cannot change while the container runs,
 * so a miss stays a miss and a hit stays a hit. Caching keeps this off the
 * filesystem on every render of every card.
 */
const existence = new Map<string, boolean>();

function servedFromPublic(value: string): boolean {
	const cached = existence.get(value);
	if (cached !== undefined) return cached;

	const onDisk = path.join(process.cwd(), PUBLIC_DIR, value);
	const found = existsSync(onDisk);
	existence.set(value, found);
	return found;
}

/**
 * Resolves a CMS-supplied media path, or returns undefined if the site cannot
 * serve it.
 *
 * This used to throw. That was right when the site was a static build: a bad
 * path failed the build, before anyone could see it. The site now renders per
 * request from the database, so throwing turned a typo saved in the CMS into a
 * 500 for every visitor — and the portrait alone is read by the home page, the
 * projects and blog indexes, and every project page.
 *
 * Omitting the image degrades the page instead. The warning is the record:
 * `docker logs portfolio` names the field and the value that was dropped.
 */
export function publicMedia(
	value: string | undefined,
	prefix: string,
	label: string,
): string | undefined {
	if (!value) return undefined;

	if (UPLOAD_PATH.test(value)) return value;

	if (!value.startsWith(prefix)) {
		console.warn(`[media] ${label} ignored: ${value} does not start with ${prefix} or /uploads/`);
		return undefined;
	}

	if (!servedFromPublic(value)) {
		console.warn(`[media] ${label} ignored: ${value} names no file in ${PUBLIC_DIR}`);
		return undefined;
	}

	return value;
}

/**
 * A project's hero image, in public/media.
 *
 * Every media path on the site is a public path now, so this is the same shape
 * as the rest rather than the one exception the build resolved differently.
 */
export function projectHero(image: string | undefined): string | undefined {
	return publicMedia(image, '/media/', 'Project hero image');
}

/** A certificate's issuer badge, in public/badges. */
export function badgeImage(badge: string | undefined): string | undefined {
	return publicMedia(badge, '/badges/', 'Badge image');
}

/** The home page portrait, in public/portrait. */
export function portraitImage(portrait: string | undefined): string | undefined {
	return publicMedia(portrait, '/portrait/', 'Portrait image');
}

/**
 * A post's hero image or video, in public/hero.
 *
 * Named `hero` rather than `posts`, which was a page route when this was
 * written. That route is gone, but the name still says what the folder holds
 * rather than which section happens to use it.
 */
export function heroMedia(media: string | undefined): string | undefined {
	return publicMedia(media, '/hero/', 'Hero media');
}

/**
 * A paper's uploaded PDF, in public/pdf.
 *
 * Not public/papers: that would be served at /papers/, which is already the
 * publications page — one path answering to two things is worth avoiding.
 */
export function paperPdf(pdf: string | undefined): string | undefined {
	return publicMedia(pdf, '/pdf/', 'Paper PDF');
}
