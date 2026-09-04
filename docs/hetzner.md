# Hetzner portfolio deployment

This is the first stage of moving the public portfolio to `maghami.dev`. It
deploys the existing static site as its own container and deliberately leaves
`write.maghami.dev`, ContentFlow and PostgreSQL untouched.

The later database-backed CMS will be a separate application at
`cms.maghami.dev`. It will not be added to this repository.

## Runtime boundary

```text
Caddy (infra, ports 80/443)
  |
  +-- maghami.dev ---- portfolio:8080 (this repository)
  |
  +-- write.maghami.dev ---- contentflow:3000 (unchanged)
```

The portfolio joins only the external `edge` network. It does not join the
`data` network and therefore cannot reach the shared PostgreSQL container. When
the public site becomes database-backed, it will join `data` with a dedicated
read-only PostgreSQL role; it will never receive ContentFlow credentials.

## One-time server setup

1. Confirm the external network exists:

   ```sh
   docker network inspect edge
   ```

2. Create the application directory:

   ```sh
   mkdir -p /home/ali/apps/portfolio
   ```

3. Merge [`deploy/Caddyfile.portfolio`](../deploy/Caddyfile.portfolio) into
   `/home/ali/infra/Caddyfile` and validate it from `/home/ali/infra`:

   ```sh
   docker compose exec caddy caddy validate --config /etc/caddy/Caddyfile
   docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile
   ```

Caddy should be reloaded only after the portfolio container is healthy. The A
records for `maghami.dev` and `www.maghami.dev` already point to the server.

## Build locally

The image is a multi-stage build: Node builds the Astro site, then nginx serves
only the generated files.

```sh
docker compose -f compose.prod.yml build
docker compose -f compose.prod.yml up -d
docker inspect --format '{{.State.Health.Status}}' portfolio
```

The Docker build sets `SITE_URL=https://maghami.dev`. Local and GitHub Pages
builds retain `https://ali-maghami.github.io` unless `SITE_URL` is explicitly
provided, so preparing this deployment does not change the current canonical
URLs.

## Deploy from a trusted workstation

[`scripts/deploy-hetzner.sh`](../scripts/deploy-hetzner.sh) follows the same
credential-free server model as ContentFlow: it archives the committed `HEAD`,
copies it over SSH, builds the image on the server, starts the container, waits
for its health check and verifies the public URL.

Run it from Git Bash, WSL or another Bash environment:

```sh
./scripts/deploy-hetzner.sh
```

The script refuses to deploy a dirty working tree. Override `DEPLOY_TARGET`,
`APP_DIR` or `VERIFY_URL` only when intentionally targeting a different host or
staging domain.

## Cutover checklist

- Build and start the portfolio container.
- Verify `http://portfolio:8080/healthz` from the Caddy container.
- Add and validate the Caddy site blocks.
- Reload Caddy and verify the apex and `www` redirect externally.
- Confirm canonical URLs, sitemap, robots, internal links and media.
- Keep GitHub Pages available as the rollback target until the new host is
  stable.

No production cutover should happen from an unmerged feature branch.
