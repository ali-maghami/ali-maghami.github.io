# Hetzner portfolio deployment

The public portfolio at `maghami.dev` is an Astro Node application that renders
published content from the dedicated `portfolio` PostgreSQL database. The CMS
remains a separate application and Compose project at `cms.maghami.dev`.

## Runtime boundary

```text
Caddy (infra, ports 80/443)
  |
  +-- maghami.dev ---- portfolio:8080 (this repository, Astro Node)
  |
  +-- write.maghami.dev ---- contentflow:3000 (unchanged)

PostgreSQL (data network only)
  |
  +-- portfolio-cms ---- portfolio_cms (migrations + read/write)
  +-- portfolio ---- portfolio_reader (SELECT on public portfolio tables only)
```

The portfolio joins `edge` for Caddy and `data` for PostgreSQL. Its
`.env.reader` contains only the `portfolio_reader` URL. That role cannot read
Auth.js accounts or revisions and cannot change any row. ContentFlow keeps its
own database and credentials.

## One-time server setup

1. Confirm the external network exists:

   ```sh
   docker network inspect edge
   ```

2. Create the application directory and copy the generated reader environment
   from the CMS directory without printing its password:

   ```sh
   mkdir -p /home/ali/apps/portfolio
   install -m 0600 /home/ali/apps/portfolio-cms/.env.reader /home/ali/apps/portfolio/.env.reader
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

The image is a multi-stage build: Node builds the Astro standalone server, then
a minimal Node runtime serves dynamic pages and static assets. The shared CMS
upload volume is mounted read-only at `/app/uploads`.

```sh
docker compose -f compose.prod.yml build
docker compose -f compose.prod.yml up -d
docker inspect --format '{{.State.Health.Status}}' portfolio
```

The Docker build sets `SITE_URL=https://maghami.dev`, which is also the local
default now that the apex is canonical. Set `SITE_URL` explicitly only for an
intentional preview origin.

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
- Keep the previous container image and Caddy configuration as the immediate
  rollback target.

No production cutover should happen from an unmerged feature branch.
