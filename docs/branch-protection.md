# Branch Protection

`main` is protected by a **repository ruleset** named `main-protection` (Settings → Rules → Rulesets on GitHub). This document explains what it enforces, why, and the practical implications of working under it.

## Ruleset vs. classic branch protection

GitHub offers two mechanisms for this:

- **Classic branch protection rules** — the older model: one rule per branch pattern, toggled in Settings → Branches.
- **Repository rulesets** — the newer model: supports multiple layered rules, applies to branches *and* tags, has an explicit bypass list, and is the direction GitHub is actively investing in.

This repo uses a **ruleset**, for a solo/small-team project the functional outcome is the same as classic protection, but rulesets are the more future-proof choice.

## What's currently active

Targeting: the default branch (`main`).

| Rule | Effect |
|---|---|
| `deletion` | `main` cannot be deleted. |
| `non_fast_forward` | Force-pushes to `main` are blocked — history can't be rewritten. |
| `pull_request` (0 required approvals) | All changes to `main` must go through a PR. Direct pushes — including from repo admins — are rejected outright. Approvals aren't currently required (solo repo), but the PR requirement itself is what matters here. |
| `required_status_checks` (strict policy) | A PR cannot merge unless `Build and verify`, `Scan dependency changes`, `Audit build`, and `Check links` all pass **against the current state of `main`** — see "strict policy" below. |

Bypass list: **empty**, and `current_user_can_bypass` reports `never`. That's not a placeholder — it means literally no one, including the repo owner, can push directly to `main` or skip these checks. If that ever becomes too restrictive (e.g. an urgent hotfix), the fix is to explicitly add a bypass actor in the ruleset settings — not to disable the ruleset entirely.

## Why bother with this (concretely, not hypothetically)

Each of these has already mattered in this repo's actual history, not just in theory:

1. **Nothing broken reaches the live site silently.** Before this ruleset, a direct push to `main` with a failing build or type error would still trigger `deploy.yml` and go live. Now `Build and verify` must pass first.
2. **It catches interaction between concurrent changes.** Two PRs (#11 and #12) independently touched `link-check.yml` — one fixed a `--root-dir` bug, the other removed an obsolete `--exclude-mail` flag. Without "strict status checks" (see below), the second PR could have merged on top of stale `main`, silently losing or conflicting with the first. The strict policy forced a re-test against the *combined* state instead.
3. **Vulnerable dependencies get a hard stop, not just a warning.** `Scan dependency changes` (`fail-on-severity: high`) now actually blocks a merge instead of posting an ignorable status.
4. **History can't be rewritten or deleted by mistake** (`non_fast_forward` + `deletion`).
5. **Every change has a paper trail** — a diff, a description, and a check history — useful later for figuring out when and why something changed, even working solo.

The tradeoff is friction: even a one-line config fix needs a branch + PR + waiting for CI to go green, and if `main` moves while your PR is open, you have to re-sync before merging.

## The "strict status checks" / "branch is out of date" behavior

`strict_required_status_checks_policy: true` means a PR's checks must have run against a merge of your branch with the **latest** `main` — not whatever `main` looked like when you branched. If `main` gains a new commit while your PR is open, GitHub shows:

> This branch is out-of-date with the base branch.

...and disables the merge button, even if every check shows green, until you click **Update branch** (or merge/rebase `main` into your branch manually) and the checks re-run against the updated combination. This is exactly what happened with PR #12 after PR #11 merged first — it isn't a bug, it's the strict policy doing its job.

## How to change it

Via the GitHub UI: **Settings → Rules → Rulesets → `main-protection`**.

Via the API (what was used to inspect it here):

```sh
gh api repos/<owner>/<repo>/rulesets
gh api repos/<owner>/<repo>/rulesets/<id>
```
