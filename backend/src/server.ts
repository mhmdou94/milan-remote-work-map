import express from 'express';
import { initDb, closeDb } from './db/init.js';
import { createPlacesRoute, createCitiesRoute } from './api/places.js';
import { createNearbyTransitRoute } from './api/transit.js';
import { createCandidatesRoute } from './api/candidates.js';
import { createPlaceByIdRoute } from './api/place-detail.js';

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

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/places', createPlacesRoute(db));
  app.get('/api/places/candidates', createCandidatesRoute(db));
  app.get('/api/places/:id', createPlaceByIdRoute(db));
  app.get('/api/cities', createCitiesRoute(db));
  app.get('/api/transit/nearby', createNearbyTransitRoute(db));

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
