# Ali Maghami — personal site and portfolio

The source of [maghami.dev](https://maghami.dev) — an
[Astro](https://astro.build) Node application served from an isolated container
on Hetzner.

Computer vision, AI and robotics: projects, posts, publications and certifications.

## How it works

Published content is read at request time from a dedicated PostgreSQL database
through a least-privilege, read-only role. Drafts are never returned by public
queries. Uploaded images, videos and PDFs live in the CMS upload volume and are
mounted read-only into this application.

Editing happens in the private CMS at
[`cms.maghami.dev`](https://cms.maghami.dev). It provides collection editors,
rendered Markdown previews, direct media uploads, Home and About page controls,
and site/social/footer settings. A successful save is visible on the public
site without a Git commit or rebuild.

The database is the only source. There is no Markdown fallback: without
`PORTFOLIO_DATABASE_URL` the site refuses to serve rather than quietly
answering with something older. `/healthz` reports which source answered, and
the deployment waits on it.

## Content

| Collection | Database table | What it holds |
|---|---|---|
| `home`, `about` | `portfolio_page` | Page copy, repeatable sections and presentation options |
| `blog` | `portfolio_post` | Posts, with an optional hero image or video |
| `projects` | `portfolio_project` | Work, each with a stage, category, colours and contributors |
| `papers` | `portfolio_paper` | Publications, with tags and an optional PDF |
| `certificates` | `portfolio_certificate` | Credentials, including footer badges |
| site settings | `portfolio_setting` | Site identity, social links and footer configuration |
| media | `portfolio_media` | Metadata for files stored in the shared upload volume |

A project's frontmatter looks like this:

```yaml
---
title: StripSense
description: Measuring Reflective Surfaces with Stereo Vision
stage: piloted # napkin-sketch | research-prototype | piloted | completed | product
category: active # active | archived
pubDate: 2024-12-01
purpose: The longer answer to "what's it for?", shown beside the other facts.
contributors: [Sina Alborzi] # anyone besides the site owner
tags: [Computer Vision, Stereo Vision]
cardColor: '#4f95cf'
cardColorAlt: '#c066c2' # the card's wash fades through this on its way out
---
```

The projects page groups active work above archived; the home page shows active work only.

## Running it

Requires Node 22.12 or newer, and a portfolio database to read from —
`docker compose up -d postgres` in the portfolio-cms repository provides one,
and `PORTFOLIO_DATABASE_URL` must point at it.

```sh
npm install
npm run dev      # development server
npm run build    # standalone Node server in dist/
npm run preview  # serve that build
npm run lint     # astro check — types and Astro diagnostics
npm test         # vitest
```

## Tests

The logic that would be awkward to verify by eye lives in [`src/lib/`](./src/lib/) as pure modules,
each with a test beside it: link handling, media options, card gradients, navigation state, the
row-to-record mapping, byte ranges, image URLs and the request cache.

The queries themselves run against a real PostgreSQL in
`portfolio-data.integration.test.ts`. CI provides one; locally, start one and
apply the schema, then point the tests at it:

```sh
docker run -d --name portfolio-test -e POSTGRES_PASSWORD=portfolio -e POSTGRES_DB=portfolio -p 5432:5432 postgres:17-alpine
psql postgres://postgres:portfolio@localhost:5432/portfolio -v ON_ERROR_STOP=1 -f scripts/test-database.sql
PORTFOLIO_TEST_DATABASE_URL=postgres://postgres:portfolio@localhost:5432/portfolio npm test
```

Without that variable the integration file is skipped and everything else runs.

## Styling

Design tokens and layout live in [`src/styles/global.css`](./src/styles/global.css) as custom
properties. Tailwind is imported for its reset and utilities, but most styling is hand-written CSS,
scoped per component.

The page background is a soft wash that picks a different palette on each load — see
[`src/lib/palettes.ts`](./src/lib/palettes.ts).

## Deployment and CI

GitHub Actions validates application changes. It does not publish the live
site; production deployment is explicit and only uses a merged commit.

| Workflow | Runs on | Purpose |
|---|---|---|
| [`pr-checks.yml`](./.github/workflows/pr-checks.yml) | pull requests, push to `main` | Lint, test and build the standalone server. |
| [`codeql.yml`](./.github/workflows/codeql.yml) | push to `main`, weekly | Static analysis. Skipped on content-only pushes. |
| [`link-check.yml`](./.github/workflows/link-check.yml) | weekly | Finds dead links. |
| [`dependency-review.yml`](./.github/workflows/dependency-review.yml) | pull requests | Flags vulnerable dependencies. |
| [`lighthouse.yml`](./.github/workflows/lighthouse.yml) | manual | Performance and accessibility audit on demand. |

Application changes use a feature branch and pull request. After merge,
[`scripts/deploy-hetzner.sh`](./scripts/deploy-hetzner.sh) archives the committed
revision, builds it on the server, waits for container health and verifies the
public URL. Database content saves do not run this pipeline.

## Documentation

[`docs/`](./docs/) explains why things are set up this way, not just what the config says:

- [`docs/cms.md`](./docs/cms.md) — notes about the retired Git-backed editor
- [`docs/hetzner.md`](./docs/hetzner.md) — the isolated container and staged cutover to
  `maghami.dev`
- [`docs/ci-cd.md`](./docs/ci-cd.md) — what each workflow does and what its output means
- [`docs/branch-protection.md`](./docs/branch-protection.md) — the rules on `main`, and why
- [`docs/agentic-workflows.md`](./docs/agentic-workflows.md) — how AI coding agents should work here

## Licence

No licence file is set, so all rights are reserved by default — the code here is readable but not
licensed for reuse. Open an issue if you want to use part of it.

Site content is separate in any case: the writing, portrait, project imagery, publications and
certification badges are © Ali Maghami or their respective owners. The fonts are under the SIL Open
Font Licence and carry their own terms.
