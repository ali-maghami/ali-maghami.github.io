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
const CONNECT = '/meet/';
const PAGES = ['/', '/blog/', '/projects/', '/papers/', '/about/', '/certificates/', POST, VIDEO_POST, PROJECT, CONNECT];

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

	it('gives every page one h1 and headings that never skip a level', async () => {
		// A skipped level is what a screen reader hears as a missing section.
		// The posts index shipped with h1 followed by h3 and a weekly audit
		// caught it, so it is checked on every page from here on.
		const context = await browser.newContext({ viewport: VIEWPORTS.desktop });
		for (const path of PAGES) {
			const { page } = await visit(context, path);
			const levels = await page.evaluate(() =>
				[...document.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((h) => Number(h.tagName[1])),
			);

			expect(levels.filter((level) => level === 1).length, `${path} has exactly one h1`).toBe(1);
			expect(levels[0], `${path} opens with its h1`).toBe(1);
			for (let i = 1; i < levels.length; i += 1) {
				expect(
					levels[i] - levels[i - 1],
					`${path} jumps from h${levels[i - 1]} to h${levels[i]}`,
				).toBeLessThanOrEqual(1);
			}
			await page.close();
		}
		await context.close();
	}, 120_000);

	it('sets a code block smaller than the prose around it', async () => {
		// Nothing else exercises the highlighter's output. This checks the block
		// renders at all and stays below body size; the exact ratio lives in
		// global.css, where changing it is a deliberate act.
		const context = await browser.newContext({ viewport: VIEWPORTS.desktop });
		const { page, problems } = await visit(context, POST);

		const sizes = await page.evaluate(() => {
			const size = (el: Element | null) => (el ? parseFloat(getComputedStyle(el).fontSize) : 0);
			const body = [...document.querySelectorAll('.prose p')].find(
				(p) => !p.classList.contains('note'),
			);
			const block = document.querySelector('pre code');
			return { body: size(body ?? null), code: size(block), family: block ? getComputedStyle(block).fontFamily : '' };
		});

		expect(sizes.code, 'the post renders a code block').toBeGreaterThan(0);
		expect(sizes.code).toBeLessThan(sizes.body);
		expect(sizes.family.toLowerCase()).toMatch(/mono/);
		expect(problems).toEqual([]);
		await context.close();
	}, 60_000);

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

	it('changes the palette on every load, and never repeats it back to back', async () => {
		const context = await browser.newContext({ viewport: VIEWPORTS.desktop });
		const page = await context.newPage();

		const seen: string[] = [];
		for (let i = 0; i < 8; i += 1) {
			await page.goto(base + '/', { waitUntil: 'domcontentloaded' });
			const [palette, themeColor] = await page.evaluate(() => [
				document.documentElement.dataset.palette,
				document
					.querySelector('meta[name="theme-color"][media*="light"]')
					?.getAttribute('content'),
			]);
			expect(palette, 'the page names a palette').toBeTruthy();
			// The head and the page element have to agree, or the browser chrome
			// is one colour and the page below it another.
			const surface = await page.evaluate(() =>
				getComputedStyle(document.documentElement).getPropertyValue('--surface').trim(),
			);
			expect(surface.toLowerCase()).toBe(themeColor?.toLowerCase());
			seen.push(palette!);
		}

		for (let i = 1; i < seen.length; i += 1) {
			expect(seen[i], `load ${i + 1} repeated load ${i}`).not.toBe(seen[i - 1]);
		}
		// Eight loads that only ever alternated between two would be a rotation
		// that has quietly stopped shuffling.
		expect(new Set(seen).size).toBeGreaterThan(2);

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

	it('answers the event page at the address the CMS chose, and only there', async () => {
		const context = await browser.newContext({ viewport: VIEWPORTS.phone });
		const { page, status } = await visit(context, CONNECT);
		expect(status).toBe(200);
		expect(await page.locator('main h1').textContent()).toContain('Nice meeting you at Queen’s!');
		// Only the card: no site navigation or footer competing with the buttons.
		expect(await page.locator('header.site-header, footer').count()).toBe(0);

		// The LinkedIn button falls back to the settings' address, and is on
		// screen without scrolling on a phone.
		const linkedin = page.locator('a.action-linkedin');
		expect(await linkedin.getAttribute('href')).toBe('https://www.linkedin.com/in/samaghami/');
		const box = await linkedin.boundingBox();
		expect(box!.y + box!.height).toBeLessThanOrEqual(VIEWPORTS.phone.height);
		expect(await page.locator('a.action-explore').getAttribute('href')).toBe('/projects/');
		await page.close();

		const response = await context.request.get(base + CONNECT);
		expect(response.headers()['x-robots-tag']).toBe('noindex');

		// The default address is not the page once the CMS has moved it.
		const { status: moved } = await visit(context, '/connect/');
		expect(moved).toBe(404);
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
