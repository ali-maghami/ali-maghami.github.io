import { z } from 'astro/zod';

/*
 * The CMS does not omit a field an editor filled in and then cleared — it
 * writes an empty value, and which one depends on the widget: text fields write
 * '', while number, date and image fields write null. Neither satisfies a plain
 * `.optional()`.
 *
 * Getting this wrong fails in two ways. A cleared URL or number breaks the build
 * loudly, on a pull request the CMS itself opened. A cleared date is worse and
 * silent: `z.coerce.date()` runs `new Date(null)`, which is 1970-01-01 rather
 * than an error, so a cleared expiry date would quietly render as long expired.
 *
 * This lives outside content.config.ts so it can be tested — that file imports
 * `astro:content`, which does not resolve under vitest.
 */
export const blankToUndefined = (value: unknown): unknown =>
	value === '' || value === null ? undefined : value;

/** Marks a field optional, treating the CMS's empty values as absent. */
export const optional = <T extends z.ZodTypeAny>(schema: T) =>
	z.preprocess(blankToUndefined, schema.optional());

/** An optional URL, tolerant of a cleared field. */
export const optionalUrl = optional(z.string().url());
