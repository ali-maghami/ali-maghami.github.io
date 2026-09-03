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

export const CATEGORY_LABELS: Record<string, string> = {
	active: 'Active projects',
	archived: 'Archived projects',
};

/** The display label for a stage, falling back to the stored value. */
export function stageLabel(stage: string): string {
	return STAGE_LABELS[stage] ?? stage;
}

/** The display label for a category, falling back to the stored value. */
export function categoryLabel(category: string): string {
	return CATEGORY_LABELS[category] ?? category;
}
