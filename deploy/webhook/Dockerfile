# syntax=docker/dockerfile:1
#
# Tiny deploy webhook: receives an authenticated POST and runs
# `docker compose pull && up -d` against the host's Docker daemon
# (Docker socket bind-mounted in). Self-contained so it's portable across
# hosts - just `docker compose up -d` this image alongside the app.

FROM node:22-alpine

RUN apk add --no-cache docker-cli docker-cli-compose

WORKDIR /app
COPY server.mjs ./

EXPOSE 9090
CMD ["node", "server.mjs"]
