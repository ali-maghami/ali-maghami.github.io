# The editor that used to live at `/admin/`

This document described a Sveltia CMS instance served from `public/admin/`: a
browser UI over the Markdown in `src/content/`, authenticating through GitHub
and a Cloudflare Worker, committing each save straight to `main` so a push
rebuilt the site.

**It is gone.** It was replaced by [`cms.maghami.dev`](https://cms.maghami.dev),
which writes to PostgreSQL, and it has now been removed along with the content
it edited. This page is kept as the record of what happened to it, because a
removal like this is the kind of thing you go looking for an explanation of a
year later.

## Why it was removed rather than left in place

It had stopped being an editor and become a trap.

The site stopped reading `src/content/` when content moved into the database.
The editor kept working — it would still authenticate, still show the fields,
still commit to `main` — but nothing it saved could reach the published site.
Editing through it produced a green build, a successful deploy, and no change
whatsoever.

Two smaller problems came with it:

- It was **publicly served**. `https://maghami.dev/admin/` answered 200, and so
  did its `config.yml`, which described the repository layout and the OAuth
  worker endpoint. Writing still required GitHub access to the repository, so
  this was exposure rather than a hole — but exposure with no upside left.
- Its `src/content/` Markdown was **months out of date** and drifting further
  with every edit made in the real CMS, while looking authoritative to anyone
  reading the repository. It was also what the site silently fell back to when
  `PORTFOLIO_DATABASE_URL` was missing.

## What was removed

| Path | What it was |
|---|---|
| `public/admin/` | The editor UI, its `config.yml`, and the video block component |
| `src/content/` | The Markdown the editor wrote, superseded by the database |
| `src/content.config.ts` | The Astro collection schemas mirroring `config.yml` |
| `src/lib/schema.ts` | Zod helpers used only by those collection schemas |
| `src/consts.ts`, `src/data/settings.json` | Site settings, now read from `portfolio_setting`; `consts.ts` was already imported by nothing |

Three test files went with their subjects: `schema.test.ts`,
`content-media.test.ts` (which guarded Markdown media paths for the retired
editor) and `video-block.test.ts` (which imported
`public/admin/video-block.js`). The video block's *output* still renders —
bodies stored in the database contain that markup and the Markdown pipeline
passes it through — only the editor that produced it is gone.

`public/media/` was kept: those files are referenced by bodies that now live in
the database.

## What replaced it

[`cms.maghami.dev`](https://cms.maghami.dev), in the
[portfolio-cms](https://github.com/ali-maghami/portfolio-cms) repository. It
authenticates with Google against an allowlist, writes to the `portfolio`
database as a role that owns the content tables, and this site reads the same
database through a separate role holding `SELECT` on seven tables and nothing
else. A save is visible immediately, with no commit and no rebuild.

## The one thing to carry forward

There is no fallback any more. `PORTFOLIO_DATABASE_URL` is required and the site
fails loudly without it — `/healthz` returns 503 naming the missing variable,
and the deployment waits on that. This is deliberate: the previous behaviour was
to serve the stale Markdown described above with a 200 and no error, which is
how a broken deploy could look like a working one.
