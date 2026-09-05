import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * One cache per request, for content reads that several components repeat.
 *
 * Header and Footer render on every page and each asks for the site settings
 * and the section counts; the page itself asks for some of the same rows
 * again. Before this, a single page view could issue eight or more queries
 * that returned identical data. Memoising in module scope would fix that but
 * would also hold content across requests, and the CMS promise is that a save
 * is visible on the next request. A request-scoped cache keeps that promise
 * while collapsing the duplicates.
 *
 * The scope is carried by AsyncLocalStorage from the middleware, so the data
 * layer needs no per-call parameter: any query issued while a request is being
 * answered, however deep in the component tree, shares the request's cache.
 * Outside a request — tests, scripts — there is no store and nothing is cached.
 */
type Store = Map<string, Promise<unknown>>;

const storage = new AsyncLocalStorage<Store>();

/** Answers `work` with a fresh cache that lasts exactly as long as it does. */
export function runWithRequestCache<T>(work: () => T): T {
	return storage.run(new Map(), work);
}

/**
 * Returns the request's existing result for `key`, or loads and remembers one.
 *
 * Concurrent callers share the same pending promise, so two components asking
 * at the same instant still cost one query. A rejection is forgotten at once:
 * the caller that hit it sees the error, and the next caller gets to retry
 * rather than inheriting a failure for the rest of the request.
 */
export function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
	const store = storage.getStore();
	if (!store) return load();

	const hit = store.get(key);
	if (hit) return hit as Promise<T>;

	const pending = load();
	store.set(key, pending);
	pending.catch(() => {
		store.delete(key);
	});
	return pending;
}

/** Whether a request cache is active, for tests and diagnostics. */
export function hasRequestCache(): boolean {
	return storage.getStore() !== undefined;
}
