import type { APIRoute } from 'astro';

import {
	IMAGE_WIDTHS,
	type ImageWidth,
	imageVersion,
	isResizable,
	renderResized,
	resizedImage,
} from '../../../../lib/images';

/*
 * Sized WebP copies of images in public/, addressed as
 * /img/<version>/<width>/<public path>. See lib/images.ts for why the site
 * resizes on request rather than at build time, and why the version is in the
 * URL.
 */
export const prerender = false;

const WIDTHS: readonly number[] = IMAGE_WIDTHS;

export const GET: APIRoute = async ({ params, redirect }) => {
	const width = Number(params.width);
	const publicPath = `/${params.path ?? ''}`;

	if (!params.version || !WIDTHS.includes(width) || !isResizable(publicPath)) {
		return new Response('Not found', { status: 404 });
	}

	// A page rendered before a deploy that replaced this file still links the
	// old version. The bytes it wanted are gone; the current ones are the
	// closest thing, and a redirect keeps the old URL from being cached wrongly.
	if (imageVersion(publicPath) !== params.version) {
		const current = resizedImage(publicPath, width as ImageWidth);
		return current ? redirect(current, 302) : new Response('Not found', { status: 404 });
	}

	const bytes = await renderResized(publicPath, width as ImageWidth);
	if (!bytes) return new Response('Not found', { status: 404 });

	return new Response(new Uint8Array(bytes), {
		headers: {
			'Content-Type': 'image/webp',
			'Content-Length': String(bytes.byteLength),
			// The URL names the exact bytes, so this can never go stale.
			'Cache-Control': 'public, max-age=31536000, immutable',
			'X-Content-Type-Options': 'nosniff',
		},
	});
};
