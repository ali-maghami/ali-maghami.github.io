# Content Management (Sveltia CMS)

The site's content lives as markdown and JSON under [`src/content/`](../src/content/) and
[`src/data/`](../src/data/), validated against the schemas in
[`src/content.config.ts`](../src/content.config.ts). Editing it means editing files.
[Sveltia CMS](https://github.com/sveltia/sveltia-cms) puts a browser UI over exactly those files,
so content can be written from any device without a clone, a branch, or a text editor.

It is a *git-based* CMS: there is no database and no content API. The editor reads and writes the
same files through the GitHub API, and every save is a real commit.

## What is editable

| In the CMS | Writes to | Appears at |
|---|---|---|
| Projects | `src/content/projects/` | `/projects/` |
| Blog | `src/content/blog/` | `/blog/` |
| Papers | `src/content/papers/` | `/papers/` |
| Certificates | `src/content/certificates/` | `/certificates/` and the site footer |
| LinkedIn Posts | `src/content/posts/` | `/posts/` |
| Pages → Home page | `src/content/home/index.md` | the home page hero |
| Pages → About page | `src/content/about/index.md` | `/about/` |
| Settings → Site and social links | `src/data/settings.json` | title, description, header and footer links |

Three behaviours are worth knowing before you wonder whether something is broken:

- **Empty sections are hidden.** A section with no entries is dropped from the navigation rather
  than linking to an empty page — see `buildNavItems` in [`src/lib/nav.ts`](../src/lib/nav.ts).
  Blog, Papers and LinkedIn Posts therefore stay invisible until you add the first entry, and
  appear on their own once you do.
- **Only *featured* certificates reach the footer.** The footer renders on every page, so an
  unbounded list would grow into the layout. Everything appears on `/certificates/` regardless.
- **Blog drafts stay out of the built site.** A post with `draft: true` remains editable in the
  CMS and is not published, so a half-written post can be saved safely.

## Adding a LinkedIn post

There is no way to pull LinkedIn posts automatically. LinkedIn removed public RSS years ago, and
their API needs partner approval that does not cover reading your own feed. Anything claiming
otherwise is scraping, against their terms, and breaks often.

What does work is LinkedIn's own embed, one post at a time. On a **public** post, use `···` →
*Embed this post*, and take the long number out of the URN:

```
https://www.linkedin.com/embed/feed/update/urn:li:share:7123456789012345678
                                                        ^^^^^^^^^^^^^^^^^^^ this is the Post ID
```

Paste that number into the **Post ID** field. Only public posts can be embedded; a post limited to
connections renders as an empty box.

These are iframes that load LinkedIn's own scripts and tracking, which makes them by far the
heaviest thing on the site. They are lazy-loaded and confined to `/posts/` for that reason — think
twice before putting them on the home page.

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

This is already wired up — the section is here so it can be rebuilt or handed over.

Deploy the worker **first**. Its URL is needed by the OAuth app's callback, whereas the worker
does not need anything from the app until step 3, so this order avoids going back to edit a
placeholder.

### 1. Deploy the auth worker

Deploy [`sveltia-cms-auth`](https://github.com/sveltia/sveltia-cms-auth) to Cloudflare Workers —
its README has a one-click deploy button. Accept the prefilled `pnpm run deploy` deploy command
and leave the build command empty.

Leave **Protect with Cloudflare Access** off. The endpoint has to be publicly reachable, because
GitHub redirects the browser to it mid-login; putting Access in front breaks the flow.

Note the resulting URL. Ours is `https://sveltia-cms-auth.seyedali-maghami.workers.dev`.

### 2. Register a GitHub OAuth App

GitHub → **Settings** → **Developer settings** → **OAuth Apps** → **New OAuth App**.

| Field | Value |
|---|---|
| Application name | `ali-maghami.github.io` |
| Homepage URL | `https://ali-maghami.github.io` |
| Authorization callback URL | the worker URL + `/callback` |

The worker serves the callback at either `/callback` or `/oauth/redirect`, and starts the flow at
`/auth` or `/oauth/authorize`. The callback URL must match what GitHub has on file *exactly*, or
login fails with a redirect URI mismatch.

Two checkboxes on that form matter:

- **Allow wildcard matching** — leave off. It would let tokens be delivered to subdomains you do
  not control.
- **Expire user access tokens** — **leave off**, even though GitHub enables it by default. The
  worker implements only `grant_type: 'authorization_code'`; it has no `refresh_token` or
  `expires_in` handling anywhere. With expiry on, GitHub issues an 8-hour token plus a refresh
  token that nothing in this stack can redeem, so you are silently signed out of `/admin/` every
  8 hours. The cost of leaving it off is a non-expiring token, scoped to your own repos and held
  in your own browser on a single-user CMS.

Save the **Client ID** and generate a **Client Secret**.

### 3. Give the worker its credentials

Cloudflare → **Workers & Pages** → `sveltia-cms-auth` → **Settings** → **Variables and Secrets**:

| Variable | Value | Type |
|---|---|---|
| `GITHUB_CLIENT_ID` | from step 2 | Secret |
| `GITHUB_CLIENT_SECRET` | from step 2 | Secret |
| `ALLOWED_DOMAINS` | `ali-maghami.github.io` | Text |

`ALLOWED_DOMAINS` is not optional in practice. Without it the worker will broker GitHub logins for
any site that points at it, using your OAuth app.

### 4. Point the CMS at the worker

`base_url` in [`public/admin/config.yml`](../public/admin/config.yml) holds the worker URL, with no
trailing slash. The editor is then live at **https://ali-maghami.github.io/admin/**.

Only accounts with write access to this repo can log in — GitHub enforces that itself, since the
CMS acts purely through the API as the signed-in user.

### Troubleshooting

**Login opens a popup that 404s on the worker.** The OAuth app's *Authorization callback URL* is
missing its path. The worker serves only `/auth`, `/oauth/authorize`, `/callback` and
`/oauth/redirect` — the bare origin returns 404, so a callback registered without `/callback`
sends the code nowhere. The value must match GitHub's record exactly.

**Login fails with "OAuth app client ID or secret is not configured."** The credentials exist but
the deployed version predates them. Adding a variable in the Cloudflare dashboard creates a *new
version*; it is not live until it is deployed. Check **Deployments** and confirm the active
version is the newest one.

**Origin checking silently stops.** `ALLOWED_DOMAINS` is a plain-text variable, and the worker
repo's `wrangler.toml` has no `[vars]` block, so a git-triggered rebuild can drop it. The two
secrets survive; this one does not. Re-add it if logins keep working but the domain restriction
appears to have gone.

**A fresh deploy answers with a TLS error rather than an HTTP status.**

A brand-new `*.workers.dev` subdomain resolves in DNS before its TLS certificate finishes
provisioning. In that window the host answers with a TLS handshake failure
(`ERR_SSL_SSL/TLS_ALERT_HANDSHAKE_FAILURE`, or `schannel: SEC_E_ILLEGAL_MESSAGE` from curl on
Windows) rather than an HTTP status. That is not a misconfiguration — it clears on its own,
typically within half an hour. Confirm the deploy is otherwise healthy by checking that the
hostname resolves to a Cloudflare address.

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

Subtleties worth knowing before editing either file:

- **`heroImage` uses relative paths.** Astro's `image()` helper resolves it relative to the
  markdown file, not the site root, so the collection sets `media_folder: '../../assets/work'`
  rather than a `/public`-rooted path. Images live in [`src/assets/work/`](../src/assets/work/)
  so that Astro can optimise them; anything in `public/` would be served unprocessed.
- **A cleared optional field arrives empty, not absent — and how it is empty depends on the
  widget.** Text fields write `''`; number, date and image fields write `null`. Neither satisfies a
  plain `.optional()`, so every optional field is declared with the `optional()` helper from
  [`src/lib/schema.ts`](../src/lib/schema.ts) rather than `z.optional(...)`. **Use it for any
  optional field you add.**

  This matters more than it looks. A cleared number breaks the build loudly — `citations: null`
  fails with `Expected type "number", received "object"`, on a pull request the CMS itself opened.
  A cleared *date* fails silently instead: `z.coerce.date()` runs `new Date(null)`, which is
  1970-01-01 rather than an error, so a cleared expiry date would quietly render a certificate as
  long expired. `src/lib/schema.test.ts` covers both.
- **The home and about entries must exist.** Both pages render from a single-entry collection and
  throw a clear build error if the file is missing. Delete them and the site stops building; that
  is deliberate, since the alternative is a page that silently renders blank.
- **A deleted entry can survive a rebuild.** Astro caches the content layer in
  `node_modules/.astro`, which `rm -rf dist` does not clear. If a removed entry keeps appearing,
  delete `node_modules/.astro` and `.astro` before rebuilding.

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
