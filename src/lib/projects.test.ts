import { describe, expect, it } from 'vitest';
import { CATEGORY_LABELS, STAGE_LABELS, categoryLabel, stageLabel } from './projects';

describe('stageLabel', () => {
	it('names every stage the schema allows', () => {
		// The schema enum and this map have to agree, or a valid entry renders
		// its raw slug on the page.
		const schemaStages = ['napkin-sketch', 'research-prototype', 'piloted', 'completed', 'product'];
		expect(Object.keys(STAGE_LABELS).sort()).toEqual([...schemaStages].sort());
		for (const stage of schemaStages) {
			expect(stageLabel(stage), stage).not.toBe(stage);
		}
	});

	it('reads back the value rather than showing nothing for an unknown stage', () => {
		expect(stageLabel('somewhere-else')).toBe('somewhere-else');
	});
});

describe('categoryLabel', () => {
	it('names both categories', () => {
		expect(Object.keys(CATEGORY_LABELS).sort()).toEqual(['active', 'archived']);
		expect(categoryLabel('active')).toBe('Active projects');
		expect(categoryLabel('archived')).toBe('Archived projects');
	});

	it('falls back for an unknown category', () => {
		expect(categoryLabel('mystery')).toBe('mystery');
	});
});
