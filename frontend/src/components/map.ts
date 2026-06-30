import { LitElement, html, css } from 'lit';
import L, { map as createMap, tileLayer } from 'leaflet';
import 'leaflet.markercluster';
import type { Place } from '../types';
import { getCategoryInfo } from '../categories';

console.log('📦 MapComponent module loaded');

// CSS links that must be loaded INSIDE shadow DOM
const LEAFLET_CSS = html`
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <link
    rel="stylesheet"
    href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css"
  />
  <link
    rel="stylesheet"
    href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css"
  />
`;

export class MapComponent extends LitElement {
  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }

    #map-container {
      width: 100%;
      height: 100%;
    }

    .emoji-marker {
      font-size: 22px;
      line-height: 32px;
      text-align: center;
      width: 32px;
      height: 32px;
      filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.4));
    }

    .emoji-marker.deleted {
      opacity: 0.45;
      filter: grayscale(1) drop-shadow(0 1px 2px rgba(0, 0, 0, 0.4));
    }
  `;

  static properties = {
    places: { type: Array },
    selectedPlace: { type: Object },
  };

  declare places: Place[];
  declare selectedPlace: Place | null;
  map: L.Map | null;
  userLocation: { lat: number; lon: number } | null;
  markerCluster: any;
  private resizeObserver: ResizeObserver | null = null;
  private markers: Map<string, L.Marker> = new Map();

  constructor() {
    super();
    this.places = [];
    this.selectedPlace = null;
    this.map = null;
    this.userLocation = null;
    this.markerCluster = null;
  }

  render() {
    console.log('🎨 MapComponent render called');
    return html`
      ${LEAFLET_CSS}
      <div id="map-container"></div>
    `;
  }

  firstUpdated() {
    console.log('🗺️ MapComponent firstUpdated');
    console.log('📏 Component size:', this.offsetWidth, 'x', this.offsetHeight);

    // Wait for multiple layout cycles to ensure the flexbox layout is fully settled
    let attempts = 0;
    const waitForLayout = () => {
      attempts++;
      const rect = this.getBoundingClientRect();
      console.log(`  Attempt ${attempts}: size=${rect.width}x${rect.height}`);

      // Need both a minimum size and multiple attempts to ensure layout is settled
      if (rect.width > 100 && rect.height > 100 && attempts > 2) {
        console.log('✓ Layout settled, initializing map');
        this.initMap();
        this.requestGeolocation();
      } else if (attempts < 10) {
        requestAnimationFrame(waitForLayout);
      } else {
        console.warn('⚠️ Layout timeout, initializing anyway');
        this.initMap();
        this.requestGeolocation();
      }
    };

    requestAnimationFrame(waitForLayout);
  }

  updated(changedProperties: Map<string, any>) {
    if (changedProperties.has('places')) {
      console.log('📍 Places changed, rendering markers. Count:', this.places.length);
      this.renderMarkers();
    }
    if (changedProperties.has('selectedPlace')) {
      this.highlightSelectedPlace();
    }
  }

  private initMap() {
    console.log('🔧 initMap called');
    const container = this.shadowRoot?.querySelector('#map-container') as HTMLElement;

    if (!container) {
      console.error('❌ Map container not found');
      return;
    }

    // Debug sizing
    const hostRect = this.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    console.log('📏 Host size:', hostRect.width, 'x', hostRect.height);
    console.log('📏 Container size:', containerRect.width, 'x', containerRect.height);
    console.log('📏 Container offsetSize:', container.offsetWidth, 'x', container.offsetHeight);
    console.log('📏 Container clientSize:', container.clientWidth, 'x', container.clientHeight);

    try {
      console.log('📡 Creating map with ES modules');
      this.map = createMap(container);

      // Immediately check map size
      console.log('✓ Map created, calling invalidateSize');
      this.map.invalidateSize();

      this.map.setView([45.4642, 9.19], 13);
      console.log('✓ View set');

      tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap, © CARTO',
        maxZoom: 19,
      }).addTo(this.map);
      console.log('✓ Tile layer added');

      // Initialize marker cluster group
      this.markerCluster = L.markerClusterGroup({
        maxClusterRadius: 80,
      });
      this.map.addLayer(this.markerCluster);
      console.log('✓ Marker cluster initialized');

      // Watch for container resize
      this.resizeObserver = new ResizeObserver(() => {
        if (this.map) {
          this.map.invalidateSize();
        }
      });
      this.resizeObserver.observe(container);
      console.log('✓ Resize observer active');

      // `places` may have already arrived (and triggered `updated()`) before
      // the map finished initializing — that earlier renderMarkers() call
      // would have bailed out with nothing to render into, and `places`
      // won't change again to retrigger it. Render now that we're ready.
      this.renderMarkers();
    } catch (error) {
      console.error('❌ Error initializing map:', error);
    }
  }

  private renderMarkers() {
    console.log(
      '🎯 renderMarkers called, map:',
      !!this.map,
      'cluster:',
      !!this.markerCluster,
      'places:',
      this.places.length
    );
    if (!this.map || !this.markerCluster) {
      console.warn('⚠️ Map or cluster not ready');
      return;
    }

    // Clear old markers
    this.markerCluster.clearLayers();
    this.markers.clear();

    // Add new markers
    for (const place of this.places) {
      console.log(`  📌 Adding marker: ${place.name} at [${place.latitude}, ${place.longitude}]`);
      const marker = L.marker([place.latitude, place.longitude], {
        title: place.name,
        icon: this.createMarkerIcon(place),
      });

      marker.bindPopup(this.createPopupContent(place));

      marker.on('click', () => {
        this.dispatchEvent(new CustomEvent('place-selected', { detail: place }));
      });

      this.markerCluster.addLayer(marker);
      this.markers.set(place.id, marker);
    }
    console.log('✓ Markers rendered, total:', this.markers.size);
  }

  private highlightSelectedPlace() {
    // Highlight selected
    if (this.selectedPlace) {
      const marker = this.markers.get(this.selectedPlace.id);
      if (marker) {
        marker.openPopup();
        this.map?.setView([this.selectedPlace.latitude, this.selectedPlace.longitude], 15);
      }
    }
  }

  private createMarkerIcon(place: Place): L.DivIcon {
    const { emoji } = getCategoryInfo(place.category);
    return L.divIcon({
      html: `<div class="emoji-marker${place.deletedAt ? ' deleted' : ''}">${emoji}</div>`,
      className: '',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16],
    });
  }

  private createPopupContent(place: Place): string {
    const { label } = getCategoryInfo(place.category);
    return `
      <div style="min-width: 200px;">
        <strong>${place.name}</strong>
        <div style="font-size: 12px; color: #666;">${label}</div>
        ${place.address ? `<div style="font-size: 12px;">${place.address}</div>` : ''}
        ${place.deletedAt ? `<div style="font-size: 12px; color: #d32f2f; margin-top: 4px;">⚠️ No longer marked laptop-friendly on OSM</div>` : ''}
      </div>
    `;
  }

  private requestGeolocation() {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.userLocation = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        };

        if (this.map) {
          this.map.setView([this.userLocation.lat, this.userLocation.lon], 14);

          // Add user location marker
          L.circleMarker([this.userLocation.lat, this.userLocation.lon], {
            radius: 8,
            fillColor: '#4285F4',
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8,
          }).addTo(this.map);
        }
      },
      () => {
        console.log('Geolocation not available, using default center');
      }
    );
  }
}

customElements.define('remote-work-map', MapComponent);
