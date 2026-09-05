import { describe, expect, it, vi } from 'vitest';

import { cached, hasRequestCache, runWithRequestCache } from './request-cache';

describe('request cache', () => {
	it('does nothing outside a request', async () => {
		const load = vi.fn(async () => 'value');
		expect(hasRequestCache()).toBe(false);

		await cached('k', load);
		await cached('k', load);

		expect(load).toHaveBeenCalledTimes(2);
	});

	it('answers repeated reads within one request from a single load', async () => {
		const load = vi.fn(async () => ({ n: Math.random() }));

		const [a, b] = await runWithRequestCache(() =>
			Promise.all([cached('settings', load), cached('settings', load)]),
		);

		expect(load).toHaveBeenCalledTimes(1);
		expect(a).toBe(b);
	});

	it('keeps different keys apart', async () => {
		const load = vi.fn(async () => 1);
		await runWithRequestCache(() => Promise.all([cached('a', load), cached('b', load)]));
		expect(load).toHaveBeenCalledTimes(2);
	});

	it('gives each request its own cache', async () => {
		const load = vi.fn(async () => 'x');
		await runWithRequestCache(() => cached('k', load));
		await runWithRequestCache(() => cached('k', load));
		expect(load).toHaveBeenCalledTimes(2);
	});

	it('forgets a failure so the next reader can retry', async () => {
		let attempts = 0;
		const load = vi.fn(async () => {
			attempts += 1;
			if (attempts === 1) throw new Error('connection reset');
			return 'recovered';
		});

		await runWithRequestCache(async () => {
			await expect(cached('k', load)).rejects.toThrow('connection reset');
			await expect(cached('k', load)).resolves.toBe('recovered');
		});

		expect(load).toHaveBeenCalledTimes(2);
	});

	/*
	 * Astro answers a page with a Response whose body is a ReadableStream, and
	 * the component tree — Header, Footer, cards — renders as that stream is
	 * consumed, after the middleware's `next()` has already resolved. The cache
	 * is only useful if it is still in scope then. It is, because the render
	 * loop is started synchronously inside the stream's `start()`, which runs
	 * inside the middleware call; this pins that down so a future change to the
	 * cache's plumbing cannot quietly lose the scope.
	 */
	it('stays in scope for work started inside a stream created during the request', async () => {
		const load = vi.fn(async () => 'shared');
		const seen: string[] = [];

		const response = await runWithRequestCache(async () => {
			await Promise.resolve();
			return new Response(
				new ReadableStream({
					start(controller) {
						(async () => {
							for (const component of ['header', 'page', 'footer']) {
								await new Promise((resolve) => setTimeout(resolve, 1));
								seen.push(`${component}:${await cached('settings', load)}`);
								controller.enqueue(new TextEncoder().encode(component));
							}
							controller.close();
						})();
					},
				}),
			);
		});

		// Consumed outside the request scope, as the adapter would.
		expect(hasRequestCache()).toBe(false);
		await response.text();

		expect(seen).toEqual(['header:shared', 'page:shared', 'footer:shared']);
		expect(load).toHaveBeenCalledTimes(1);
	});
});
