import type { APIRoute } from 'astro';

import { pingDatabase, verifySchema } from '../lib/portfolio-data';

/*
 * Readiness, not just liveness.
 *
 * The site has no content of its own — every page is answered from the
 * portfolio database through the read-only role. A process that is running but
 * cannot reach that database serves nothing useful, so it should not report
 * itself healthy: deploy-hetzner.sh waits on this, and a release that lost its
 * reader credentials should fail the deploy rather than quietly go live.
 *
 * The same goes for a database that is reachable but no longer has the shape
 * the site reads. A renamed column does not fail a build or a type check on
 * either side; it arrives as undefined and the page renders without it. The
 * schema check turns that into a failed deploy instead. See
 * lib/schema-contract.ts.
 *
 * Docker does not restart a container for failing its healthcheck, so a
 * database blip marks this unhealthy and clears on the next probe.
 *
 * The revision is the commit the image was built from, passed in by the deploy
 * script. Deploys are manual, so "is the site running what is on main?" used
 * to be answered by comparing features; now it is one line here.
 */
export const prerender = false;

const revision = process.env.GIT_REVISION || 'unknown';

const headers = {
	'Content-Type': 'text/plain; charset=utf-8',
	'Cache-Control': 'no-store',
};

const unhealthy = (lines: string[]) =>
	new Response(['unhealthy', ...lines, `revision: ${revision}`, ''].join('\n'), { status: 503, headers });

export const GET: APIRoute = async () => {
	try {
		await pingDatabase();
	} catch (error) {
		const reason = error instanceof Error ? error.message : 'unknown error';
		return unhealthy(['content: unavailable', `reason: ${reason}`]);
	}

	const missing = await verifySchema();
	if (missing.length > 0) {
		return unhealthy(['content: schema-mismatch', `missing: ${missing.join(', ')}`]);
	}

	return new Response(`ok\ncontent: database\nschema: ok\nrevision: ${revision}\n`, { headers });
};
