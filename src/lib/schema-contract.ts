/**
 * The columns this site reads from the portfolio database.
 *
 * The CMS owns the schema and the site issues SELECT * and maps columns by
 * hand, so a column renamed there does not fail anything here: the value
 * arrives as undefined and the page renders without it. This list is the
 * site's half of the contract described in the CMS repository's
 * docs/schema-contract.md. A test keeps it honest against the mappers, and
 * /healthz compares it to information_schema at runtime so a deploy stops on
 * a break instead of shipping pages that quietly lost a field.
 *
 * A column the CMS adds and the site ignores is not a break, and is not
 * reported.
 */
export const READ_COLUMNS: Record<string, readonly string[]> = {
	portfolio_project: [
		'slug',
		'title',
		'description',
		'stage',
		'category',
		'contributors',
		'purpose',
		'pub_date',
		'tags',
		'repo_url',
		'live_url',
		'hero_image',
		'card_color',
		'card_color_alt',
		'body_markdown',
		'status',
		'updated_at',
	],
	portfolio_post: [
		'slug',
		'title',
		'description',
		'pub_date',
		'updated_date',
		'tags',
		'kind',
		'hero_image',
		'hero_video',
		'hero_video_playback',
		'body_markdown',
		'status',
		'updated_at',
	],
	portfolio_paper: [
		'slug',
		'title',
		'authors',
		'venue',
		'year',
		'kind',
		'abstract',
		'doi',
		'url',
		'pdf',
		'citations',
		'tags',
		'featured',
		'body_markdown',
		'status',
	],
	portfolio_certificate: [
		'slug',
		'name',
		'issuer',
		'issue_date',
		'expiry_date',
		'credential_id',
		'url',
		'badge',
		'featured',
		'body_markdown',
		'status',
	],
	portfolio_page: ['key', 'data', 'body_markdown'],
	portfolio_setting: ['key', 'value'],
	portfolio_media: ['path', 'mime_type', 'byte_size', 'width', 'height'],
};

export interface PresentColumn {
	table: string;
	column: string;
}

/**
 * What the site expects and cannot see, as "table.column" entries.
 *
 * A table with no visible columns at all is reported as "table.*": either it
 * does not exist or the reader role was never granted it, and either way that
 * is the failure grant-reader.sh exists to prevent, worth more than a list of
 * every column.
 */
export function missingColumns(
	expected: Record<string, readonly string[]>,
	present: PresentColumn[],
): string[] {
	const seen = new Map<string, Set<string>>();
	for (const { table, column } of present) {
		if (!seen.has(table)) seen.set(table, new Set());
		seen.get(table)!.add(column);
	}

	const missing: string[] = [];
	for (const [table, columns] of Object.entries(expected)) {
		const visible = seen.get(table);
		if (!visible || visible.size === 0) {
			missing.push(`${table}.*`);
			continue;
		}
		for (const column of columns) {
			if (!visible.has(column)) missing.push(`${table}.${column}`);
		}
	}
	return missing;
}
