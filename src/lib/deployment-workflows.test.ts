import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

const root = process.cwd();
const workflowDirectory = path.join(root, '.github', 'workflows');

const readWorkflow = (name: string) =>
	parse(readFileSync(path.join(workflowDirectory, name), 'utf8'));

describe('Hetzner deployment workflows', () => {
	it('verifies the standalone application before and after merge', () => {
		const workflow = readWorkflow('pr-checks.yml');
		expect(workflow.on.pull_request.branches).toContain('main');
		expect(workflow.on.push.branches).toContain('main');
		expect(workflow.jobs.checks.steps.some((step: { run?: string }) => step.run === 'npm run build')).toBe(
			true,
		);
	});

	it('does not retain a GitHub Pages deployment workflow', () => {
		expect(existsSync(path.join(workflowDirectory, 'deploy.yml'))).toBe(false);
	});

	it('checks links on the running database-backed site', () => {
		const workflowText = readFileSync(path.join(workflowDirectory, 'link-check.yml'), 'utf8');
		expect(workflowText).toContain('https://maghami.dev/');
		expect(workflowText).not.toContain('./dist/**/*.html');
	});

	it('audits representative live routes rather than a static build directory', () => {
		const config = JSON.parse(readFileSync(path.join(root, 'lighthouserc.json'), 'utf8'));
		expect(config.ci.collect.url).toContain('https://maghami.dev/projects');
		expect(config.ci.collect.staticDistDir).toBeUndefined();
	});
});
