# Project Documentation

This directory documents how this repository is built, tested, protected, and deployed. It's written for anyone joining the project — human or AI agent — who needs to understand *why* things are set up this way, not just *what* the config says.

- **[ci-cd.md](./ci-cd.md)** — What each GitHub Actions workflow does, step by step, and what its output means.
- **[branch-protection.md](./branch-protection.md)** — The rules that govern what can land on `main`, and why each one exists.
- **[agentic-workflows.md](./agentic-workflows.md)** — How AI coding agents (Claude Code and similar) should operate in this repo, given the above.
- **[cms.md](./cms.md)** — The Git-backed editor that used to live at `/admin/`, why it was replaced by cms.maghami.dev, and what was removed with it.

For Astro-specific development instructions (dev server usage, content structure, framework docs), see [`AGENTS.md`](../AGENTS.md) at the repo root. For the general project overview, see [`README.md`](../README.md).
