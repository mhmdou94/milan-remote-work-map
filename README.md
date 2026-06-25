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

Fetch and sync places from OSM Overpass API:

```bash
npm run worker
```

This will:
1. Fetch places with `laptop=yes` from Italy
2. Store them in SQLite
3. Serve via REST API at `GET /api/places?bbox=...`

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
- **Data**: OpenStreetMap (Overpass API)

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
