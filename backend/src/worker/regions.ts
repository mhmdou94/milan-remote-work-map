export interface PbfRegion {
  name: string;
  url: string;
}

export const PBF_REGIONS: PbfRegion[] = [
  {
    name: 'nord-ovest',
    url: 'https://download.geofabrik.de/europe/italy/nord-ovest-latest.osm.pbf',
  },
  {
    name: 'nord-est',
    url: 'https://download.geofabrik.de/europe/italy/nord-est-latest.osm.pbf',
  },
  {
    name: 'centro',
    url: 'https://download.geofabrik.de/europe/italy/centro-latest.osm.pbf',
  },
  {
    name: 'sud',
    url: 'https://download.geofabrik.de/europe/italy/sud-latest.osm.pbf',
  },
  {
    name: 'isole',
    url: 'https://download.geofabrik.de/europe/italy/isole-latest.osm.pbf',
  },
];

export function resolveActiveRegions(filter: string | undefined): PbfRegion[] {
  if (!filter) return PBF_REGIONS;

  const names = filter
    .split(',')
    .map((n) => n.trim())
    .filter(Boolean);
  const byName = new Map(PBF_REGIONS.map((r) => [r.name, r]));

  return names.map((name) => {
    const region = byName.get(name);
    if (!region) {
      throw new Error(
        `Unknown PBF region "${name}". Valid regions: ${PBF_REGIONS.map((r) => r.name).join(', ')}`
      );
    }
    return region;
  });
}
