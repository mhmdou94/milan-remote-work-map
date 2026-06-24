'use client';

import { useEffect, useRef, useState } from 'react';

const CATEGORIES = ['All', 'Coworking', 'Library', 'Cafe', 'Wi-Fi place', 'Other'];
const ALL_NEIGHBORHOODS = 'All neighborhoods';
const ISSUE_URL = 'https://github.com/mhmdou94/milan-remote-work-map/issues/new';
const CATEGORY_COLORS = {
  Coworking: '#006cff',
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

const CHIP_BASE = 'inline-flex min-h-9 flex-none items-center justify-center rounded-xl border px-3 py-2 text-sm font-bold transition-colors desktop:min-h-9';
const CHIP_ACTIVE = 'border-[#006cff] bg-[#006cff] text-white shadow-[0_8px_18px_rgba(0,108,255,0.22)]';
const CHIP_INACTIVE = 'border-[#d7e0e8] bg-white text-[#17212b] hover:border-[#a8bac8]';
const FILTER_INPUT = 'min-h-11 w-full rounded-2xl border border-[#d7e0e8] bg-white px-3 py-2.5 text-sm text-[#17212b] shadow-[0_8px_24px_rgba(15,23,42,0.06)] outline-none focus:border-[#006cff]/60 focus:shadow-[0_0_0_3px_rgba(0,108,255,0.12)]';
const SECONDARY_PILL = 'inline-flex flex-none items-center justify-center rounded-xl border border-[#d7e0e8] bg-white px-3 py-2 text-sm font-bold text-[#17212b] no-underline shadow-[0_8px_22px_rgba(15,23,42,0.06)]';
const PRIMARY_PILL = 'inline-flex flex-none items-center justify-center rounded-xl border border-[#006cff] bg-[#006cff] px-3 py-2 text-sm font-bold text-white no-underline shadow-[0_10px_24px_rgba(0,108,255,0.22)]';

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
  const suppressSheetCollapseRef = useRef(false);
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
        if (suppressSheetCollapseRef.current) {
          return;
        }

        setSheetState('map');
      });

      mapRef.current.on('moveend zoomend', () => {
        suppressSheetCollapseRef.current = false;
      });

      L.control.zoom({ position: 'topright' }).addTo(mapRef.current);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
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
        setMapView(place.lat, place.lon, Math.max(mapRef.current?.getZoom() || 15, 15), { animate: true });
      });

      marker.addTo(markersLayerRef.current);
    }

    if (mapPlaces.length === 1) {
      setMapView(mapPlaces[0].lat, mapPlaces[0].lon, 15);
    } else if (mapPlaces.length > 1 && !sortByDistance) {
      const bounds = L.latLngBounds(mapPlaces.map((place) => [place.lat, place.lon]));
      suppressSheetCollapseRef.current = true;
      mapRef.current.fitBounds(bounds, window.innerWidth >= 861
        ? { paddingTopLeft: [440, 64], paddingBottomRight: [64, 64], maxZoom: 14 }
        : { padding: [48, 48], maxZoom: 14 });
    }
  }, [isMapReady, places, selectedCategory, selectedNeighborhood, searchTerm, activeFilters, sortByDistance]);

  function focusPlace(place) {
    setSelectedPlace(place);
    setSheetState('expanded');
    setMapView(place.lat, place.lon, 16, { animate: true });
  }

  function setMapView(lat, lon, zoom, options) {
    if (!mapRef.current) {
      return;
    }

    suppressSheetCollapseRef.current = true;
    mapRef.current.setView([lat, lon], zoom, options);
  }

  function closePlaceDetail() {
    setSelectedPlace(null);
    setSheetState('peek');
  }

  function toggleSheet() {
    setSheetState((current) => (current === 'expanded' ? 'map' : 'expanded'));
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
      setMapView(userLocation.lat, userLocation.lon, 14, { animate: true });
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
        setMapView(nextLocation.lat, nextLocation.lon, 14, { animate: true });
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

    setSheetState(deltaY < 0 ? 'expanded' : 'map');
  }

  const sheetHeight = getSheetHeightClass(Boolean(selectedPlace), sheetState);
  const browsePanelClass = selectedPlace || sheetState === 'map' ? 'hidden desktop:flex' : 'flex';
  const peekListClass = sheetState === 'peek'
    ? 'overflow-hidden [&>li:nth-child(n+4)]:hidden max-[480px]:[&>li:nth-child(n+3)]:hidden desktop:overflow-auto desktop:[&>li:nth-child(n+3)]:block desktop:[&>li:nth-child(n+4)]:block'
    : 'overflow-auto';

  return (
    <main className="relative isolate block h-screen h-[100dvh] overflow-hidden bg-[#dce5df]">
      <section
        className={`${sheetHeight} absolute inset-x-0 bottom-0 z-20 flex min-h-0 flex-col gap-2.5 overflow-hidden rounded-t-[26px] border border-b-0 border-[#d7e0e8] bg-white/95 px-3 pb-[max(16px,env(safe-area-inset-bottom))] pt-2 shadow-[0_-22px_70px_rgba(15,23,42,0.18)] backdrop-blur-md transition-[height,max-height,box-shadow] duration-200 ease-out desktop:inset-x-auto desktop:top-4 desktop:bottom-4 desktop:left-4 desktop:z-[520] desktop:h-auto desktop:max-h-none desktop:w-[400px] desktop:gap-3 desktop:rounded-[24px] desktop:border desktop:border-[#d7e0e8] desktop:bg-white/95 desktop:p-4 desktop:shadow-[0_22px_70px_rgba(15,23,42,0.16)] desktop:backdrop-blur-md desktop:transition-none`}
        aria-label="Laptop-friendly places in Milan"
      >
        <button
          className="grid min-h-6 w-full flex-none touch-none select-none place-items-center border-0 bg-transparent p-0 desktop:hidden"
          type="button"
          onPointerDown={startSheetDrag}
          onPointerUp={endSheetDrag}
          onPointerCancel={() => {
            sheetDragStartYRef.current = null;
          }}
          aria-expanded={sheetState === 'expanded'}
          aria-label={sheetState === 'expanded' ? 'Collapse places panel' : 'Expand places panel'}
        >
          <span className="h-[5px] w-[46px] rounded-full bg-black/20" />
        </button>

        {selectedPlace ? (
          <div className="desktop:hidden">
            {sheetState === 'expanded' ? (
              <PlaceDetail
                className="max-h-full min-h-0 overflow-auto px-0.5 pb-1 [-webkit-overflow-scrolling:touch]"
                closeAriaLabel="Back to places list"
                closeLabel="Back to list"
                onClose={closePlaceDetail}
                place={selectedPlace}
              />
            ) : (
              <PlaceSummary
                onClose={closePlaceDetail}
                onExpand={() => setSheetState('expanded')}
                place={selectedPlace}
              />
            )}
          </div>
        ) : null}

        {!selectedPlace && sheetState === 'map' ? (
          <MapSummary
            activeFiltersCount={activeFilters.length + (selectedCategory !== 'All' ? 1 : 0) + (selectedNeighborhood !== ALL_NEIGHBORHOODS ? 1 : 0) + (searchTerm.trim() ? 1 : 0)}
            matchesCount={visiblePlaces.length}
            onClearFilters={clearFilters}
            onShowList={() => setSheetState('expanded')}
            totalCount={places.length}
          />
        ) : null}

        <div className={`${browsePanelClass} min-h-0 flex-1 flex-col gap-2.5 desktop:flex desktop:gap-3`}>
          <div className="grid flex-none gap-2">
            <label className="grid min-w-0 gap-1">
              <span className="sr-only">Search places</span>
              <input
                className={`${FILTER_INPUT} text-base desktop:text-sm`}
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search Milan work spots"
              />
            </label>
            <div className="flex items-center justify-between gap-2 text-[0.78rem] font-bold text-[#51606f]">
              <span>{visiblePlaces.length} matches / {places.length} places</span>
              <a className="flex-none text-xs font-black text-[#006cff] no-underline" href={contributionUrl('suggest')} target="_blank" rel="noreferrer">
                Suggest place
              </a>
            </div>
          </div>

          <div className="-mx-3 flex flex-none gap-2 overflow-x-auto px-3 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden desktop:mx-0 desktop:flex-wrap desktop:overflow-visible desktop:p-0" aria-label="Category filters">
            {CATEGORIES.map((category) => (
              <button
                className={`${CHIP_BASE} ${category === selectedCategory ? CHIP_ACTIVE : CHIP_INACTIVE}`}
                key={category}
                onClick={() => setSelectedCategory(category)}
                type="button"
              >
                {category}
              </button>
            ))}
          </div>

          <div className="grid flex-none grid-cols-1 gap-2" aria-label="Practical filters">
            <label className="grid min-w-0 gap-1">
              <span className="text-[0.7rem] font-black uppercase tracking-[0.08em] text-[#51606f]">Neighborhood</span>
              <select className={FILTER_INPUT} value={selectedNeighborhood} onChange={(event) => setSelectedNeighborhood(event.target.value)}>
                <option>{ALL_NEIGHBORHOODS}</option>
                {neighborhoods.map((neighborhood) => (
                  <option key={neighborhood}>{neighborhood}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="-mx-3 flex flex-none gap-2 overflow-x-auto px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden desktop:mx-0 desktop:flex-wrap desktop:overflow-visible desktop:p-0" aria-label="Use-case filters">
            {QUICK_FILTERS.map((filter) => (
              <button
                className={`${CHIP_BASE} ${activeFilters.includes(filter.id) ? CHIP_ACTIVE : CHIP_INACTIVE}`}
                key={filter.id}
                onClick={() => toggleFilter(filter.id)}
                type="button"
              >
                {filter.label}
              </button>
            ))}
            <button className={`${CHIP_BASE} ${sortByDistance ? CHIP_ACTIVE : CHIP_INACTIVE}`} onClick={handleNearMe} type="button">
              {locationStatus === 'loading' ? 'Finding...' : 'Near me'}
            </button>
          </div>

          {locationError ? <p className="flex-none text-xs font-bold text-[#b42318]">{locationError}</p> : null}

          <div className="flex flex-none items-center justify-end gap-3 desktop:hidden">
            <button className="inline-flex min-h-[34px] items-center justify-center rounded-xl border border-[#17212b] bg-[#17212b] px-3 py-1.5 text-xs font-extrabold text-white" type="button" onClick={toggleSheet}>
              {sheetState === 'expanded' ? 'Map' : 'List'}
            </button>
          </div>

          {visiblePlaces.length > 0 ? (
            <ol className={`${peekListClass} grid min-h-0 flex-1 grid-cols-1 gap-3 p-0 pr-1 pb-[max(14px,env(safe-area-inset-bottom))] list-none [-webkit-overflow-scrolling:touch] desktop:gap-3 desktop:pb-3.5`} aria-label="Saved places">
              {visiblePlaces.map((place) => {
                const distance = formatDistance(place, userLocation);

                return (
                  <PlaceCard
                    distance={distance}
                    isSelected={selectedPlace?.id === place.id}
                    key={place.id}
                    onSelect={() => focusPlace(place)}
                    place={place}
                  />
                );
              })}
            </ol>
          ) : (
            <div className="grid gap-2.5 rounded-[18px] border border-dashed border-[#006cff]/35 bg-white p-4">
              <h2 className="text-xl font-bold leading-tight">No trusted places match this filter yet.</h2>
              <p className="text-sm leading-snug text-[#51606f]">Try clearing filters, switching neighborhood, or suggest a laptop-friendly place locals should verify.</p>
              <div className="flex flex-wrap gap-2">
                <button className={SECONDARY_PILL} type="button" onClick={clearFilters}>Clear filters</button>
                <a className={PRIMARY_PILL} href={contributionUrl('suggest')} target="_blank" rel="noreferrer">Suggest a place</a>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="absolute inset-0 z-0 h-full min-h-0 min-w-0" aria-label="Map of Milan">
        <div ref={mapContainerRef} className="h-full w-full bg-[#d7decd]" />

        {selectedPlace ? (
          <PlaceDetail
            className="hidden max-h-[calc(100dvh-32px)] w-[min(360px,calc(100%-44px))] overflow-auto rounded-3xl border border-[#d7e0e8] bg-white/95 p-[18px] shadow-[0_24px_80px_rgba(15,23,42,0.18)] backdrop-blur desktop:absolute desktop:right-4 desktop:bottom-4 desktop:left-auto desktop:z-[540] desktop:grid"
            onClose={closePlaceDetail}
            place={selectedPlace}
          />
        ) : null}
      </section>
    </main>
  );
}

function getSheetHeightClass(hasSelectedPlace, sheetState) {
  if (sheetState === 'map') {
    return 'h-auto max-h-[min(26dvh,210px)]';
  }

  if (hasSelectedPlace && sheetState === 'expanded') {
    return 'h-[min(90dvh,780px)] min-[481px]:h-[min(88dvh,820px)]';
  }

  if (hasSelectedPlace) {
    return 'h-auto max-h-[min(36dvh,280px)]';
  }

  if (sheetState === 'expanded') {
    return 'h-[min(88dvh,760px)] min-[481px]:h-[min(86dvh,780px)]';
  }

  return 'h-[min(46dvh,380px)] min-[481px]:h-[min(42dvh,370px)]';
}

function MapSummary({ activeFiltersCount, matchesCount, onClearFilters, onShowList, totalCount }) {
  return (
    <article className="flex items-center justify-between gap-3 pb-1 desktop:hidden">
      <p className="text-sm font-bold text-[#51606f]">{matchesCount} matches / {totalCount} places</p>
      {activeFiltersCount > 0 ? (
        <button className={SECONDARY_PILL} onClick={onClearFilters} type="button">Clear</button>
      ) : null}
      <button className={PRIMARY_PILL} onClick={onShowList} type="button">List</button>
    </article>
  );
}

function PlaceCard({ distance, isSelected, onSelect, place }) {
  const categoryColor = CATEGORY_COLORS[place.category] || CATEGORY_COLORS.Other;

  return (
    <li>
      <button
        aria-label={`View details for ${place.name}`}
        aria-pressed={isSelected}
        className={`group relative grid w-full gap-3 overflow-hidden rounded-[22px] border px-3.5 py-3.5 pl-5 text-left text-[#17212b] shadow-[0_12px_32px_rgba(15,23,42,0.07)] transition-[border-color,box-shadow,transform,background-color] duration-150 hover:-translate-y-0.5 hover:border-[#006cff]/50 hover:shadow-[0_18px_42px_rgba(15,23,42,0.12)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006cff] desktop:px-4 desktop:py-4 desktop:pl-5 ${isSelected ? 'border-[#006cff]/70 bg-[#f2f7ff]' : 'border-[#dbe4ec] bg-white/98'}`}
        onClick={onSelect}
        type="button"
      >
        <span aria-hidden="true" className="absolute top-4 bottom-4 left-2.5 w-1 rounded-full" style={{ backgroundColor: categoryColor }} />

        <span className="flex min-w-0 items-center justify-between gap-2.5">
          <span className="flex min-w-0 items-center gap-2 text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#5f6d7c]">
            <span aria-hidden="true" className="h-2 w-2 flex-none rounded-full" style={{ backgroundColor: categoryColor }} />
            <span className="truncate">{place.neighborhood}</span>
            <span className="rounded-full bg-[#eef3f7] px-2 py-0.5 text-[0.68rem] font-extrabold normal-case tracking-normal text-[#344252]">{place.category}</span>
          </span>
          {distance ? <span className="flex-none rounded-full bg-[#007f67]/10 px-2.5 py-1 text-xs font-black text-[#007f67]">{distance}</span> : null}
        </span>

        <span className="grid gap-1.5">
          <span className="text-[1.03rem] font-black leading-tight tracking-[-0.02em] text-[#17212b] group-hover:text-[#005ad6] desktop:text-[1.08rem]">{place.name}</span>
          {place.bestFor ? (
            <span className="rounded-2xl border border-[#dce9d7] bg-[#f7fbf4] px-3 py-2 text-sm leading-snug text-[#344331]">
              <span className="font-black text-[#17212b]">Best for: </span>{place.bestFor}
            </span>
          ) : null}
        </span>

        <span className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden desktop:flex-wrap desktop:overflow-visible">
          <CardMetric label="Wi-Fi" tone={metricTone(place.wifiQuality)} value={formatQuality(place.wifiQuality)} />
          <CardMetric label="Outlets" tone={metricTone(place.outletAvailability)} value={formatAvailability(place.outletAvailability)} />
          <CardMetric label="Noise" tone={metricTone(place.noiseLevel)} value={formatQuality(place.noiseLevel)} />
          <CardMetric label="Price" tone={metricTone(place.priceLevel)} value={formatPrice(place.priceLevel, place.cost)} />
        </span>

        {place.decisionNote ? <span className="text-sm leading-snug text-[#465466]">{place.decisionNote}</span> : null}
        <BadgeRow badges={place.badges} limit={3} />

        <span className="flex items-center justify-between gap-3 border-t border-[#e8eef4] pt-2 text-xs font-bold text-[#667483]">
          <span className="min-w-0 truncate">Checked {place.lastChecked || 'needs check'} by {place.verifiedBy || 'community'}</span>
          <span className="flex-none font-black text-[#006cff]">View details</span>
        </span>
      </button>
    </li>
  );
}

function CardMetric({ label, tone, value }) {
  const toneClass = {
    good: 'border-[#c7eadc] bg-[#effbf6] text-[#006b55]',
    neutral: 'border-[#dce5ee] bg-[#f7fafc] text-[#344252]',
    bad: 'border-[#f1cfc9] bg-[#fff6f3] text-[#b42318]',
    unknown: 'border-[#e3e8ef] bg-[#f8fafc] text-[#667483]',
  }[tone] || 'border-[#e3e8ef] bg-[#f8fafc] text-[#667483]';

  return (
    <span className={`grid min-w-[82px] flex-none gap-0.5 rounded-2xl border px-2.5 py-2 ${toneClass}`}>
      <span className="text-[0.62rem] font-black uppercase tracking-[0.1em] opacity-70">{label}</span>
      <span className="text-sm font-black capitalize leading-tight">{value}</span>
    </span>
  );
}

function PlaceSummary({ onClose, onExpand, place }) {
  return (
    <article className="grid gap-2 pb-1">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[0.66rem] font-extrabold uppercase tracking-[0.14em] text-[#006cff]">
          {place.neighborhood} / {place.category}
        </p>
        <button className={SECONDARY_PILL} onClick={onClose} type="button" aria-label="Back to places list">
          Back
        </button>
      </div>
      <h2 className="text-xl font-black leading-tight tracking-tight text-[#17212b]">{place.name}</h2>
      {place.bestFor ? <p className="text-sm font-black text-[#17212b]">Best for: {place.bestFor}</p> : null}
      <BadgeRow badges={place.badges} />
      <div className="flex flex-wrap gap-2">
        <button className={PRIMARY_PILL} onClick={onExpand} type="button">Details</button>
        {place.website ? <a className={SECONDARY_PILL} href={place.website} target="_blank" rel="noreferrer">Website</a> : null}
      </div>
    </article>
  );
}

function PlaceDetail({ className, closeAriaLabel = 'Close place detail', closeLabel = 'Close', onClose, place }) {
  const categoryColor = CATEGORY_COLORS[place.category] || CATEGORY_COLORS.Other;

  return (
    <article className={`grid content-start gap-4 ${className || ''}`}>
      <header className="grid gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#dbe4ec] bg-white px-2.5 py-1 text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#5f6d7c]">
              <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: categoryColor }} />
              {place.category}
            </span>
            <span className="rounded-full bg-[#eef3f7] px-2.5 py-1 text-[0.72rem] font-black text-[#344252]">{place.neighborhood}</span>
          </div>
          <button className={SECONDARY_PILL} onClick={onClose} type="button" aria-label={closeAriaLabel}>
            {closeLabel}
          </button>
        </div>

        <div className="grid gap-2">
          <h2 className="text-[1.55rem] font-black leading-[1.02] tracking-[-0.04em] text-[#17212b] desktop:text-[1.65rem]">{place.name}</h2>
          {place.bestFor ? (
            <p className="rounded-[18px] border border-[#dce9d7] bg-[#f7fbf4] px-3.5 py-3 text-sm leading-snug text-[#344331]">
              <span className="font-black text-[#17212b]">Best for: </span>{place.bestFor}
            </p>
          ) : null}
          <BadgeRow badges={place.badges} />
        </div>
      </header>

      <section className="grid gap-2" aria-labelledby={`${place.id}-essentials`}>
        <h3 id={`${place.id}-essentials`} className="text-xs font-black uppercase tracking-[0.12em] text-[#667483]">Need to know</h3>
        <dl className="grid grid-cols-2 gap-2">
          <DetailMetric label="Wi-Fi" tone={metricTone(place.wifiQuality)} value={formatQuality(place.wifiQuality)} />
          <DetailMetric label="Outlets" tone={metricTone(place.outletAvailability)} value={formatAvailability(place.outletAvailability)} />
          <DetailMetric label="Noise" tone={metricTone(place.noiseLevel)} value={formatQuality(place.noiseLevel)} />
          <DetailMetric label="Price" tone={metricTone(place.priceLevel)} value={formatPrice(place.priceLevel, place.cost)} />
        </dl>
      </section>

      {place.decisionNote || place.notes ? (
        <section className="grid gap-2 rounded-[20px] border border-[#e3eaf1] bg-[#fbfcfd] p-3.5" aria-labelledby={`${place.id}-notes`}>
          <h3 id={`${place.id}-notes`} className="text-xs font-black uppercase tracking-[0.12em] text-[#667483]">Why go</h3>
          {place.decisionNote ? <p className="text-sm leading-snug text-[#344252]">{place.decisionNote}</p> : null}
          {place.notes ? <p className="text-sm leading-snug text-[#51606f]">{place.notes}</p> : null}
        </section>
      ) : null}

      <section className="grid gap-2" aria-labelledby={`${place.id}-practical`}>
        <h3 id={`${place.id}-practical`} className="text-xs font-black uppercase tracking-[0.12em] text-[#667483]">Practical details</h3>
        <dl className="grid gap-2 rounded-[20px] border border-[#e3eaf1] bg-white p-3.5">
          {detail('Calls', formatBoolean(place.callFriendly, 'Call-friendly', 'Not ideal for calls'))}
          {detail('Laptop policy', formatLaptopPolicy(place.laptopPolicy))}
          {detail('Seating comfort', formatQuality(place.seatingComfort))}
          {detail('Toilet', formatBoolean(place.toiletAvailable, 'Available', 'Not confirmed'))}
          {detail('Outdoor seating', formatBoolean(place.outdoorSeating, 'Available', 'Not available'))}
          {place.openingHours ? detail('Opening hours', place.openingHours) : detail('Opening hours', 'Needs verification')}
          {place.address ? detail('Address', place.address) : null}
        </dl>
      </section>

      <section className="grid gap-2" aria-labelledby={`${place.id}-trust`}>
        <h3 id={`${place.id}-trust`} className="text-xs font-black uppercase tracking-[0.12em] text-[#667483]">Trust signal</h3>
        <dl className="grid grid-cols-1 gap-2 rounded-[20px] border border-[#e3eaf1] bg-white p-3.5 min-[390px]:grid-cols-2">
          {detail('Last checked', place.lastChecked || 'Needs check')}
          {detail('Verified by', place.verifiedBy || 'Community submitted')}
          {detail('Added by', place.addedBy || 'Local contributor')}
        </dl>
      </section>

      <div className="sticky bottom-0 z-10 -mx-0.5 mt-1 grid grid-cols-2 gap-2 border-t border-[#e8eef4] bg-white/95 pt-3 pb-1 backdrop-blur desktop:static desktop:border-0 desktop:bg-transparent desktop:p-0">
        {place.website ? <a className={`${PRIMARY_PILL} min-h-12`} href={place.website} target="_blank" rel="noreferrer">{primaryPlaceActionLabel(place.website)}</a> : null}
        <a className={`${place.website ? SECONDARY_PILL : PRIMARY_PILL} min-h-12`} href={contributionUrl('confirm', place)} target="_blank" rel="noreferrer">Still good?</a>
        <a className={`${SECONDARY_PILL} min-h-12 ${place.website ? 'col-span-2' : ''}`} href={contributionUrl('update', place)} target="_blank" rel="noreferrer">Update info</a>
      </div>
    </article>
  );
}

function DetailMetric({ label, tone, value }) {
  const toneClass = {
    good: 'border-[#bce7d6] bg-[#effbf6] text-[#006b55]',
    neutral: 'border-[#dce5ee] bg-[#f7fafc] text-[#344252]',
    bad: 'border-[#f1cfc9] bg-[#fff6f3] text-[#b42318]',
    unknown: 'border-[#e3e8ef] bg-[#f8fafc] text-[#667483]',
  }[tone] || 'border-[#e3e8ef] bg-[#f8fafc] text-[#667483]';

  return (
    <div className={`rounded-[18px] border p-3 ${toneClass}`}>
      <dt className="text-[0.66rem] font-black uppercase tracking-[0.1em] opacity-70">{label}</dt>
      <dd className="mt-1 text-base font-black capitalize leading-tight">{value}</dd>
    </div>
  );
}

function BadgeRow({ badges, limit }) {
  if (!badges?.length) {
    return null;
  }

  const visibleBadges = limit ? badges.slice(0, limit) : badges;
  const hiddenCount = limit ? badges.length - visibleBadges.length : 0;

  return (
    <span className="flex flex-wrap gap-1.5">
      {visibleBadges.map((badge) => (
        <span className="rounded-full bg-[#006cff]/10 px-2 py-0.5 text-xs font-extrabold text-[#006cff]" key={badge}>{badge}</span>
      ))}
      {hiddenCount > 0 ? <span className="rounded-full bg-[#eef3f7] px-2 py-0.5 text-xs font-extrabold text-[#51606f]">+{hiddenCount}</span> : null}
    </span>
  );
}

function detail(label, value) {
  return (
    <div key={label}>
      <dt className="text-xs font-extrabold uppercase tracking-[0.1em] text-[#17212b]">{label}</dt>
      <dd className="mt-0.5 leading-snug text-[#51606f]">{value}</dd>
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

function formatQuality(value) {
  return formatValue(value || 'unknown');
}

function metricTone(value) {
  if (['free', 'good', 'great', 'low', 'many', 'quiet', 'some'].includes(value)) {
    return 'good';
  }

  if (['high', 'loud', 'none', 'poor'].includes(value)) {
    return 'bad';
  }

  if (!value || value === 'unknown') {
    return 'unknown';
  }

  return 'neutral';
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

function primaryPlaceActionLabel(url) {
  return url.includes('google.com/maps') || url.includes('maps.app.goo.gl') ? 'Open map' : 'Website';
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
