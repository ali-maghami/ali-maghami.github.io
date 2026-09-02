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

### Troubleshooting a fresh deploy

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
