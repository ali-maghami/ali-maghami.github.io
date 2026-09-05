# syntax=docker/dockerfile:1

FROM node:22-alpine AS build

WORKDIR /app

# Install first so content-only changes can reuse the dependency layer.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Astro embeds the canonical URL in generated metadata and the sitemap. This
# image targets the production domain unless another origin is supplied.
ARG SITE_URL=https://maghami.dev
ENV SITE_URL=${SITE_URL}

RUN npm run build

FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8080

# The commit this image was built from, reported by /healthz. The deploy script
# supplies it; a build without it says so rather than guessing.
ARG GIT_REVISION=unknown
ENV GIT_REVISION=${GIT_REVISION}

COPY --from=build /app/dist/ ./dist/
COPY --from=build /app/node_modules/ ./node_modules/
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/public/ ./public/

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8080/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "./dist/server/entry.mjs"]
