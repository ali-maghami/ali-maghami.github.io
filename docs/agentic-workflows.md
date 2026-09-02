# Working with AI Coding Agents in This Repo

This repo is actively edited by AI coding agents (Claude Code and similar). This document covers the parts of that workflow that are specific to *this* repo's setup — for general Astro development instructions, see [`AGENTS.md`](../AGENTS.md).

## Direct commits to `main` are not possible — plan for a branch + PR

Because of the [branch protection ruleset](./branch-protection.md), `main` cannot be pushed to directly by anyone, agent or human. Even a one-line config fix needs:

1. A feature branch (e.g. `fix/link-check-exclude-mail`, `docs/ci-cd-and-agentic-workflows`)
2. A push to `origin`
3. A PR into `main`
4. All required checks passing (`Build and verify`, `Scan dependency changes`, `Audit build`, `Check links`)

An agent that tries to `git commit` + `git push` straight to `main` will have the push rejected. Default to branching for any change, not just large ones.

## Check for in-flight work on the same files before starting

This already went wrong once: PRs #11 and #12 both modified `.github/workflows/link-check.yml` independently and in parallel — one added `--root-dir`, the other removed an obsolete `--exclude-mail` flag. They happened not to conflict, but they easily could have, and the second PR only discovered the first had already merged when GitHub flagged it as "out of date with base branch."

Before starting work, check `gh pr list` and recent `git log` for the files you're about to touch. If another PR is already in flight on the same file, either wait for it to merge and rebase, or coordinate rather than duplicating the fix blind.

## Commit and PR conventions

- Commit messages end with:
  ```
  Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
  ```
- PR descriptions end with:
  ```
  🤖 Generated with [Claude Code](https://claude.com/claude-code)
  ```
- Always create new commits rather than amending, unless explicitly asked to amend.
- Never skip hooks (`--no-verify`) or force-push unless explicitly asked.

## Write PR descriptions that actually explain the change

A PR template scaffolds a description, but doesn't force anyone — human or agent — to fill it in with real content instead of leaving placeholders. Every PR from an agent should include, in its own words, not just the template's placeholder text:

- **Summary** — what changed, in 1–3 bullets
- **Scope** — what this PR touches, and explicitly what it does *not* touch
- **Why** — the motivation: a bug, a decision, a requirement
- **Test plan** — how it was verified (commands run, checks observed, manual steps)

If this repo later adopts a `.github/pull_request_template.md` (see the recommendation below), fill out every section with real content — an agent leaving the placeholder comments (`<!-- ... -->`) in place defeats the purpose of having a template at all.

### Recommended, not yet implemented: an enforced PR template

GitHub doesn't reject an empty or placeholder-only PR body on its own — a template is a scaffold, not a gate. If PR descriptions from agents ever become a problem in practice (too terse, missing rationale), the fix is a small required-status-check job that scans `github.event.pull_request.body` for leftover `<!-- -->` markers and fails if they're still present, added to the `main-protection` ruleset's required checks alongside `Build and verify`. This turns "fill out the template" from a norm into an actual gate. Not implemented as of this writing — just documented here as the path if it's ever needed.

## Why this matters for agents specifically

Agents move faster than humans at generating changes, which means the failure modes above (skipping review, duplicating in-flight work, thin PR descriptions) show up more often, not less. The ruleset and these conventions exist to make sure agent-authored changes get the same scrutiny as human-authored ones — not to slow agents down for its own sake.
