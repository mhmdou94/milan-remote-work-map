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
  laptopConditional?: string;
  wifiSsid?: string;
  wifiFee?: 'yes' | 'no' | 'customers';
  wifiPassword?: 'yes' | 'no';
  osmId?: string;
  osmTags?: Record<string, string>;
  source: 'osm' | 'manual';
  verified: boolean;
  verifiedBy?: string;
  lastChecked?: string;
  lastSynced?: string;
  deletedAt?: string;
}

export interface StagedPlace {
  osmId: string;
  name: string;
  category?: string;
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  internetAccess?: 'yes' | 'no' | 'wired';
  sockets?: 'yes' | 'no' | 'many';
  openingHours?: string;
  laptopConditional?: string;
  wifiSsid?: string;
  wifiFee?: 'yes' | 'no' | 'customers';
  wifiPassword?: 'yes' | 'no';
  osmTags?: Record<string, string>;
}

export interface BBox {
  minLat: number;
  minLon: number;
  maxLat: number;
  maxLon: number;
}

export interface GeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [lon, lat]
  };
  properties: Omit<Place, 'latitude' | 'longitude'>;
}

export interface GeoJSONCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}
