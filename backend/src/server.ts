import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb, closeDb } from './db/init.js';
import { createPlacesRoute, createCitiesRoute } from './api/places.js';
import { createNearbyTransitRoute } from './api/transit.js';
import { createCandidatesRoute } from './api/candidates.js';
import { createPlaceByIdRoute } from './api/place-detail.js';
import { createHealthRoute } from './api/health.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Mirrors both the repo layout (backend/src or backend/dist, frontend/dist as
// siblings of backend/) and the Docker image layout (/opt/app/backend/dist,
// /opt/app/frontend/dist), so the same relative path resolves in dev and prod.
const frontendDist = path.join(__dirname, '../../frontend/dist');

const app = express();
const PORT = process.env.PORT || 3000;

async function start() {
  const db = await initDb();

  // Middleware
  app.use(express.json());

  // CORS headers for frontend
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
  });

  app.get('/api/health', createHealthRoute(db));
  app.get('/api/places', createPlacesRoute(db));
  app.get('/api/places/candidates', createCandidatesRoute(db));
  app.get('/api/places/:id', createPlaceByIdRoute(db));
  app.get('/api/cities', createCitiesRoute(db));
  app.get('/api/transit/nearby', createNearbyTransitRoute(db));

  // Serve the built frontend (absent in dev, where Vite's own dev server
  // proxies /api instead) and fall back to index.html for client-side routes.
  if (fs.existsSync(frontendDist)) {
    // Vite output under /assets/ has content-hashed filenames — safe to cache forever.
    app.use(
      '/assets',
      express.static(path.join(frontendDist, 'assets'), { maxAge: '1y', immutable: true })
    );
    // index.html and other non-hashed files must not be cached so deploys take effect immediately.
    app.use(express.static(frontendDist, { maxAge: 0 }));
    app.use((req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      res.sendFile(path.join(frontendDist, 'index.html'));
    });
  }

  // Start server
  const server = app.listen(PORT, () => {
    console.log(`🗺️  Server running on http://localhost:${PORT}`);
    console.log(
      `📍 API endpoint: http://localhost:${PORT}/api/places?bbox=minLat,minLon,maxLat,maxLon`
    );
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('Shutting down...');
    server.close(async () => {
      await closeDb(db);
      process.exit(0);
    });
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
