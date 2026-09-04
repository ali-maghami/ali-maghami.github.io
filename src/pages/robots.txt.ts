import type { APIRoute } from 'astro';

import { renderRobots } from '../lib/robots';

export const prerender = true;

export const GET: APIRoute = ({ site }) => {
	if (!site) {
		throw new Error('Astro site URL is required to generate robots.txt');
	}

	return new Response(renderRobots(site), {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
		},
	});
};
