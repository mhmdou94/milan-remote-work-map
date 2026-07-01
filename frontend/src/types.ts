export interface Place {
  id: string;
  name: string;
  category?: string;
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  internetAccess?: InternetAccess;
  sockets?: 'yes' | 'no' | 'many';
  openingHours?: string;
  laptopStatus?: 'yes' | 'no' | 'restricted';
  laptopConditional?: string;
  wifiSsid?: string;
  wifiFee?: 'yes' | 'no' | 'customers';
  wifiPassword?: 'yes' | 'no';
  wheelchair?: 'yes' | 'no' | 'limited';
  airConditioning?: 'yes' | 'no';
  outdoorSeating?: 'yes' | 'no';
  indoorSeating?: 'yes' | 'no';
  smoking?: 'yes' | 'no' | 'outside' | 'separated';
  level?: string;
  phone?: string;
  website?: string;
  fee?: 'yes' | 'no';
  charge?: string;
  reservation?: 'yes' | 'no' | 'recommended';
  capacity?: string;
  brand?: string;
  drinkingWater?: 'yes' | 'no';
  toilets?: 'yes' | 'no';
  toiletsWheelchair?: 'yes' | 'no';
  dog?: 'yes' | 'no' | 'leashed';
  osmId?: string;
  osmTags?: Record<string, string>;
  source: 'osm' | 'manual';
  verified: boolean;
  verifiedBy?: string;
  lastChecked?: string;
  lastSynced?: string;
  deletedAt?: string;
  // Client-side only: set when this Place was synthesized from a
  // PlaceCandidate suggestion rather than fetched from /api/places, so the
  // modal can show the "help us verify" banner.
  unverified?: boolean;
}

export interface BBox {
  minLat: number;
  minLon: number;
  maxLat: number;
  maxLon: number;
}

export type TransitKind = 'bus_stop' | 'tram_stop' | 'rail_stop' | 'bicycle_parking';

export interface TransitStop {
  id: string;
  kind: TransitKind;
  name?: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
}

export interface PlaceCandidate {
  id: string;
  osmId: string;
  name: string;
  category?: string;
  latitude: number;
  longitude: number;
  address?: string;
  internetAccess?: InternetAccess;
  sockets?: 'yes' | 'no' | 'many';
  osmTags?: Record<string, string>;
}

export type InternetAccess = 'yes' | 'no' | 'wired' | 'wlan';

export interface WorkerRunRegion {
  regionName: string;
  startedAt: string;
  completedAt: string | null;
  placesFetched: number | null;
  transitStops: number | null;
  candidates: number | null;
}

export interface WorkerRun {
  startedAt: string;
  completedAt: string | null;
  status: 'running' | 'success' | 'failed';
  error: string | null;
  placesFetched: number | null;
  inserted: number | null;
  updated: number | null;
  restored: number | null;
  deleted: number | null;
  transitPruned: number | null;
  candidatesPruned: number | null;
  regions: WorkerRunRegion[];
}

export interface HealthInfo {
  status: string;
  buildDate: string;
  buildSha: string;
  lastWorkerRun: WorkerRun | null;
}
