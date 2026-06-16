'use client';

import { useEffect, useRef, useState } from 'react';

const CATEGORIES = ['All', 'Coworking', 'Library', 'Cafe', 'Wi-Fi place', 'Other'];
const CATEGORY_COLORS = {
  Coworking: '#2457ff',
  Library: '#7b3ff2',
  Cafe: '#b25614',
  'Wi-Fi place': '#007f67',
  Other: '#4b5563',
};
const FRIENDLY_LABELS = {
  friendly: 'Remote-work friendly',
  maybe: 'Maybe friendly',
  not_friendly: 'Not remote-work friendly',
};
const FRIENDLY_COLORS = {
  friendly: '#007f67',
  maybe: '#c26a00',
  not_friendly: '#b42318',
};

export default function RemoteWorkMap({ center, initialPlaces }) {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedPlace, setSelectedPlace] = useState(null);
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersLayerRef = useRef(null);
  const leafletRef = useRef(null);
  const places = initialPlaces || [];
  const mapCenter = center || { lat: 45.4642, lon: 9.19 };
  const filteredPlaces = filterPlaces(places, selectedCategory);

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
        zoomControl: false,
        scrollWheelZoom: true,
      }).setView([mapCenter.lat, mapCenter.lon], 13);

      L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(mapRef.current);

      markersLayerRef.current = L.layerGroup().addTo(mapRef.current);
    }

    initMap();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
      leafletRef.current = null;
    };
  }, [mapCenter.lat, mapCenter.lon]);

  useEffect(() => {
    const L = leafletRef.current;

    if (!L || !mapRef.current || !markersLayerRef.current) {
      return;
    }

    const visiblePlaces = filterPlaces(places, selectedCategory);

    markersLayerRef.current.clearLayers();

    for (const place of visiblePlaces) {
      const color = FRIENDLY_COLORS[place.remoteWorkFriendly] || CATEGORY_COLORS[place.category] || '#1f2937';
      const marker = L.marker([place.lat, place.lon], {
        icon: L.divIcon({
          className: 'place-marker manual-marker',
          html: `<span style="--marker-color:${color}">${place.score}</span>`,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        }),
        title: place.name,
      });

      marker.on('click', () => {
        setSelectedPlace(place);
        mapRef.current?.setView([place.lat, place.lon], Math.max(mapRef.current.getZoom(), 15), { animate: true });
      });

      marker.addTo(markersLayerRef.current);
    }

    if (visiblePlaces.length > 0) {
      const bounds = L.latLngBounds(visiblePlaces.map((place) => [place.lat, place.lon]));
      mapRef.current.fitBounds(bounds, { padding: [48, 48], maxZoom: 14 });
    }
  }, [places, selectedCategory]);

  function focusPlace(place) {
    setSelectedPlace(place);
    mapRef.current?.setView([place.lat, place.lon], 16, { animate: true });
  }

  return (
    <main className="shell">
      <section className="panel" aria-label="Your remote work places in Milan">
        <div className="headline">
          <p className="eyebrow">Milan remote work map</p>
          <h1>Your places to work.</h1>
          <p>Add only the places you trust. OpenStreetMap is just the map background.</p>
        </div>

        <div className="controls" aria-label="Place filters">
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

        <div className="status-row csv-status">
          <span>{filteredPlaces.length} visible places · {places.length} total</span>
        </div>

        <ol className="place-list" aria-label="Saved places">
          {filteredPlaces.map((place) => (
            <li key={place.id}>
              <button className={selectedPlace?.id === place.id ? 'place-card selected' : 'place-card'} onClick={() => focusPlace(place)} type="button">
                <span className="place-title">{place.name}</span>
                <span className="place-meta">
                  {place.category} · {FRIENDLY_LABELS[place.remoteWorkFriendly]} · score {place.score}/5
                </span>
                <span className="place-tags">Wi-Fi {place.wifi} · Charges {place.powerOutlets} · {formatCost(place.cost)}</span>
                {place.customTags.length > 0 ? <span className="tag-row">{place.customTags.map((tag) => <span key={tag}>{tag}</span>)}</span> : null}
                {place.address ? <span className="place-address">{place.address}</span> : null}
              </button>
            </li>
          ))}
        </ol>
      </section>

      <section className="map-wrap" aria-label="Map of Milan">
        <div ref={mapContainerRef} className="map" />

        {selectedPlace ? (
          <article className="detail-card">
            <button className="close-detail" onClick={() => setSelectedPlace(null)} type="button" aria-label="Close place detail">
              Close
            </button>
            <p className="detail-category">{selectedPlace.category}</p>
            <h2>{selectedPlace.name}</h2>
            <dl>
              {detail('Friendly', FRIENDLY_LABELS[selectedPlace.remoteWorkFriendly])}
              {detail('Wi-Fi', selectedPlace.wifi)}
              {detail('Power charges', selectedPlace.powerOutlets)}
              {detail('Cost', formatCost(selectedPlace.cost))}
              {selectedPlace.address ? detail('Address', selectedPlace.address) : null}
              {selectedPlace.notes ? detail('Notes', selectedPlace.notes) : null}
              {selectedPlace.customTags.length > 0 ? detail('Tags', selectedPlace.customTags.join(', ')) : null}
            </dl>
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

function filterPlaces(places, selectedCategory) {
  return places.filter((place) => selectedCategory === 'All' || place.category === selectedCategory);
}

function formatCost(value) {
  return String(value || 'unknown').replaceAll('_', ' ');
}
