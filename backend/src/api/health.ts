import { Request, Response } from 'express';
import { Knex } from 'knex';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getLastWorkerRun } from '../db/queries.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// From backend/dist/api/ go up three levels to reach the app root (/opt/app)
const appRoot = path.join(__dirname, '../../..');

function readFileTrimmed(filePath: string, fallback: string): string {
  try {
    return fs.readFileSync(filePath, 'utf8').trim() || fallback;
  } catch {
    return fallback;
  }
}

export function createHealthRoute(db: Knex) {
  return async (_req: Request, res: Response) => {
    const buildDate = readFileTrimmed(path.join(appRoot, 'BUILD_DATE'), 'local');
    const buildSha = readFileTrimmed(path.join(appRoot, 'BUILD_SHA'), 'local');
    const lastWorkerRun = await getLastWorkerRun(db);

    res.json({
      status: 'ok',
      buildDate,
      buildSha,
      lastWorkerRun,
    });
  };
}
