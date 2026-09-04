#!/usr/bin/env bash
#
# Deploy the committed portfolio source to the isolated service on Hetzner.
#
#   ./scripts/deploy-hetzner.sh
#
# The server receives an archive rather than Git credentials. Caddy and the
# shared edge network are managed separately under /home/ali/infra.
set -euo pipefail

DEPLOY_TARGET="${DEPLOY_TARGET:-ali@2.28.69.77}"
APP_DIR="${APP_DIR:-/home/ali/apps/portfolio}"
VERIFY_URL="${VERIFY_URL:-https://maghami.dev/}"

if [ -n "$(git status --porcelain)" ]; then
  echo "Working tree is dirty. Commit first — deploys ship HEAD, not local changes."
  git status --short
  exit 1
fi

REV="$(git rev-parse --short HEAD)"
ARCHIVE="$(mktemp)"
trap 'rm -f "$ARCHIVE"' EXIT

echo "==> packaging ${REV}"
git archive --format=tar.gz -o "$ARCHIVE" HEAD

echo "==> shipping to ${DEPLOY_TARGET}"
scp -q "$ARCHIVE" "${DEPLOY_TARGET}:/tmp/portfolio.tar.gz"

ssh "$DEPLOY_TARGET" bash -s <<EOF
set -euo pipefail
mkdir -p "${APP_DIR}"
cd "${APP_DIR}"
tar xzf /tmp/portfolio.tar.gz
rm -f /tmp/portfolio.tar.gz

echo "==> building ${REV}"
docker compose -f compose.prod.yml build

echo "==> starting ${REV}"
docker compose -f compose.prod.yml up -d

echo "==> waiting for health"
state="starting"
for i in \$(seq 1 30); do
  state="\$(docker inspect --format '{{.State.Health.Status}}' portfolio 2>/dev/null || echo starting)"
  [ "\$state" = "healthy" ] && break
  sleep 2
done

echo "container: \$state"
[ "\$state" = "healthy" ]
EOF

echo "==> verifying ${VERIFY_URL}"
status="$(curl -sS -o /dev/null -w '%{http_code}' "$VERIFY_URL")"
echo "${VERIFY_URL} -> ${status}"
[ "$status" = "200" ]

echo "==> ${REV} is live"
