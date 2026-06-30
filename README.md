# Milan Remote Work Map — V2

Find places to work remotely in Milan. Data sourced from OpenStreetMap.

## Setup

This is a monorepo with frontend and backend workspaces.

```bash
# Install dependencies
npm install

# Start development servers (frontend + backend)
npm run dev

# Build for production
npm run build
```

## Development

**Frontend** runs on `http://localhost:5173`
**Backend** API on `http://localhost:3000`

### Frontend-only
```bash
npm run dev --workspace=frontend
```

### Backend-only
```bash
npm run dev --workspace=backend
```

## Worker

Sync places from Geofabrik OSM PBF extracts (requires `osmium-tool`:
`sudo apt-get install -y osmium-tool`):

```bash
npm run worker
```

This will, for each configured Italy region (`nord-ovest`, `nord-est`,
`centro`, `sud`, `isole`):
1. Download the region's `.osm.pbf` extract into `pbf/` (skipped if already cached)
2. Filter it down to `laptop=yes` nodes/ways/relations with `osmium tags-filter`
3. Export to GeoJSON with `osmium export` and normalize tags into places
4. Upsert into SQLite, then serve via REST API at `GET /api/places?bbox=...`

To sync a subset of regions (e.g. while testing), set `PBF_REGIONS`:

```bash
PBF_REGIONS=nord-ovest npm run worker --workspace=backend
```

Note: a partial-region run skips the soft-delete reconciliation step, since
it doesn't represent the full OSM dataset.

## API

### GET `/api/places`

Returns GeoJSON FeatureCollection of places.

**Query params:**
- `bbox=minLat,minLon,maxLat,maxLon` (required)
- `internet_access=yes` (optional)
- `sockets=yes` (optional)
- `open_now=1` (optional)

**Example:**
```
http://localhost:3000/api/places?bbox=45.3,9.0,45.6,9.4&internet_access=yes
```

## Tech Stack

- **Frontend**: Vite + LitElement + Leaflet
- **Backend**: Express + SQLite + TypeScript
- **Data**: OpenStreetMap (Geofabrik PBF extracts via osmium-tool)

## Project Structure

```
milan-remote-work-map/
├── frontend/              # Vite + LitElement SPA
│   ├── src/
│   │   ├── components/   # LitElement components
│   │   ├── app.ts        # Root component
│   │   ├── main.ts       # Entry point
│   │   └── index.html
│   └── package.json
├── backend/              # Express server + Worker
│   ├── src/
│   │   ├── api/         # REST endpoints
│   │   ├── db/          # Database layer
│   │   ├── worker/      # OSM sync logic
│   │   ├── server.ts    # Express app
│   │   └── worker.ts    # Worker CLI
│   └── package.json
└── V2.md                 # Specification
```

## Future

- [ ] SpatiaLite migration for spatial queries
- [ ] More OSM tags (wheelchair, quiet, etc.)
- [ ] Scheduled worker (cron)
- [ ] Direct editing UI
- [ ] Localization
