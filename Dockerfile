# syntax=docker/dockerfile:1
#
# Multi-stage build for milan-remote-work-map (Express + better-sqlite3 + Vite frontend).
# Builder stages run on the host platform for speed; prod-deps targets the
# deployment arch so native modules (better-sqlite3) are compiled correctly.
#
# This is an npm workspaces monorepo with a single root package-lock.json, so
# `npm ci` always installs all three workspaces (frontend, backend, e2e) -
# every workspace's package.json must be present for the lockfile to resolve,
# even though only frontend/backend's build output ends up in the final image.
#
# osmium-tool is a hard runtime dependency of `npm run worker`
# (backend/src/worker/*.ts shells out to `osmium tags-filter` / `osmium export`),
# so it's installed in the runner image alongside the server.

ARG BUILDPLATFORM

FROM --platform=$BUILDPLATFORM node:22-alpine AS deps

WORKDIR /opt/app

COPY package.json package-lock.json* ./
COPY frontend/package.json ./frontend/package.json
COPY backend/package.json ./backend/package.json
COPY e2e/package.json ./e2e/package.json

RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci --prefer-offline --no-audit

FROM deps AS frontend-builder

WORKDIR /opt/app

COPY frontend/ ./frontend/

RUN npm run build --workspace=frontend

FROM deps AS backend-builder

WORKDIR /opt/app

COPY backend/ ./backend/

RUN npm run build --workspace=backend

FROM node:22-slim AS prod-deps

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential python3 make \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/app

COPY package.json package-lock.json* ./
COPY frontend/package.json ./frontend/package.json
COPY backend/package.json ./backend/package.json
COPY e2e/package.json ./e2e/package.json

RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci --prefer-offline --no-audit --omit=dev

FROM node:22-slim AS runner

ARG BUILD_DATE
ARG BUILD_SHA

RUN apt-get update && apt-get install -y --no-install-recommends \
    osmium-tool ca-certificates \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
ENV TZ=UTC
ENV PORT=3000
ENV DB_PATH=/opt/app/data/places.sqlite

WORKDIR /opt/app

COPY --from=prod-deps --chown=node:node /opt/app/node_modules ./node_modules
COPY --from=backend-builder --chown=node:node /opt/app/backend/dist ./backend/dist
COPY --chown=node:node backend/package.json ./backend/package.json
COPY --from=frontend-builder --chown=node:node /opt/app/frontend/dist ./frontend/dist

RUN mkdir -p /opt/app/data && chown -R node:node /opt/app/data

RUN echo "${BUILD_DATE:-$(date -u +'%Y-%m-%d %H:%M')}" > /opt/app/BUILD_DATE && \
    echo "${BUILD_SHA}" > /opt/app/BUILD_SHA && \
    chown node:node /opt/app/BUILD_DATE /opt/app/BUILD_SHA

USER node

VOLUME ["/opt/app/data"]

EXPOSE 3000

# Default to the API server. Override the command to run the worker instead, e.g.:
#   docker run <image> node backend/dist/worker.js
CMD ["node", "backend/dist/server.js"]
