export function renderRobots(site: URL) {
	return [
		'User-agent: *',
		'Allow: /',
		'',
		`Sitemap: ${new URL('sitemap-index.xml', site).href}`,
		'',
	].join('\n');
}
