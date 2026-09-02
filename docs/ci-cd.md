# CI/CD Pipeline

This repo uses six GitHub Actions workflows, all defined in [`.github/workflows/`](../.github/workflows/). Together they gate what can merge into `main` and publish the site once it does.

## Push vs. pull request: what actually triggers what

A common point of confusion: `on: push` does **not** mean "whenever you `git push`." Every workflow here scopes `push` to `branches: [main]`, so it only fires when a commit actually lands *on* `main` — which happens via a PR merge (or, before branch protection existed, a direct push). Pushing a feature branch to `origin` does not trigger it.

The real chronological order is:

1. You push a feature branch → nothing here fires yet (it's not `main`).
2. You open a PR into `main` → `pull_request` workflows fire, testing a preview merge of your branch against `main`. These are pre-merge gates.
3. The PR is merged → GitHub creates a new commit on `main` → `push` workflows fire, now running against the real, final state of `main`. These are post-merge actions (deploy, re-verify).

So "push" workflows run **after** "pull_request" workflows chronologically, even though `push` is listed first alphabetically/in most peoples' mental model of "push, then open a PR."

## Trigger matrix

| Workflow | `push`→main | `pull_request`→main | `schedule` | `workflow_dispatch` |
|---|:---:|:---:|:---:|:---:|
| CodeQL | ✅ | ✅ | ✅ weekly (Mon 04:23 UTC) | ✅ |
| Dependency Review | — | ✅ | — | — |
| Deploy to GitHub Pages | ✅ | — | — | ✅ |
| Lighthouse CI | — | ✅ | — | — |
| Link Check | — | ✅ | ✅ weekly (Mon 06:00 UTC) | ✅ |
| Pull Request Checks | — | ✅ | — | ✅ |

Each choice is deliberate:

- **Dependency Review** only makes sense on a PR — it diffs the base and head manifests, and a plain push has no "before" state to diff against.
- **Lighthouse CI, Link Check, Pull Request Checks** are pre-merge quality gates, so they only need to run on PRs (see [branch-protection.md](./branch-protection.md) for how they're made *required*).
- **Deploy** should only run once code has actually landed on `main` — publishing on every PR would deploy unmerged, unreviewed work.
- **CodeQL** runs on both, plus a schedule, because each catches something different (see below).

## Why does CodeQL run on push, PR, *and* a schedule?

These aren't redundant:

1. **Security alerts are tracked against the default branch, not the PR.** The Security → Code scanning alerts tab reflects `main`'s scan results as the baseline. A PR-triggered run only annotates that PR; it doesn't update the persisted alert list. The post-merge run on `main` is what actually refreshes that baseline.
2. **The merge commit isn't guaranteed to match what the PR tested.** A squash or rebase merge produces a new commit SHA (and potentially a subtly different diff) than the synthetic preview merge CodeQL scanned during the PR. If two PRs merge close together, the real resulting `main` may combine changes neither PR's individual scan saw.
3. **The weekly schedule catches drift with zero code changes.** CodeQL's query packs get updated over time — a pattern not flagged last month might be flagged today even though the code hasn't moved. Only a periodic rescan of `main` catches that.

## Workflow-by-workflow reference

### [`codeql.yml`](../.github/workflows/codeql.yml) — job: `Analyze (javascript-typescript)`

| Step | Meaning | Output |
|---|---|---|
| Checkout repository | Clones the repo | Working copy for scanning |
| Initialize CodeQL | Sets up the scanning engine for `javascript-typescript`, `build-mode: none` (no compile step needed for JS/TS) | CodeQL database ready |
| Perform CodeQL Analysis | Runs the scan, uploads SARIF results under category `/language:javascript-typescript` | Alerts published to **Security → Code scanning alerts**; the job itself passes/fails on scan completion, not on alert count |

### [`dependency-review.yml`](../.github/workflows/dependency-review.yml) — job: `Scan dependency changes`

| Step | Meaning | Output |
|---|---|---|
| Checkout repository | Clones the repo | Working copy |
| Dependency Review | Diffs `package.json`/lockfile changes in the PR against the GitHub Advisory Database, `fail-on-severity: high` | A table of added/removed/changed packages in the job summary; **fails** the check if any changed dependency has a high/critical severity vulnerability |

### [`deploy.yml`](../.github/workflows/deploy.yml)

**Job: `build`**

| Step | Meaning | Output |
|---|---|---|
| Checkout repository | Clones the repo | Working copy |
| Setup Node.js | Installs Node 22 with npm cache | Node/npm ready |
| Install dependencies | `npm ci` | `node_modules/` populated from the lockfile |
| Build with Astro | `npm run build` | `./dist` — the static site |
| Upload artifact | Packages `./dist` via `actions/upload-pages-artifact` | A Pages-deployable artifact, handed to the `deploy` job |

**Job: `deploy`** (needs `build`)

| Step | Meaning | Output |
|---|---|---|
| Deploy to GitHub Pages | Publishes the artifact via `actions/deploy-pages` | Live site updated; `steps.deployment.outputs.page_url` populates the `github-pages` environment URL |

### [`lighthouse.yml`](../.github/workflows/lighthouse.yml) — job: `Audit build`

| Step | Meaning | Output |
|---|---|---|
| Checkout repository | Clones the repo | Working copy |
| Setup Node.js | Node 22 + npm cache | Node/npm ready |
| Install dependencies | `npm ci` | `node_modules/` populated |
| Build site | `npm run build` | `./dist` |
| Run Lighthouse CI | Audits `./dist` via `lighthouserc.json` (`configPath`), uploads to Google's temporary public storage | Performance/Accessibility/Best-Practices/SEO scores in the logs, plus a shareable report link (expires ~7 days). **No assertions are configured**, so this step reports but never fails the job regardless of score |

### [`link-check.yml`](../.github/workflows/link-check.yml) — job: `Check links`

| Step | Meaning | Output |
|---|---|---|
| Checkout repository | Clones the repo | Working copy |
| Setup Node.js | Node 22 + npm cache | Node/npm ready |
| Install dependencies | `npm ci` | `node_modules/` populated |
| Build site | `npm run build` | `./dist` to scan |
| Check links | Runs `lychee` against `./dist/**/*.html`, resolving root-relative links (e.g. `href="/blog"`) against `dist/` via `--root-dir`, accepting 200/206/301/302/303/307/308/429, 2 retries, `fail: true` | A broken-link report in the job summary; **fails** on any dead link |

### [`pr-checks.yml`](../.github/workflows/pr-checks.yml) — job: `Build and verify`

| Step | Meaning | Output |
|---|---|---|
| Checkout repository | Clones the repo | Working copy |
| Setup Node.js | Node 22 + npm cache | Node/npm ready |
| Install dependencies | `npm ci` | `node_modules/` populated |
| Run lint if available | Runs `npm run lint` (currently `astro check` — Astro/TypeScript diagnostics, not a style linter) if the script exists, else logs a skip | Lint pass/fail, or a no-op log line |
| Run tests if available | Runs `npm test` (currently `vitest run`) if the script exists, else logs a skip | Test pass/fail, or a no-op log line |
| Build site | `npm run build` | `./dist`; confirms the PR doesn't break the build |

**Note:** `npm test` currently exercises exactly one test file ([`src/lib/nav.test.ts`](../src/lib/nav.test.ts), 2 assertions on `getNavHref`) — it's a smoke test, not real coverage. `astro check` is doing the heavier lifting by type-checking the whole codebase.

## Gotchas learned the hard way

These are real failures hit in this repo — worth knowing before you touch these workflows again:

- **Required status check names come from the job's `name:` field, not the workflow's top-level `name:`.** E.g. the check to require is `Build and verify`, not "Pull Request Checks" (that's the workflow file's display name in the Actions tab, not the check name GitHub rulesets match against).
- **`treosh/lighthouse-ci-action@v12` does not accept `staticDistDir` as a direct input.** It must go through a `lighthouserc.json` file referenced via `configPath`.
- **lychee needs `--root-dir` to resolve root-relative links** (e.g. `href="/blog"`) against `dist/` instead of the runner's filesystem root — without it, every internal link gets flagged as broken.
- **lychee v0.24+ removed `--exclude-mail`** in favor of `--include-mail` (excluding `mailto:` links is now the default). Passing the old flag crashes the run with exit code 2 before it scans anything — it doesn't degrade gracefully.
- **Three workflows each run their own independent `npm ci` + `npm run build`** (`deploy`, `lighthouse`, `link-check`, `pr-checks` — four, actually). There's no shared build artifact across workflows; each builds fresh on its own runner.
