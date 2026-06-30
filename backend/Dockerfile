# Build context must be the repo root, e.g.:
#   docker build -f backend/Dockerfile -t milan-remote-work-map-backend .
#
# osmium-tool is a hard runtime dependency of `npm run worker` (backend/src/worker/pbf.ts
# shells out to `osmium tags-filter` / `osmium export`), so it has to be present in
# whatever image runs either the server or the worker.
FROM node:20-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    osmium-tool \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . .
RUN npm install && npm run build --workspace=backend

# Default to the API server. Override the command to run the worker instead, e.g.:
#   docker run <image> node backend/dist/worker.js
CMD ["node", "backend/dist/server.js"]
