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

## Tech Stack

- **Frontend**: Vite + LitElement + Leaflet
- **Backend**: Express + SQLite + TypeScript
- **Data**: OpenStreetMap (Geofabrik PBF extracts via osmium-tool)


## Future

- [ ] SpatiaLite migration for spatial queries
- [ ] More OSM tags (wheelchair, quiet, etc.)
- [ ] Direct editing UI
- [ ] Localization
