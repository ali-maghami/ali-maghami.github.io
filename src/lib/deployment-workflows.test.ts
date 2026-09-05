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

/*
 * The retired /admin/ editor was deleted from the repository and kept answering
 * 200 in production: the deploy extracted each release over the previous one,
 * so a file removed from Git stayed in the Docker build context and was copied
 * straight back into the image. Deleting something has to actually delete it.
 */
describe('deploy-hetzner.sh', () => {
	const script = readFileSync(path.join(root, 'scripts', 'deploy-hetzner.sh'), 'utf8');

	it('installs the release into an emptied directory', () => {
		expect(script).toContain('-mindepth 1 -maxdepth 1');
		expect(script).toContain('-exec rm -rf -- {} +');
	});

	it('extracts to a staging directory rather than over the live tree', () => {
		expect(script).toContain('tar xzf /tmp/portfolio.tar.gz -C');
		expect(script).not.toMatch(/tar xzf \/tmp\/portfolio\.tar\.gz\s*$/m);
	});

	it('keeps the protected environment file through the clean', () => {
		expect(script).toContain('! -name .env.reader');
	});

	it('refuses to clean a directory outside the applications root', () => {
		expect(script).toContain('/home/ali/apps/*');
		expect(script).toContain('refusing to clean');
	});
});
