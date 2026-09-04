import { describe, expect, it } from 'vitest';

import { renderRobots } from './robots';

describe('renderRobots', () => {
	it('uses the configured deployment origin for the sitemap', () => {
		expect(renderRobots(new URL('https://maghami.dev'))).toContain(
			'Sitemap: https://maghami.dev/sitemap-index.xml',
		);
	});

	it('supports preview builds without hard-coding production', () => {
		expect(renderRobots(new URL('https://preview.example/base/'))).toContain(
			'Sitemap: https://preview.example/base/sitemap-index.xml',
		);
	});
});
