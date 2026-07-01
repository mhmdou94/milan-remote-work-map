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
  // Only set on the /api/places/:id detail response, when the id resolved to
  // a place_candidates row rather than a confirmed places row.
  unverified?: boolean;
}

export interface StagedPlace {
  osmId: string;
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
  osmTags?: Record<string, string>;
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
  osmId: string;
  kind: TransitKind;
  name?: string;
  latitude: number;
  longitude: number;
  capacity?: string;
  covered?: string;
  lastSynced?: string;
}

export interface TransitStopWithDistance extends TransitStop {
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
  city?: string;
  internetAccess?: InternetAccess;
  sockets?: 'yes' | 'no' | 'many';
  osmTags?: Record<string, string>;
  lastSynced?: string;
}

export type InternetAccess = 'yes' | 'no' | 'wired' | 'wlan';

export interface WorkerRunRegion {
  id: number;
  runId: number;
  regionName: string;
  startedAt: string;
  completedAt: string | null;
  placesFetched: number | null;
  transitStops: number | null;
  candidates: number | null;
}

export interface WorkerRun {
  id: number;
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

export interface GeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [lon, lat]
  };
  properties: Omit<Place, 'latitude' | 'longitude'>;
}

export interface PlaceCluster {
  latitude: number;
  longitude: number;
  count: number;
}

export interface ClusterGeoJSONFeature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: { type: 'cluster'; count: number };
}

export interface GeoJSONCollection {
  type: 'FeatureCollection';
  features: (GeoJSONFeature | ClusterGeoJSONFeature)[];
}
