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
 * Checks that a CMS-supplied public path names a file that will actually be
 * served, and returns it unchanged.
 *
 * Nothing else validates these: a public path is just a string, so a typo would
 * ship a broken image icon with nothing to explain it. Since showing the image
 * is the entire point of the field, a miss fails the build instead.
 *
 * `prefix` is checked too, because the CMS writes it from the collection's
 * public_folder — a value with the wrong prefix means that config drifted, and
 * catching it here names the cause rather than leaving a blank.
 */
export function assertPublicImage(
	value: string | undefined,
	prefix: string,
	label: string,
): string | undefined {
	if (!value) return undefined;

	if (!value.startsWith(prefix)) {
		throw new Error(
			`${label} path must start with ${prefix} so it resolves to public${prefix}: ${value}`,
		);
	}

	const onDisk = path.join(process.cwd(), PUBLIC_DIR, value);
	if (!existsSync(onDisk)) {
		throw new Error(`${label} image not found: ${value} (looked for ${onDisk})`);
	}

	return value;
}

/** A certificate's issuer badge, in public/badges. */
export function assertBadge(badge: string | undefined): string | undefined {
	return assertPublicImage(badge, '/badges/', 'Badge');
}

/** The home page portrait, in public/portrait. */
export function assertPortrait(portrait: string | undefined): string | undefined {
	return assertPublicImage(portrait, '/portrait/', 'Portrait');
}
