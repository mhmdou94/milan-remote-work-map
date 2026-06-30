import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import type { ReadableStream as NodeWebReadableStream } from 'stream/web';
import { PbfRegion } from './regions.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PBF_DIR = path.join(__dirname, '../../../pbf');

function findCachedPbf(regionName: string): string | undefined {
  if (!fs.existsSync(PBF_DIR)) return undefined;

  const matches = fs
    .readdirSync(PBF_DIR)
    .filter((f) => f.startsWith(`${regionName}-`) && f.endsWith('.osm.pbf'))
    .map((f) => path.join(PBF_DIR, f))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);

  return matches[0];
}

export async function downloadPbf(region: PbfRegion): Promise<string> {
  const cached = findCachedPbf(region.name);
  if (cached) {
    console.log(`  📦 Using cached PBF for ${region.name}: ${path.basename(cached)}`);
    return cached;
  }

  fs.mkdirSync(PBF_DIR, { recursive: true });
  const destPath = path.join(PBF_DIR, `${region.name}-latest.osm.pbf`);

  console.log(`  📥 Downloading ${region.url} ...`);
  const response = await fetch(region.url);
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download ${region.url}: ${response.status} ${response.statusText}`);
  }

  const tmpPath = `${destPath}.part`;
  await pipeline(
    Readable.fromWeb(response.body as NodeWebReadableStream),
    fs.createWriteStream(tmpPath)
  );
  await fs.promises.rename(tmpPath, destPath);

  console.log(`  ✅ Downloaded ${region.name} to ${path.basename(destPath)}`);
  return destPath;
}
