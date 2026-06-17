'use client';

import { useEffect, useRef, useState } from 'react';

const CATEGORIES = ['All', 'Coworking', 'Library', 'Cafe', 'Wi-Fi place', 'Other'];
const ALL_NEIGHBORHOODS = 'All neighborhoods';
const ISSUE_URL = 'https://github.com/MohamedDounnani94/milan-remote-work-map/issues/new';
const CATEGORY_COLORS = {
  Coworking: '#2457ff',
  Library: '#7b3ff2',
  Cafe: '#b25614',
  'Wi-Fi place': '#007f67',
  Other: '#4b5563',
};
const QUICK_FILTERS = [
  { id: 'goodWifi', label: 'Good Wi-Fi' },
  { id: 'outlets', label: 'Outlets' },
  { id: 'quiet', label: 'Quiet' },
  { id: 'calls', label: 'Calls' },
];
const SEARCH_FIELDS = ['name', 'category', 'neighborhood', 'bestFor', 'decisionNote', 'notes'];

export default function RemoteWorkMap({ center, initialPlaces }) {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState(ALL_NEIGHBORHOODS);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [sheetState, setSheetState] = useState('peek');
  const [userLocation, setUserLocation] = useState(null);
  const [sortByDistance, setSortByDistance] = useState(false);
  const [locationStatus, setLocationStatus] = useState('idle');
  const [locationError, setLocationError] = useState(null);
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersLayerRef = useRef(null);
  const leafletRef = useRef(null);
  const sheetDragStartYRef = useRef(null);
  const places = initialPlaces || [];
  const mapCenter = center || { lat: 45.4642, lon: 9.19 };
  const neighborhoods = getNeighborhoods(places);
  const filteredPlaces = filterPlaces(places, {
    selectedCategory,
    selectedNeighborhood,
    searchTerm,
    activeFilters,
  });
  const visiblePlaces = sortPlaces(filteredPlaces, userLocation, sortByDistance);

  useEffect(() => {
    if (selectedPlace && !visiblePlaces.some((place) => place.id === selectedPlace.id)) {
      setSelectedPlace(null);
    }
  }, [selectedPlace, visiblePlaces]);

  useEffect(() => {
    let cancelled = false;

    async function initMap() {
      if (!mapContainerRef.current || mapRef.current) {
        return;
      }

      const L = await import('leaflet');

      if (cancelled || !mapContainerRef.current) {
        return;
      }

      leafletRef.current = L;
      mapRef.current = L.map(mapContainerRef.current, {
        doubleClickZoom: true,
        dragging: true,
        zoomControl: false,
        tap: true,
        touchZoom: true,
        scrollWheelZoom: true,
      }).setView([mapCenter.lat, mapCenter.lon], 13);

      mapRef.current.on('dragstart zoomstart', () => {
        setSheetState('peek');
      });

      L.control.zoom({ position: 'topright' }).addTo(mapRef.current);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(mapRef.current);

      markersLayerRef.current = L.layerGroup().addTo(mapRef.current);
      setIsMapReady(true);
    }

    initMap();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
      leafletRef.current = null;
      setIsMapReady(false);
    };
  }, [mapCenter.lat, mapCenter.lon]);

  useEffect(() => {
    const L = leafletRef.current;

    if (!isMapReady || !L || !mapRef.current || !markersLayerRef.current) {
      return;
    }

    const mapPlaces = filterPlaces(places, {
      selectedCategory,
      selectedNeighborhood,
      searchTerm,
      activeFilters,
    });

    markersLayerRef.current.clearLayers();

    for (const place of mapPlaces) {
      const color = CATEGORY_COLORS[place.category] || '#1f2937';
      const marker = L.marker([place.lat, place.lon], {
        icon: L.divIcon({
          className: 'place-marker manual-marker',
          html: `<span style="--marker-color:${color}">${markerLabel(place)}</span>`,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        }),
        title: place.name,
      });

      marker.on('click', () => {
        setSelectedPlace(place);
        setSheetState('peek');
        mapRef.current?.setView([place.lat, place.lon], Math.max(mapRef.current.getZoom(), 15), { animate: true });
      });

      marker.addTo(markersLayerRef.current);
    }

    if (mapPlaces.length === 1) {
      mapRef.current.setView([mapPlaces[0].lat, mapPlaces[0].lon], 15);
    } else if (mapPlaces.length > 1 && !sortByDistance) {
      const bounds = L.latLngBounds(mapPlaces.map((place) => [place.lat, place.lon]));
      mapRef.current.fitBounds(bounds, { padding: [48, 48], maxZoom: 14 });
    }
  }, [isMapReady, places, selectedCategory, selectedNeighborhood, searchTerm, activeFilters, sortByDistance]);

  function focusPlace(place) {
    setSelectedPlace(place);
    setSheetState('peek');
    mapRef.current?.setView([place.lat, place.lon], 16, { animate: true });
  }

  function toggleSheet() {
    setSheetState((current) => (current === 'expanded' ? 'peek' : 'expanded'));
  }

  function toggleFilter(filterId) {
    setActiveFilters((current) => (
      current.includes(filterId) ? current.filter((id) => id !== filterId) : [...current, filterId]
    ));
  }

  function clearFilters() {
    setSelectedCategory('All');
    setSelectedNeighborhood(ALL_NEIGHBORHOODS);
    setSearchTerm('');
    setActiveFilters([]);
    setSortByDistance(false);
  }

  function handleNearMe() {
    if (sortByDistance && userLocation) {
      setSortByDistance(false);
      return;
    }

    if (userLocation) {
      setSortByDistance(true);
      mapRef.current?.setView([userLocation.lat, userLocation.lon], 14, { animate: true });
      return;
    }

    if (!navigator.geolocation) {
      setLocationError('Your browser does not support location lookup.');
      return;
    }

    setLocationStatus('loading');
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        };

        setUserLocation(nextLocation);
        setSortByDistance(true);
        setLocationStatus('ready');
        mapRef.current?.setView([nextLocation.lat, nextLocation.lon], 14, { animate: true });
      },
      () => {
        setLocationStatus('error');
        setLocationError('Location access was blocked. You can still filter by neighborhood.');
      },
      { enableHighAccuracy: true, maximumAge: 300000, timeout: 10000 },
    );
  }

  function startSheetDrag(event) {
    sheetDragStartYRef.current = event.clientY;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function endSheetDrag(event) {
    const startY = sheetDragStartYRef.current;
    sheetDragStartYRef.current = null;

    if (startY === null) {
      return;
    }

    const deltaY = event.clientY - startY;

    if (Math.abs(deltaY) < 28) {
      toggleSheet();
      return;
    }

    setSheetState(deltaY < 0 ? 'expanded' : 'peek');
  }

  return (
    <main className="shell">
      <section className={`panel sheet-${sheetState}`} aria-label="Laptop-friendly places in Milan">
        <button
          className="sheet-handle"
          type="button"
          onPointerDown={startSheetDrag}
          onPointerUp={endSheetDrag}
          onPointerCancel={() => {
            sheetDragStartYRef.current = null;
          }}
          aria-label={sheetState === 'expanded' ? 'Collapse places panel' : 'Expand places panel'}
        >
          <span />
        </button>

        <div className="headline">
          <p className="eyebrow">Milan remote work map</p>
          <h1>Find a place to work in Milan.</h1>
          <p>Community-curated laptop spots, not every cafe.</p>
        </div>

        <div className="community-proof">
          <span>Maintained by remote workers in Milan</span>
          <a className="contribute-link" href={contributionUrl('suggest')} target="_blank" rel="noreferrer">
            Suggest a place
          </a>
        </div>

        <div className="controls" aria-label="Category filters">
          {CATEGORIES.map((category) => (
            <button
              className={category === selectedCategory ? 'chip active' : 'chip'}
              key={category}
              onClick={() => setSelectedCategory(category)}
              type="button"
            >
              {category}
            </button>
          ))}
        </div>

        <div className="filter-grid" aria-label="Practical filters">
          <label className="filter-field">
            <span>Neighborhood</span>
            <select value={selectedNeighborhood} onChange={(event) => setSelectedNeighborhood(event.target.value)}>
              <option>{ALL_NEIGHBORHOODS}</option>
              {neighborhoods.map((neighborhood) => (
                <option key={neighborhood}>{neighborhood}</option>
              ))}
            </select>
          </label>
          <label className="filter-field search-field">
            <span>Search</span>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Brera, calls, quiet..."
            />
          </label>
        </div>

        <div className="controls quick-controls" aria-label="Use-case filters">
          {QUICK_FILTERS.map((filter) => (
            <button
              className={activeFilters.includes(filter.id) ? 'chip active' : 'chip'}
              key={filter.id}
              onClick={() => toggleFilter(filter.id)}
              type="button"
            >
              {filter.label}
            </button>
          ))}
          <button className={sortByDistance ? 'chip active' : 'chip'} onClick={handleNearMe} type="button">
            {locationStatus === 'loading' ? 'Finding...' : 'Near me'}
          </button>
        </div>

        {locationError ? <p className="inline-error">{locationError}</p> : null}

        <div className="status-row csv-status">
          <span>{visiblePlaces.length} matches / {places.length} curated places</span>
          <button className="sheet-toggle" type="button" onClick={toggleSheet}>
            {sheetState === 'expanded' ? 'Map' : 'List'}
          </button>
        </div>

        {visiblePlaces.length > 0 ? (
          <ol className="place-list" aria-label="Saved places">
            {visiblePlaces.map((place) => {
              const distance = formatDistance(place, userLocation);

              return (
                <li key={place.id}>
                  <button className={selectedPlace?.id === place.id ? 'place-card selected' : 'place-card'} onClick={() => focusPlace(place)} type="button">
                    <span className="place-title-row">
                      <span className="place-title">{place.name}</span>
                      {distance ? <span className="place-distance">{distance}</span> : null}
                    </span>
                    <span className="place-meta">
                      {place.neighborhood} / {place.category}
                    </span>
                    {place.bestFor ? <span className="best-for">Best for: {place.bestFor}</span> : null}
                    <span className="place-tags">{formatCardAttributes(place)}</span>
                    {place.decisionNote ? <span className="place-note">{place.decisionNote}</span> : null}
                    {place.badges.length > 0 ? <span className="tag-row">{place.badges.map((badge) => <span key={badge}>{badge}</span>)}</span> : null}
                    <span className="trust-line">Last checked: {place.lastChecked || 'needs check'} / {place.verifiedBy || 'community submitted'}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="empty-state">
            <h2>No trusted places match this filter yet.</h2>
            <p>Try clearing filters, switching neighborhood, or suggest a laptop-friendly place locals should verify.</p>
            <div className="empty-actions">
              <button className="refresh" type="button" onClick={clearFilters}>Clear filters</button>
              <a className="refresh primary" href={contributionUrl('suggest')} target="_blank" rel="noreferrer">Suggest a place</a>
            </div>
          </div>
        )}
      </section>

      <section className="map-wrap" aria-label="Map of Milan">
        <div ref={mapContainerRef} className="map" />

        <div className="mobile-map-label" aria-hidden="true">
          <span>Trusted Milan work spots</span>
          <strong>{places.length} places</strong>
        </div>

        {selectedPlace ? (
          <article className="detail-card">
            <button className="close-detail" onClick={() => setSelectedPlace(null)} type="button" aria-label="Close place detail">
              Close
            </button>
            <p className="detail-category">
              {selectedPlace.neighborhood} / {selectedPlace.category}
            </p>
            <h2>{selectedPlace.name}</h2>
            {selectedPlace.bestFor ? <p className="detail-best">Best for: {selectedPlace.bestFor}</p> : null}
            {selectedPlace.badges.length > 0 ? <div className="tag-row detail-tags">{selectedPlace.badges.map((badge) => <span key={badge}>{badge}</span>)}</div> : null}
            <dl>
              {detail('Wi-Fi', formatQuality(selectedPlace.wifiQuality))}
              {detail('Outlets', formatAvailability(selectedPlace.outletAvailability))}
              {detail('Noise', formatQuality(selectedPlace.noiseLevel))}
              {detail('Calls', formatBoolean(selectedPlace.callFriendly, 'Call-friendly', 'Not ideal for calls'))}
              {detail('Laptop policy', formatLaptopPolicy(selectedPlace.laptopPolicy))}
              {detail('Seating comfort', formatQuality(selectedPlace.seatingComfort))}
              {detail('Price', formatPrice(selectedPlace.priceLevel, selectedPlace.cost))}
              {detail('Toilet', formatBoolean(selectedPlace.toiletAvailable, 'Available', 'Not confirmed'))}
              {detail('Outdoor seating', formatBoolean(selectedPlace.outdoorSeating, 'Available', 'Not available'))}
              {selectedPlace.openingHours ? detail('Opening hours', selectedPlace.openingHours) : detail('Opening hours', 'Needs verification')}
              {selectedPlace.address ? detail('Address', selectedPlace.address) : null}
              {selectedPlace.decisionNote ? detail('Why go', selectedPlace.decisionNote) : null}
              {selectedPlace.notes ? detail('Notes', selectedPlace.notes) : null}
              {detail('Last checked', selectedPlace.lastChecked || 'Needs check')}
              {detail('Verified by', selectedPlace.verifiedBy || 'Community submitted')}
              {detail('Added by', selectedPlace.addedBy || 'Local contributor')}
            </dl>
            <div className="detail-actions">
              {selectedPlace.website ? <a href={selectedPlace.website} target="_blank" rel="noreferrer">Website</a> : null}
              <a href={contributionUrl('confirm', selectedPlace)} target="_blank" rel="noreferrer">Still good?</a>
              <a href={contributionUrl('update', selectedPlace)} target="_blank" rel="noreferrer">Update info</a>
            </div>
          </article>
        ) : null}
      </section>
    </main>
  );
}

function detail(label, value) {
  return (
    <div key={label}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function filterPlaces(places, { selectedCategory, selectedNeighborhood, searchTerm, activeFilters }) {
  const normalizedTerm = searchTerm.trim().toLowerCase();

  return places.filter((place) => {
    if (selectedCategory !== 'All' && place.category !== selectedCategory) {
      return false;
    }

    if (selectedNeighborhood !== ALL_NEIGHBORHOODS && place.neighborhood !== selectedNeighborhood) {
      return false;
    }

    if (normalizedTerm && !matchesSearch(place, normalizedTerm)) {
      return false;
    }

    return activeFilters.every((filterId) => matchesQuickFilter(place, filterId));
  });
}

function matchesSearch(place, normalizedTerm) {
  const baseFields = SEARCH_FIELDS.map((field) => place[field] || '');
  const listFields = [...(place.badges || []), ...(place.customTags || [])];
  return [...baseFields, ...listFields].some((value) => String(value).toLowerCase().includes(normalizedTerm));
}

function matchesQuickFilter(place, filterId) {
  if (filterId === 'goodWifi') {
    return place.wifi === 'on' || place.wifiQuality === 'good' || place.wifiQuality === 'great';
  }

  if (filterId === 'outlets') {
    return place.powerOutlets === 'on' || place.outletAvailability === 'some' || place.outletAvailability === 'many';
  }

  if (filterId === 'quiet') {
    return place.noiseLevel === 'quiet';
  }

  if (filterId === 'calls') {
    return place.callFriendly === 'yes';
  }

  return true;
}

function sortPlaces(places, userLocation, sortByDistance) {
  if (!sortByDistance || !userLocation) {
    return places;
  }

  return [...places].sort((first, second) => distanceKm(first, userLocation) - distanceKm(second, userLocation));
}

function getNeighborhoods(places) {
  return Array.from(new Set(places.map((place) => place.neighborhood).filter(Boolean))).sort((first, second) => first.localeCompare(second));
}

function distanceKm(place, location) {
  const earthRadiusKm = 6371;
  const latDelta = toRadians(location.lat - place.lat);
  const lonDelta = toRadians(location.lon - place.lon);
  const firstLat = toRadians(place.lat);
  const secondLat = toRadians(location.lat);
  const a = Math.sin(latDelta / 2) ** 2 + Math.cos(firstLat) * Math.cos(secondLat) * Math.sin(lonDelta / 2) ** 2;
  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRadians(value) {
  return value * (Math.PI / 180);
}

function formatDistance(place, userLocation) {
  if (!userLocation) {
    return null;
  }

  const distance = distanceKm(place, userLocation);

  if (distance < 1) {
    return `${Math.round(distance * 1000)} m`;
  }

  return `${distance.toFixed(1)} km`;
}

function markerLabel(place) {
  if (place.category === 'Coworking') {
    return 'Co';
  }

  if (place.category === 'Library') {
    return 'Li';
  }

  if (place.category === 'Wi-Fi place') {
    return 'Wi';
  }

  return place.category?.slice(0, 2) || 'Go';
}

function formatCardAttributes(place) {
  return [
    `Wi-Fi: ${formatQuality(place.wifiQuality).toLowerCase()}`,
    `Outlets: ${formatAvailability(place.outletAvailability).toLowerCase()}`,
    `Noise: ${formatQuality(place.noiseLevel).toLowerCase()}`,
    `Calls: ${formatBoolean(place.callFriendly, 'ok', 'not ideal').toLowerCase()}`,
  ].join(' / ');
}

function formatQuality(value) {
  return formatValue(value || 'unknown');
}

function formatAvailability(value) {
  return formatValue(value || 'unknown');
}

function formatLaptopPolicy(value) {
  const labels = {
    welcome: 'Laptop welcome',
    limited: 'Limited laptop time',
    ask: 'Ask first',
    not_allowed: 'Not laptop-friendly',
    unknown: 'Needs verification',
  };

  return labels[value] || labels.unknown;
}

function formatPrice(priceLevel, cost) {
  if (priceLevel && priceLevel !== 'unknown') {
    return formatValue(priceLevel);
  }

  return formatCost(cost);
}

function formatCost(value) {
  return formatValue(value || 'unknown');
}

function formatBoolean(value, yesLabel, noLabel) {
  if (value === 'yes') {
    return yesLabel;
  }

  if (value === 'no') {
    return noLabel;
  }

  return 'Needs verification';
}

function formatValue(value) {
  return String(value || 'unknown').replaceAll('_', ' ');
}

function contributionUrl(type, place) {
  const subject = {
    suggest: 'Suggest a laptop-friendly place in Milan',
    update: `Update place info: ${place?.name || ''}`,
    confirm: `Confirm still good: ${place?.name || ''}`,
  }[type];
  const body = type === 'suggest'
    ? 'Name:\nNeighborhood:\nAddress or map link:\nBest for:\nWi-Fi:\nOutlets:\nNoise:\nCalls:\nLast visited:'
    : `Place: ${place?.name || ''}\nNeighborhood: ${place?.neighborhood || ''}\nWhat changed or what did you confirm?\nLast visited:`;
  const params = new URLSearchParams({ title: subject, body });
  return `${ISSUE_URL}?${params.toString()}`;
}
