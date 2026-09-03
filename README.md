# Ali Maghami — personal site and portfolio

The source of [ali-maghami.github.io](https://ali-maghami.github.io) — a static site built with
[Astro](https://astro.build/), edited through a browser-based CMS, and deployed to GitHub Pages on
every push to `main`.

Computer vision, AI and robotics: projects, posts, publications and certifications.

## How it works

Content is markdown in [`src/content/`](./src/content/), validated against Zod schemas in
[`src/content.config.ts`](./src/content.config.ts). Astro renders it to static HTML at build time —
there is no server and no database.

Editing happens two ways, and both end in the same place:

- **In the browser.** [Sveltia CMS](https://github.com/sveltia/sveltia-cms) at `/admin` writes the
  same markdown files. Save commits straight to `main`, and the deploy publishes. One button, no
  review step. See [`docs/cms.md`](./docs/cms.md).
- **In an editor.** Edit the markdown, open a pull request, merge.

A save that breaks a schema fails the build, so nothing is deployed and the live site stays on its
last good version until the entry is fixed.

## Content

| Collection | Where | What it holds |
|---|---|---|
| `home` | [`src/content/home/`](./src/content/home/) | The hero: heading, lede, portrait and its treatment, how many cards each column shows |
| `about` | [`src/content/about/`](./src/content/about/) | The about page |
| `blog` | [`src/content/blog/`](./src/content/blog/) | Posts, with an optional hero image or video |
| `projects` | [`src/content/projects/`](./src/content/projects/) | Work, each with a stage, a category, a card colour and any contributors |
| `papers` | [`src/content/papers/`](./src/content/papers/) | Publications, with tags and an optional PDF |
| `certificates` | [`src/content/certificates/`](./src/content/certificates/) | Credentials, shown as badges in the footer |

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

Requires Node 22.12 or newer.

```sh
npm install
npm run dev      # development server
npm run build    # static build into dist/
npm run preview  # serve that build
npm run lint     # astro check — types and Astro diagnostics
npm test         # vitest
```

## Tests

The logic that would be awkward to verify by eye lives in [`src/lib/`](./src/lib/) as pure modules,
each with a test beside it: link handling, media options, card gradients, navigation state, schema
coercion, and the CMS video block's round trip between editor fields and markup.

One test reads the CMS config and both CI workflows and asserts they agree — adding a media folder
to the CMS without telling the workflows would otherwise make every image upload run the full CI
set instead of just the deploy.

## Styling

Design tokens and layout live in [`src/styles/global.css`](./src/styles/global.css) as custom
properties. Tailwind is imported for its reset and utilities, but most styling is hand-written CSS,
scoped per component.

The page background is a soft wash that picks a different palette on each load — see
[`src/lib/palettes.ts`](./src/lib/palettes.ts).

## Deployment and CI

`main` deploys to GitHub Pages on every push, including a CMS save.

| Workflow | Runs on | Purpose |
|---|---|---|
| [`deploy.yml`](./.github/workflows/deploy.yml) | push to `main` | Build and publish. Never filtered — a save must always publish. |
| [`pr-checks.yml`](./.github/workflows/pr-checks.yml) | push to `main` | Lint, test, build. Skipped when a push only touches content. |
| [`codeql.yml`](./.github/workflows/codeql.yml) | push to `main`, weekly | Static analysis. Skipped on content-only pushes. |
| [`link-check.yml`](./.github/workflows/link-check.yml) | weekly | Finds dead links. |
| [`dependency-review.yml`](./.github/workflows/dependency-review.yml) | pull requests | Flags vulnerable dependencies. |
| [`lighthouse.yml`](./.github/workflows/lighthouse.yml) | manual | Performance and accessibility audit on demand. |

Nothing gates a merge. Checks run after code lands and a failure is a notification rather than a
barrier — the site is protected regardless, because a broken commit fails the deploy and the last
good version stays live.

`main` is protected against deletion and force-pushing, with no bypass. It deliberately does **not**
require pull requests: the CMS commits directly, and that rule would stop saving from working.

## Documentation

[`docs/`](./docs/) explains why things are set up this way, not just what the config says:

- [`docs/cms.md`](./docs/cms.md) — the CMS, the GitHub OAuth app, and the Cloudflare Worker that
  brokers the token exchange
- [`docs/ci-cd.md`](./docs/ci-cd.md) — what each workflow does and what its output means
- [`docs/branch-protection.md`](./docs/branch-protection.md) — the rules on `main`, and why
- [`docs/agentic-workflows.md`](./docs/agentic-workflows.md) — how AI coding agents should work here

## Licence

No licence file is set, so all rights are reserved by default — the code here is readable but not
licensed for reuse. Open an issue if you want to use part of it.

Site content is separate in any case: the writing, portrait, project imagery, publications and
certification badges are © Ali Maghami or their respective owners. The fonts are under the SIL Open
Font Licence and carry their own terms.
