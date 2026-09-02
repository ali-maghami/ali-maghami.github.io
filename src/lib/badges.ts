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
 * Checks that a badge path names a file that will actually be served.
 *
 * Nothing else validates this: a public path is just a string, so a typo would
 * ship a broken image icon with nothing to explain it. Since showing the badge
 * is the entire point of the field, a miss fails the build instead.
 */
export function assertBadge(badge: string | undefined): string | undefined {
	if (!badge) return undefined;

	if (!badge.startsWith('/badges/')) {
		throw new Error(
			`Badge path must start with /badges/ so it resolves to public/badges: ${badge}`,
		);
	}

	const onDisk = path.join(process.cwd(), PUBLIC_DIR, badge);
	if (!existsSync(onDisk)) {
		throw new Error(`Badge image not found: ${badge} (looked for ${onDisk})`);
	}

	return badge;
}
