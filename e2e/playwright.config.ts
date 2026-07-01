import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FRONTEND_PORT = 4173;
const BACKEND_PORT = 4000;
// Isolated from the dev DB at backend/data/places.sqlite so e2e runs never
// touch (or get touched by) whatever the developer has running locally.
const DB_PATH = path.join(__dirname, '.tmp/e2e.sqlite');

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: `http://localhost:${FRONTEND_PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: [
    {
      // Reseeds a throwaway DB before every run so tests see a known,
      // deterministic set of places regardless of what's in the dev DB.
      command: `rm -f "${DB_PATH}" && npm run seed --workspace=backend && npm run dev --workspace=backend`,
      cwd: path.join(__dirname, '..'),
      env: { DB_PATH, PORT: String(BACKEND_PORT) },
      url: `http://localhost:${BACKEND_PORT}/api/health`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: 'npm run dev --workspace=frontend',
      cwd: path.join(__dirname, '..'),
      env: { PORT: String(FRONTEND_PORT), BACKEND_PORT: String(BACKEND_PORT) },
      url: `http://localhost:${FRONTEND_PORT}`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
