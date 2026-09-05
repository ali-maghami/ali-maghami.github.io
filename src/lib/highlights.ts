import type { CertificateRecord, PaperRecord, ProjectRecord } from './portfolio-data';

/**
 * The numbers that back up the home page's claim, taken from the content
 * rather than typed in: publications, patents, projects and certifications are
 * counted from what is published, so the row can never drift from the pages
 * behind it. Years of experience is the one figure content cannot supply; it
 * comes from the year the CMS says the career started, and is left out until
 * that is set.
 */
export interface Highlight {
	value: string;
	label: string;
}

const plural = (count: number, one: string, many: string) => (count === 1 ? one : many);

export function highlights(
	content: {
		papers: PaperRecord[];
		projects: ProjectRecord[];
		certificates: CertificateRecord[];
		since?: number;
	},
	today = new Date(),
): Highlight[] {
	const items: Highlight[] = [];

	if (content.since && content.since <= today.getUTCFullYear()) {
		const years = today.getUTCFullYear() - content.since;
		if (years >= 1) items.push({ value: `${years}+`, label: plural(years, 'year in the field', 'years in the field') });
	}

	const publications = content.papers.filter((paper) => paper.kind !== 'patent').length;
	if (publications > 0) {
		items.push({ value: String(publications), label: plural(publications, 'publication', 'publications') });
	}

	const patents = content.papers.filter((paper) => paper.kind === 'patent').length;
	if (patents > 0) items.push({ value: String(patents), label: plural(patents, 'patent', 'patents') });

	if (content.projects.length > 0) {
		items.push({
			value: String(content.projects.length),
			label: plural(content.projects.length, 'project', 'projects'),
		});
	}

	if (content.certificates.length > 0) {
		items.push({
			value: String(content.certificates.length),
			label: plural(content.certificates.length, 'certification', 'certifications'),
		});
	}

	return items;
}
