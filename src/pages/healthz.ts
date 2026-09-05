import type { APIRoute } from 'astro';

import { pingDatabase } from '../lib/portfolio-data';

/*
 * Readiness, not just liveness.
 *
 * The site has no content of its own — every page is answered from the
 * portfolio database through the read-only role. A process that is running but
 * cannot reach that database serves nothing useful, so it should not report
 * itself healthy: deploy-hetzner.sh waits on this, and a release that lost its
 * reader credentials should fail the deploy rather than quietly go live.
 *
 * Docker does not restart a container for failing its healthcheck, so a
 * database blip marks this unhealthy and clears on the next probe.
 */
export const prerender = false;

export const GET: APIRoute = async () => {
	try {
		await pingDatabase();
	} catch (error) {
		const reason = error instanceof Error ? error.message : 'unknown error';
		return new Response(`unhealthy\ncontent: unavailable\nreason: ${reason}\n`, {
			status: 503,
			headers: {
				'Content-Type': 'text/plain; charset=utf-8',
				'Cache-Control': 'no-store',
			},
		});
	}

	return new Response('ok\ncontent: database\n', {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'Cache-Control': 'no-store',
		},
	});
};
