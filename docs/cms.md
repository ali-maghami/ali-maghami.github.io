# Content Management (Sveltia CMS)

Project pages live as markdown in [`src/content/projects/`](../src/content/projects/), validated
against the Zod schema in [`src/content.config.ts`](../src/content.config.ts). Editing them means
editing files. [Sveltia CMS](https://github.com/sveltia/sveltia-cms) puts a browser UI over
exactly those files, so content can be written from any device without a clone, a branch, or a
text editor.

It is a *git-based* CMS: there is no database and no content API. The editor reads and writes the
same markdown through the GitHub API, and every save is a real commit.

## Why this CMS and not another

Two constraints in this repo eliminate almost every alternative:

1. **The site is static, on GitHub Pages.** There is no server and no serverless runtime, so a
   CMS that needs a backend (Keystatic in GitHub mode, self-hosted TinaCMS, Payload, Directus)
   cannot run here.
2. **`main` is protected.** See [branch-protection.md](./branch-protection.md). Nothing may push
   to `main` directly, so a CMS that commits straight to the default branch would either be
   blocked or force the protection to be weakened.

Sveltia satisfies both. It runs entirely in the browser as two static files under
[`public/admin/`](../public/admin/), and its **editorial workflow** turns every publish into a
branch and a pull request — which [`pr-checks.yml`](../.github/workflows/pr-checks.yml) then gates
exactly as it would a change written by hand. Content edits get the same review and the same CI
as code.

## The one piece that needs hosting

GitHub's OAuth flow requires exchanging a temporary code for an access token, and that exchange
must happen server-side because it uses a client secret. GitHub Pages cannot do this.

The standard solution is a tiny Cloudflare Worker that does nothing but that exchange. It is free,
it holds no content, and it sees a token only in transit.

```
Browser (/admin) ──▶ GitHub OAuth ──▶ Cloudflare Worker ──▶ token ──▶ Browser ──▶ GitHub API
```

## Setup

Three steps, roughly twenty minutes. Steps 1 and 2 need your GitHub and Cloudflare logins, so they
cannot be automated from inside the repo.

### 1. Create a GitHub OAuth App

GitHub → **Settings** → **Developer settings** → **OAuth Apps** → **New OAuth App**.

| Field | Value |
|---|---|
| Application name | anything, e.g. `Portfolio CMS` |
| Homepage URL | `https://ali-maghami.github.io` |
| Authorization callback URL | `https://<your-worker>.workers.dev/callback` |

You will not know the worker subdomain until step 2 — create the app with a placeholder, then come
back and correct the callback URL. Save the **Client ID** and generate a **Client Secret**.

### 2. Deploy the auth worker

Deploy [`sveltia-cms-auth`](https://github.com/sveltia/sveltia-cms-auth) to Cloudflare Workers
(the repo has a one-click deploy button). Then set these as Worker **environment variables** —
mark both as encrypted/secret:

| Variable | Value |
|---|---|
| `GITHUB_CLIENT_ID` | from step 1 |
| `GITHUB_CLIENT_SECRET` | from step 1 |
| `ALLOWED_DOMAINS` | `ali-maghami.github.io` |

`ALLOWED_DOMAINS` matters: without it the worker will broker auth for any site that points at it.

### 3. Point the config at the worker

In [`public/admin/config.yml`](../public/admin/config.yml), replace the placeholder:

```yaml
backend:
  base_url: https://REPLACE-WITH-YOUR-WORKER.workers.dev
```

Commit that on a branch and merge it as usual. The editor is then live at
**https://ali-maghami.github.io/admin/**.

Only accounts with write access to this repo can log in — GitHub itself enforces that, since the
CMS acts purely through the API as the signed-in user.

## How editing works day to day

1. Open `/admin/` and sign in with GitHub.
2. Create or edit a project. Fields map 1:1 to the frontmatter schema.
3. Save as a draft — this opens a branch and a PR. CI runs against it.
4. Review the PR (a real diff of the markdown), then merge.
5. [`deploy.yml`](../.github/workflows/deploy.yml) publishes the site.

Nothing about this bypasses the normal pipeline. A CMS edit and a hand-written commit are
indistinguishable by the time they reach `main`.

## Keeping the config and the schema in sync

The field list in `config.yml` mirrors `src/content.config.ts`. **If you change one, change the
other.** They are not automatically linked, and a drift shows up as a PR that fails `astro check`
rather than as a broken site — which is the failure mode you want, but still a failure.

Two subtleties worth knowing before editing either file:

- **`heroImage` uses relative paths.** Astro's `image()` helper resolves it relative to the
  markdown file, not the site root, so the collection sets `media_folder: '../../assets/work'`
  rather than a `/public`-rooted path. Images live in [`src/assets/work/`](../src/assets/work/)
  so that Astro can optimise them; anything in `public/` would be served unprocessed.
- **Cleared optional fields arrive as `''`, not as absent.** `repoUrl` and `liveUrl` are therefore
  wrapped in a `z.preprocess` that maps blank to `undefined`. Without it, an editor who types a URL
  and then deletes it produces `repoUrl: ''`, which fails `.url()` and breaks the build — on a PR
  the CMS itself opened. Keep that wrapper if you add further optional URL fields.

## Upgrading

The CMS is loaded from a CDN at a pinned version in
[`public/admin/index.html`](../public/admin/index.html):

```html
<script src="https://unpkg.com/@sveltia/cms@0.205.0/dist/sveltia-cms.js" type="module"></script>
```

The pin is deliberate. This is a pre-1.0 package running on a public page with write access to the
repo; an unpinned URL would let an upstream release change what executes here without review. Bump
the version on purpose, and check the [changelog](https://github.com/sveltia/sveltia-cms/releases)
when you do.
