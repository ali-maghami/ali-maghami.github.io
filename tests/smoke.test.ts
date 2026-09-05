import { type Browser, type BrowserContext, type Page, chromium } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/*
 * The built site, in a real browser.
 *
 * Runs when SMOKE_BASE_URL names a running server — CI builds the site, seeds
 * a database from scripts/test-content.sql and starts it; locally, do the same
 * and point this at it. Without the variable the file is skipped. It drives
 * the Chrome already installed on the machine (`channel: 'chrome'`), so no
 * browser download is needed; set SMOKE_CHROME_CHANNEL to use another.
 *
 * What it checks is what a unit test cannot: that nothing scrolls sideways on
 * a phone, that no page logs an error or loads a missing file, that the
 * content security policy blocks nothing the site needs, that dark mode is
 * actually dark, and that a missing address gets the site's own 404.
 */
const base = process.env.SMOKE_BASE_URL;

/* Slugs from scripts/test-content.sql. */
const POST = '/blog/teaching-steel-industry-equipment-to-see/';
const VIDEO_POST = '/blog/fourteen-agents-one-trace-observability-for-multi-agent-systems/';
const PROJECT = '/projects/coilsense/';
const PAGES = ['/', '/blog/', '/projects/', '/papers/', '/about/', '/certificates/', POST, VIDEO_POST, PROJECT];

const VIEWPORTS = {
	phone: { width: 390, height: 844 },
	desktop: { width: 1280, height: 900 },
};

interface Visit {
	page: Page;
	status: number | undefined;
	/** Console errors, uncaught exceptions and failed same-origin requests. */
	problems: string[];
}

async function visit(context: BrowserContext, path: string): Promise<Visit> {
	const page = await context.newPage();
	const problems: string[] = [];
	page.on('console', (message) => {
		if (message.type() === 'error') problems.push(`console: ${message.text()}`);
	});
	page.on('pageerror', (error) => problems.push(`uncaught: ${error.message}`));
	page.on('response', (response) => {
		if (response.status() >= 400 && response.url().startsWith(base!)) {
			problems.push(`${response.status()} ${response.url()}`);
		}
	});

	const response = await page.goto(base + path, { waitUntil: 'load' });
	// Lazy images only load once they are near the viewport, so the page is
	// walked to the bottom before the failed-request list is read.
	await page.evaluate(async () => {
		for (let y = 0; y < document.documentElement.scrollHeight; y += 600) {
			window.scrollTo(0, y);
			await new Promise((resolve) => setTimeout(resolve, 60));
		}
		window.scrollTo(0, 0);
	});
	await page.waitForTimeout(500);
	return { page, status: response?.status(), problems };
}

/** Perceived luminance of a CSS rgb() colour, 0 to 1. */
function luminance(rgb: string): number {
	const [r, g, b] = rgb.match(/\d+/g)!.slice(0, 3).map((n) => Number(n) / 255);
	return 0.299 * r + 0.587 * g + 0.114 * b;
}

describe.skipIf(!base)('the built site in a browser', () => {
	let browser: Browser;

	beforeAll(async () => {
		browser = await chromium.launch({ channel: process.env.SMOKE_CHROME_CHANNEL || 'chrome' });
	}, 60_000);

	afterAll(async () => {
		await browser?.close();
	});

	for (const [name, viewport] of Object.entries(VIEWPORTS)) {
		it(
			`fits a ${name} without sideways scrolling and loads every page cleanly`,
			async () => {
				const context = await browser.newContext({ viewport });
				for (const path of PAGES) {
					const { page, status, problems } = await visit(context, path);
					expect(status, path).toBe(200);

					const overflow = await page.evaluate(
						() => document.documentElement.scrollWidth - document.documentElement.clientWidth,
					);
					expect(overflow, `${path} on a ${name} scrolls sideways by`).toBeLessThanOrEqual(0);
					expect(problems, path).toEqual([]);
					await page.close();
				}
				await context.close();
			},
			180_000,
		);
	}

	it('is dark for readers who prefer it, and light for everyone else', async () => {
		for (const [scheme, check] of [
			['dark', (l: number) => expect(l).toBeLessThan(0.2)],
			['light', (l: number) => expect(l).toBeGreaterThan(0.85)],
		] as const) {
			const context = await browser.newContext({ colorScheme: scheme, viewport: VIEWPORTS.desktop });
			const { page, problems } = await visit(context, POST);
			const [surface, ink] = await page.evaluate(() => [
				getComputedStyle(document.body).backgroundColor,
				getComputedStyle(document.querySelector('h1')!).color,
			]);
			check(luminance(surface));
			// Whatever the scheme, the heading has to stand against the page.
			expect(Math.abs(luminance(surface) - luminance(ink)), scheme).toBeGreaterThan(0.6);
			expect(problems, scheme).toEqual([]);
			await context.close();
		}
	}, 60_000);

	it('keeps one palette within a section and changes it between sections', async () => {
		const context = await browser.newContext({ viewport: VIEWPORTS.desktop });
		const palette = async (path: string) => {
			const { page } = await visit(context, path);
			const name = await page.evaluate(() => document.documentElement.dataset.palette);
			await page.close();
			return name;
		};
		expect(await palette('/blog/')).toBe(await palette(POST));
		expect(await palette('/projects/')).toBe(await palette(PROJECT));
		expect(await palette('/blog/')).not.toBe(await palette('/projects/'));
		await context.close();
	}, 60_000);

	it('answers a missing address with a 404 and its own page', async () => {
		const context = await browser.newContext({ viewport: VIEWPORTS.desktop });
		for (const path of ['/nothing-here/', '/blog/not-a-post/', '/projects/not-a-project/']) {
			const { page, status } = await visit(context, path);
			expect(status, path).toBe(404);
			expect(await page.locator('main h1').textContent(), path).toContain('nothing at this address');
			await page.close();
		}
		await context.close();
	}, 60_000);

	it('sends the security headers and a content security policy', async () => {
		const context = await browser.newContext({ viewport: VIEWPORTS.desktop });
		const page = await context.newPage();
		const response = await page.goto(base + '/');
		const headers = response!.headers();
		expect(headers['permissions-policy']).toContain('camera=()');
		expect(headers['x-content-type-options']).toBe('nosniff');
		expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');

		// Astro computes the policy, with a hash per script and stylesheet, and
		// the node adapter sends it as a header.
		const csp = headers['content-security-policy'];
		expect(csp).toContain("default-src 'self'");
		expect(csp).toContain("frame-ancestors 'none'");
		expect(csp).toMatch(/script-src 'self' 'sha256-/);
		expect(csp).not.toContain("script-src 'unsafe-inline'");
		await context.close();
	}, 60_000);
});
