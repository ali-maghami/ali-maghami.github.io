/**
 * The labels each project stage and category shows as.
 *
 * Stored as slugs and displayed through these maps, so the wording can change
 * without rewriting every entry — and so an unrecognised value cannot reach the
 * page as-is. The order here is the order the CMS offers them: roughly how far
 * a piece of work has travelled.
 */
export const STAGE_LABELS: Record<string, string> = {
	'napkin-sketch': 'Napkin Sketch',
	'research-prototype': 'Research Prototype',
	piloted: 'Piloted',
	completed: 'Completed',
	product: 'Product',
};

/**
 * What each stage means, for a reader who meets "Piloted" on a card with no
 * other clue. Shown as the badge's tooltip and in the legend on the projects
 * page.
 */
export const STAGE_DESCRIPTIONS: Record<string, string> = {
	'napkin-sketch': 'An idea worked out on paper. Nothing built yet.',
	'research-prototype':
		'Built to answer a research question and run in a lab or on recorded data, not in production.',
	piloted: 'Deployed on real equipment for a trial with a customer or partner.',
	completed: 'Delivered and handed over. No longer under active development.',
	product: 'In routine use, maintained and supported.',
};

export const CATEGORY_LABELS: Record<string, string> = {
	active: 'Active projects',
	archived: 'Archived projects',
};

/** The display label for a stage, falling back to the stored value. */
export function stageLabel(stage: string): string {
	return STAGE_LABELS[stage] ?? stage;
}

/** What a stage means, or nothing for a value the site does not know. */
export function stageDescription(stage: string): string | undefined {
	return STAGE_DESCRIPTIONS[stage];
}

/** The stages present in a list of projects, in the order the site defines them. */
export function stagesIn(projects: Array<{ stage: string }>): string[] {
	const present = new Set(projects.map((project) => project.stage));
	return Object.keys(STAGE_LABELS).filter((stage) => present.has(stage));
}

/** The display label for a category, falling back to the stored value. */
export function categoryLabel(category: string): string {
	return CATEGORY_LABELS[category] ?? category;
}
