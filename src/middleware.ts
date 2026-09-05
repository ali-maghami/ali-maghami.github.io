import { defineMiddleware } from 'astro:middleware';

import { runWithRequestCache } from './lib/request-cache';

/**
 * Every request gets a cache for content reads that lasts as long as the
 * request does. See lib/request-cache.ts for why that scope and not another.
 */
export const onRequest = defineMiddleware((_context, next) => runWithRequestCache(() => next()));
