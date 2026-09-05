import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Draft previews.
 *
 * A draft has no public address: every content query filters on
 * `status = 'published'`, and the reader role exists so this application can
 * never do more than read. Previewing one therefore needs a deliberate second
 * path rather than a widened grant — and that path has to be closed to anyone
 * who has not been handed a link by the CMS.
 *
 * The CMS signs `collection|slug|expiry` with a secret both applications hold,
 * and the token is that expiry and signature. It grants exactly one entry for
 * a short window: it cannot be edited into a different slug, reused after it
 * expires, or forged without the secret.
 *
 * The signing half lives in the CMS's src/lib/preview.ts. The two are
 * duplicated rather than shared, like every other piece these applications
 * have in common; keep the message format identical when either changes.
 */

/** Collections the site renders on a page of their own. */
export type PreviewCollection = 'projects' | 'posts';

function message(collection: PreviewCollection, slug: string, expiry: number): string {
	return `${collection}|${slug}|${expiry}`;
}

function sign(value: string, secret: string): string {
	return createHmac('sha256', secret).update(value).digest('hex');
}

/**
 * Whether this token grants a preview of this entry, right now.
 *
 * Returns false rather than throwing for every failure — an unreadable token
 * is simply not a grant, and the caller should render the published page or a
 * 404 exactly as it would without one.
 */
export function verifyPreviewToken(
	token: string | null,
	collection: PreviewCollection,
	slug: string,
	secret: string | undefined,
	now: number = Date.now(),
): boolean {
	// No secret configured means the feature is off, not that everything passes.
	if (!secret || !token) return false;

	const separator = token.indexOf('.');
	if (separator === -1) return false;

	const expiry = Number(token.slice(0, separator));
	const signature = token.slice(separator + 1);
	if (!Number.isSafeInteger(expiry) || !signature) return false;

	// Checked before the comparison so an expired token costs nothing.
	if (expiry * 1000 <= now) return false;

	const expected = sign(message(collection, slug, expiry), secret);

	// Same length is a precondition of timingSafeEqual, and a wrong length is
	// already a wrong signature.
	if (signature.length !== expected.length) return false;

	return timingSafeEqual(Buffer.from(signature, 'utf8'), Buffer.from(expected, 'utf8'));
}
