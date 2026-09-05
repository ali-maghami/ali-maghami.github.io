# CI/CD pipeline

The public portfolio is a standalone Astro Node application on Hetzner. GitHub
Actions verifies source changes and audits the running site; it does not deploy
an Astro artifact to GitHub Pages.

## Trigger matrix

| Workflow | Pull request | Push to `main` | Schedule | Manual |
|---|:---:|:---:|:---:|:---:|
| Build Checks | Yes | Yes | — | Yes |
| Dependency Review | Yes | — | — | — |
| CodeQL | — | Yes | Weekly | Yes |
| Link Check | — | — | Weekly | Yes |
| Lighthouse CI | — | — | — | Yes |

## Build Checks

[`pr-checks.yml`](../.github/workflows/pr-checks.yml) installs the locked Node
22 dependency tree, runs `astro check`, executes the Vitest suite and builds the
standalone server. No production database credential is supplied: the build
uses the repository content fallback, while production connects at runtime.

## Security workflows

[`dependency-review.yml`](../.github/workflows/dependency-review.yml) examines
manifest changes on pull requests and fails for newly introduced high or
critical vulnerabilities. [`codeql.yml`](../.github/workflows/codeql.yml)
analyzes JavaScript and TypeScript on `main` and on a weekly schedule, publishing
results to GitHub's Security tab.

## Live-site audits

Database-backed routes do not exist as HTML files under `dist`, so live-site
checks target `https://maghami.dev`:

- [`link-check.yml`](../.github/workflows/link-check.yml) checks the running
  homepage and its links weekly. Hosts that reject automated requests are
  excluded explicitly.
- [`lighthouse.yml`](../.github/workflows/lighthouse.yml) audits representative
  live routes on demand. It reports scores but has no pass/fail thresholds.

## Production deployment

After a feature branch has been merged, run
[`scripts/deploy-hetzner.sh`](../scripts/deploy-hetzner.sh) from a trusted
workstation. The script refuses a dirty tree, archives committed `HEAD`, copies
it to `/home/ali/apps/portfolio`, builds the container, waits for its health
check and verifies the public URL.

CMS content saves are independent of the code pipeline. Published rows become
visible on the next request through the public application's read-only database
role; drafts remain private.
