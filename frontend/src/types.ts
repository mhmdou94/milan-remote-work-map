export interface Place {
  id: string;
  name: string;
  category?: string;
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  internetAccess?: 'yes' | 'no' | 'wired';
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
  internetAccess?: 'yes' | 'no' | 'wired';
  sockets?: 'yes' | 'no' | 'many';
  osmTags?: Record<string, string>;
}
