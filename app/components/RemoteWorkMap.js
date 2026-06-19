'use client';

import { useEffect, useRef, useState } from 'react';

const CATEGORIES = ['All', 'Coworking', 'Library', 'Cafe', 'Wi-Fi place', 'Other'];
const ALL_NEIGHBORHOODS = 'All neighborhoods';
const ISSUE_URL = 'https://github.com/mhmdou94/milan-remote-work-map/issues/new';
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

const CHIP_BASE = 'inline-flex min-h-10 flex-none items-center justify-center rounded-full border px-3.5 py-2 text-sm transition-colors desktop:min-h-[38px] desktop:px-3';
const CHIP_ACTIVE = 'border-[#171717] bg-[#171717] text-white';
const CHIP_INACTIVE = 'border-black/10 bg-white/60 text-[#171717]';
const FILTER_INPUT = 'min-h-[38px] w-full rounded-xl border border-black/10 bg-white/75 px-2.5 py-2 text-[#171717] outline-none focus:border-[#2457ff]/55 focus:shadow-[0_0_0_3px_rgba(36,87,255,0.11)]';
const SECONDARY_PILL = 'inline-flex flex-none items-center justify-center rounded-full border border-black/10 bg-white/70 px-3 py-2 text-sm font-bold text-[#171717] no-underline';
const PRIMARY_PILL = 'inline-flex flex-none items-center justify-center rounded-full border border-[#171717] bg-[#171717] px-3 py-2 text-sm font-bold text-white no-underline';

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
        setMapView(place.lat, place.lon, Math.max(mapRef.current?.getZoom() || 15, 15), { animate: true });
      });

      marker.addTo(markersLayerRef.current);
    }

    if (mapPlaces.length === 1) {
      setMapView(mapPlaces[0].lat, mapPlaces[0].lon, 15);
    } else if (mapPlaces.length > 1 && !sortByDistance) {
      const bounds = L.latLngBounds(mapPlaces.map((place) => [place.lat, place.lon]));
      suppressSheetCollapseRef.current = true;
      mapRef.current.fitBounds(bounds, { padding: [48, 48], maxZoom: 14 });
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
    <main className="relative isolate block h-screen h-[100dvh] overflow-hidden bg-[#d7decd] desktop:grid desktop:grid-cols-[420px_minmax(0,1fr)] desktop:bg-[#f3f0e8]">
      <section
        className={`${sheetHeight} absolute inset-x-0 bottom-0 z-20 flex min-h-0 flex-col gap-2.5 overflow-hidden rounded-t-[28px] border border-b-0 border-black/10 bg-[#fff9ec]/98 px-3 pb-[max(16px,env(safe-area-inset-bottom))] pt-2 shadow-[0_-22px_70px_rgba(24,17,8,0.2)] backdrop-blur-md transition-[height,max-height,box-shadow] duration-200 ease-out desktop:static desktop:h-auto desktop:max-h-none desktop:gap-3.5 desktop:rounded-none desktop:border-0 desktop:border-r desktop:border-black/10 desktop:bg-gradient-to-b desktop:from-[#fff9ec] desktop:to-[#f1eadf] desktop:p-7 desktop:shadow-none desktop:backdrop-blur-none desktop:transition-none`}
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

        <div className={`${browsePanelClass} min-h-0 flex-1 flex-col gap-2.5 desktop:flex desktop:gap-3.5`}>
          <div className="grid flex-none gap-1.5 desktop:gap-2.5">
            <p className="hidden text-xs font-extrabold uppercase tracking-[0.14em] text-[#2457ff] desktop:block">Milan remote work map</p>
            <h1 className="font-serif text-[clamp(1.85rem,10vw,2.35rem)] leading-[0.84] tracking-[-0.07em] min-[481px]:text-[clamp(1.9rem,9vw,2.45rem)] desktop:max-w-[9ch] desktop:text-[clamp(3rem,8vw,5.4rem)] desktop:tracking-[-0.08em]">
              Find a place to work in Milan.
            </h1>
            <p className="hidden max-w-[34ch] text-base leading-normal text-[#666057] desktop:block">Community-curated laptop spots, not every cafe.</p>
          </div>

          <div className="flex flex-none flex-col items-start justify-between gap-1 rounded-2xl border border-[#2457ff]/15 bg-[#2457ff]/10 p-2.5 text-[0.78rem] font-extrabold text-[#25215f] min-[481px]:flex-row min-[481px]:items-center desktop:text-[0.82rem]">
            <span>Maintained by remote workers in Milan</span>
            <a className="flex-none text-xs font-black text-[#2457ff] no-underline" href={contributionUrl('suggest')} target="_blank" rel="noreferrer">
              Suggest a place
            </a>
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

          <div className="grid flex-none grid-cols-1 gap-2 min-[481px]:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] desktop:grid-cols-1" aria-label="Practical filters">
            <label className="grid min-w-0 gap-1">
              <span className="text-[0.7rem] font-black uppercase tracking-[0.08em] text-[#666057]">Neighborhood</span>
              <select className={FILTER_INPUT} value={selectedNeighborhood} onChange={(event) => setSelectedNeighborhood(event.target.value)}>
                <option>{ALL_NEIGHBORHOODS}</option>
                {neighborhoods.map((neighborhood) => (
                  <option key={neighborhood}>{neighborhood}</option>
                ))}
              </select>
            </label>
            <label className="grid min-w-0 gap-1">
              <span className="text-[0.7rem] font-black uppercase tracking-[0.08em] text-[#666057]">Search</span>
              <input
                className={FILTER_INPUT}
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Brera, calls, quiet..."
              />
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

          <div className="flex flex-none items-center justify-between gap-3 text-[0.78rem] text-[#666057] desktop:text-sm">
            <span>{visiblePlaces.length} matches / {places.length} curated places</span>
            <button className="inline-flex min-h-[34px] items-center justify-center rounded-full border border-[#171717] bg-[#171717] px-3 py-1.5 text-xs font-extrabold text-white desktop:hidden" type="button" onClick={toggleSheet}>
              {sheetState === 'expanded' ? 'Map' : 'List'}
            </button>
          </div>

          {visiblePlaces.length > 0 ? (
            <ol className={`${peekListClass} grid min-h-0 flex-1 grid-cols-1 gap-2.5 p-0 pr-1 pb-[max(14px,env(safe-area-inset-bottom))] list-none [-webkit-overflow-scrolling:touch] desktop:gap-2.5 desktop:pb-3.5`} aria-label="Saved places">
              {visiblePlaces.map((place) => {
                const distance = formatDistance(place, userLocation);

                return (
                  <li key={place.id}>
                    <button className={`grid w-full gap-1.5 rounded-2xl border p-3 text-left text-[#171717] transition-colors desktop:p-3.5 desktop:rounded-[18px] ${selectedPlace?.id === place.id ? 'border-[#2457ff]/55 bg-white/90' : 'border-black/10 bg-white/60 hover:border-[#2457ff]/55 hover:bg-white/90'}`} onClick={() => focusPlace(place)} type="button">
                      <span className="flex items-start justify-between gap-2.5">
                        <span className="text-[0.96rem] font-extrabold desktop:text-base">{place.name}</span>
                        {distance ? <span className="flex-none rounded-full bg-[#007f67]/10 px-2 py-0.5 text-xs font-black text-[#007f67]">{distance}</span> : null}
                      </span>
                      <span className="text-sm text-[#666057]">{place.neighborhood} / {place.category}</span>
                      {place.bestFor ? <span className="text-sm font-black text-[#171717]">Best for: {place.bestFor}</span> : null}
                      <span className="text-sm text-[#3f3a33]">{formatCardAttributes(place)}</span>
                      {place.decisionNote ? <span className="text-sm leading-snug text-[#3d3429]">{place.decisionNote}</span> : null}
                      <BadgeRow badges={place.badges} />
                      <span className="text-sm text-[#666057]">Last checked: {place.lastChecked || 'needs check'} / {place.verifiedBy || 'community submitted'}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className="grid gap-2.5 rounded-[18px] border border-dashed border-[#2457ff]/35 bg-white/60 p-4">
              <h2 className="text-xl font-bold leading-tight">No trusted places match this filter yet.</h2>
              <p className="text-sm leading-snug text-[#666057]">Try clearing filters, switching neighborhood, or suggest a laptop-friendly place locals should verify.</p>
              <div className="flex flex-wrap gap-2">
                <button className={SECONDARY_PILL} type="button" onClick={clearFilters}>Clear filters</button>
                <a className={PRIMARY_PILL} href={contributionUrl('suggest')} target="_blank" rel="noreferrer">Suggest a place</a>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="relative z-0 h-full min-h-0 min-w-0" aria-label="Map of Milan">
        <div ref={mapContainerRef} className="h-full w-full bg-[#d7decd]" />

        <div className="absolute left-[max(12px,env(safe-area-inset-left))] top-[max(12px,env(safe-area-inset-top))] z-[450] grid gap-0.5 rounded-[18px] border border-black/10 bg-[#fffcf6]/95 px-3 py-2.5 text-[#171717] shadow-[0_14px_44px_rgba(24,17,8,0.16)] backdrop-blur desktop:hidden" aria-hidden="true">
          <span className="text-[0.62rem] font-black uppercase tracking-[0.12em] text-[#2457ff]">Trusted Milan work spots</span>
          <strong className="text-base">{places.length} places</strong>
        </div>

        {selectedPlace ? (
          <PlaceDetail
            className="hidden max-h-[calc(100dvh-44px)] w-[min(360px,calc(100%-44px))] overflow-auto rounded-3xl border border-black/10 bg-[#fffcf6]/95 p-[18px] shadow-[0_24px_80px_rgba(24,17,8,0.22)] backdrop-blur desktop:absolute desktop:right-5 desktop:bottom-5 desktop:left-auto desktop:z-[500] desktop:grid"
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
    <article className="grid gap-2 pb-1 desktop:hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="grid gap-1">
          <p className="text-[0.66rem] font-extrabold uppercase tracking-[0.14em] text-[#2457ff]">Milan remote work map</p>
          <h2 className="text-xl font-black leading-tight tracking-tight text-[#171717]">Explore the map</h2>
        </div>
        <button className={PRIMARY_PILL} onClick={onShowList} type="button">List</button>
      </div>
      <p className="text-sm text-[#666057]">{matchesCount} matches / {totalCount} curated places</p>
      {activeFiltersCount > 0 ? (
        <button className={`${SECONDARY_PILL} justify-self-start`} onClick={onClearFilters} type="button">Clear filters</button>
      ) : null}
    </article>
  );
}

function PlaceSummary({ onClose, onExpand, place }) {
  return (
    <article className="grid gap-2 pb-1">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[0.66rem] font-extrabold uppercase tracking-[0.14em] text-[#2457ff]">
          {place.neighborhood} / {place.category}
        </p>
        <button className={SECONDARY_PILL} onClick={onClose} type="button" aria-label="Back to places list">
          Back
        </button>
      </div>
      <h2 className="text-xl font-black leading-tight tracking-tight text-[#171717]">{place.name}</h2>
      {place.bestFor ? <p className="text-sm font-black text-[#171717]">Best for: {place.bestFor}</p> : null}
      <BadgeRow badges={place.badges} />
      <div className="flex flex-wrap gap-2">
        <button className={PRIMARY_PILL} onClick={onExpand} type="button">Details</button>
        {place.website ? <a className={SECONDARY_PILL} href={place.website} target="_blank" rel="noreferrer">Website</a> : null}
      </div>
    </article>
  );
}

function PlaceDetail({ className, closeAriaLabel = 'Close place detail', closeLabel = 'Close', onClose, place }) {
  return (
    <article className={`grid gap-3 ${className || ''}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[0.66rem] font-extrabold uppercase tracking-[0.14em] text-[#2457ff] desktop:text-xs">
          {place.neighborhood} / {place.category}
        </p>
        <button className={SECONDARY_PILL} onClick={onClose} type="button" aria-label={closeAriaLabel}>
          {closeLabel}
        </button>
      </div>
      <h2 className="text-[1.45rem] font-black leading-[1.05] tracking-tight text-[#171717]">{place.name}</h2>
      {place.bestFor ? <p className="font-black text-[#171717]">Best for: {place.bestFor}</p> : null}
      <BadgeRow badges={place.badges} />
      <dl className="grid gap-2.5">
        {detail('Wi-Fi', formatQuality(place.wifiQuality))}
        {detail('Outlets', formatAvailability(place.outletAvailability))}
        {detail('Noise', formatQuality(place.noiseLevel))}
        {detail('Calls', formatBoolean(place.callFriendly, 'Call-friendly', 'Not ideal for calls'))}
        {detail('Laptop policy', formatLaptopPolicy(place.laptopPolicy))}
        {detail('Seating comfort', formatQuality(place.seatingComfort))}
        {detail('Price', formatPrice(place.priceLevel, place.cost))}
        {detail('Toilet', formatBoolean(place.toiletAvailable, 'Available', 'Not confirmed'))}
        {detail('Outdoor seating', formatBoolean(place.outdoorSeating, 'Available', 'Not available'))}
        {place.openingHours ? detail('Opening hours', place.openingHours) : detail('Opening hours', 'Needs verification')}
        {place.address ? detail('Address', place.address) : null}
        {place.decisionNote ? detail('Why go', place.decisionNote) : null}
        {place.notes ? detail('Notes', place.notes) : null}
        {detail('Last checked', place.lastChecked || 'Needs check')}
        {detail('Verified by', place.verifiedBy || 'Community submitted')}
        {detail('Added by', place.addedBy || 'Local contributor')}
      </dl>
      <div className="flex flex-wrap gap-2">
        {place.website ? <a className={PRIMARY_PILL} href={place.website} target="_blank" rel="noreferrer">Website</a> : null}
        <a className={SECONDARY_PILL} href={contributionUrl('confirm', place)} target="_blank" rel="noreferrer">Still good?</a>
        <a className={SECONDARY_PILL} href={contributionUrl('update', place)} target="_blank" rel="noreferrer">Update info</a>
      </div>
    </article>
  );
}

function BadgeRow({ badges }) {
  if (!badges?.length) {
    return null;
  }

  return (
    <span className="flex flex-wrap gap-1.5">
      {badges.map((badge) => (
        <span className="rounded-full bg-[#2457ff]/10 px-2 py-0.5 text-xs font-extrabold text-[#2457ff]" key={badge}>{badge}</span>
      ))}
    </span>
  );
}

function detail(label, value) {
  return (
    <div key={label}>
      <dt className="text-xs font-extrabold uppercase tracking-[0.1em] text-[#171717]">{label}</dt>
      <dd className="mt-0.5 leading-snug text-[#666057]">{value}</dd>
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
