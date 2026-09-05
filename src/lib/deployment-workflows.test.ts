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

/*
 * The data layer is tested against PostgreSQL in CI, not mocked. These pin the
 * pieces that make that happen, since a workflow edit that dropped the service
 * would leave the integration file silently skipped and the checks green.
 */
describe('database in CI', () => {
	const workflow = readWorkflow('pr-checks.yml');
	const steps: Array<{ run?: string }> = workflow.jobs.checks.steps;

	it('starts a PostgreSQL service for the checks job', () => {
		expect(workflow.jobs.checks.services.postgres.image).toMatch(/^postgres:/);
		expect(workflow.jobs.checks.services.postgres.options).toContain('pg_isready');
	});

	it('creates the tables from the committed schema before the tests run', () => {
		const schemaStep = steps.findIndex((step) => step.run?.includes('scripts/test-database.sql'));
		const testStep = steps.findIndex((step) => step.run?.includes('npm test'));
		expect(schemaStep).toBeGreaterThan(-1);
		expect(testStep).toBeGreaterThan(schemaStep);
	});

	it('tells the tests where that database is, and nothing else', () => {
		expect(workflow.jobs.checks.env.PORTFOLIO_TEST_DATABASE_URL).toMatch(/^postgres:\/\//);
		expect(workflow.jobs.checks.env.PORTFOLIO_DATABASE_URL).toBeUndefined();
	});

	it('keeps the schema file to the tables the reader role can see', () => {
		const schema = readFileSync(path.join(root, 'scripts', 'test-database.sql'), 'utf8');
		for (const table of [
			'portfolio_project',
			'portfolio_post',
			'portfolio_paper',
			'portfolio_certificate',
			'portfolio_page',
			'portfolio_setting',
			'portfolio_media',
		]) {
			expect(schema).toContain(`CREATE TABLE "${table}"`);
		}
		expect(schema).not.toContain('CREATE TABLE "user"');
		expect(schema).not.toContain('portfolio_revision');
	});
});

/*
 * /healthz reports the commit the running image was built from. That only
 * works if the revision travels the whole way: script to compose to Dockerfile.
 */
describe('revision in the image', () => {
	it('is passed by the deploy script when it builds', () => {
		const script = readFileSync(path.join(root, 'scripts', 'deploy-hetzner.sh'), 'utf8');
		expect(script).toMatch(/GIT_REVISION="\$\{REV\}" docker compose -f compose\.prod\.yml build/);
	});

	it('is forwarded by compose as a build argument', () => {
		const compose = parse(readFileSync(path.join(root, 'compose.prod.yml'), 'utf8'));
		expect(compose.services.web.build.args.GIT_REVISION).toBe('${GIT_REVISION:-unknown}');
	});

	it('is baked into the runtime environment by the Dockerfile', () => {
		const dockerfile = readFileSync(path.join(root, 'Dockerfile'), 'utf8');
		expect(dockerfile).toContain('ARG GIT_REVISION=unknown');
		expect(dockerfile).toContain('ENV GIT_REVISION=${GIT_REVISION}');
	});
});

/*
 * The built site is opened in a browser in CI, against fixture content. The
 * fixture and the test agree on slugs, and the workflow has to wire them up.
 */
describe('browser smoke test in CI', () => {
	const workflow = readWorkflow('pr-checks.yml');
	const steps: Array<{ run?: string; env?: Record<string, string> }> = workflow.jobs.checks.steps;
	const smoke = steps.find((step) => step.run?.includes('tests/smoke.test.ts'));

	it('runs after the build, against a server started from the build output', () => {
		const build = steps.findIndex((step) => step.run === 'npm run build');
		expect(smoke).toBeDefined();
		expect(steps.indexOf(smoke!)).toBeGreaterThan(build);
		expect(smoke!.run).toContain('dist/server/entry.mjs');
		expect(smoke!.run).toContain('scripts/test-content.sql');
		expect(smoke!.env?.SMOKE_BASE_URL).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
	});

	it('seeds the slugs the smoke test visits', () => {
		const content = readFileSync(path.join(root, 'scripts', 'test-content.sql'), 'utf8');
		const test = readFileSync(path.join(root, 'tests', 'smoke.test.ts'), 'utf8');
		// The named constants are the pages expected to exist; the 404 test
		// visits made-up slugs inline and those must stay absent.
		const slugs = [...test.matchAll(/^const \w+ = '\/(?:blog|projects)\/([a-z0-9-]+)\/';/gm)].map((m) => m[1]);
		expect(slugs.length).toBeGreaterThan(0);
		for (const slug of slugs) {
			expect(content, slug).toContain(`'${slug}'`);
		}
	});
});

describe('Lighthouse audit', () => {
	it('runs on a schedule with budgets that fail the run', () => {
		const workflow = readWorkflow('lighthouse.yml');
		expect(workflow.on.schedule?.[0]?.cron).toMatch(/\S/);

		const config = JSON.parse(readFileSync(path.join(root, 'lighthouserc.json'), 'utf8'));
		for (const category of ['performance', 'accessibility', 'best-practices', 'seo']) {
			expect(config.ci.assert.assertions[`categories:${category}`][0], category).toBe('error');
		}
	});
});
