import { defineMiddleware } from 'astro:middleware';

import { runWithRequestCache } from './lib/request-cache';

/*
 * Headers the application sets on every response it renders. Caddy sets the
 * same ones at the edge, but the application should be safe on its own: a
 * container reached some other way, or a Caddyfile that lost a line, should
 * not change what a browser is told.
 *
 * The content security policy is not here. Astro computes it with a hash for
 * every script and stylesheet it emits — see `security.csp` in
 * astro.config.mjs — and the node adapter sends it as a header. That is the
 * part that cannot be done by hand.
 */
const SECURITY_HEADERS: Record<string, string> = {
	'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
	'Referrer-Policy': 'strict-origin-when-cross-origin',
	'X-Content-Type-Options': 'nosniff',
	'X-Frame-Options': 'DENY',
};

export const onRequest = defineMiddleware(async (_context, next) => {
	// Every request gets a cache for content reads that lasts as long as the
	// request does. See lib/request-cache.ts for why that scope and not another.
	const response = await runWithRequestCache(() => next());

	for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
		if (!response.headers.has(name)) response.headers.set(name, value);
	}
	return response;
});
