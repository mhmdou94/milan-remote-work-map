import { BBox } from '../types.js';

/** Returns `undefined` if no bbox was given, `null` if it's malformed. */
export function parseBboxParam(bboxStr: string | undefined): BBox | null | undefined {
  if (!bboxStr) return undefined;

  const [minLat, minLon, maxLat, maxLon] = bboxStr.split(',').map(Number);
  if (isNaN(minLat) || isNaN(minLon) || isNaN(maxLat) || isNaN(maxLon)) {
    return null;
  }

  return { minLat, minLon, maxLat, maxLon };
}
