# syntax=docker/dockerfile:1

FROM node:22-alpine AS build

WORKDIR /app

# Install first so content-only changes can reuse the dependency layer.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Astro embeds the canonical URL in generated pages and the sitemap. GitHub
# Pages continues to use astro.config.mjs's fallback; this image targets the
# new production domain unless a different value is supplied explicitly.
ARG SITE_URL=https://maghami.dev
ENV SITE_URL=${SITE_URL}

RUN npm run build

FROM nginx:1.29-alpine AS runtime

COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/ /usr/share/nginx/html/

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
