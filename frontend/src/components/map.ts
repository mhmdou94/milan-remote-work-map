import { LitElement, html, css } from 'lit';
import L, { map as createMap, tileLayer } from 'leaflet';
import 'leaflet.markercluster';
import type { Place, PlaceCandidate } from '../types';
import { getCategoryInfo } from '../categories';
import { candidateToPlace } from '../lib/place.js';

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

    /* menu-nav is a fixed top bar that overlaps the map's top-left corner,
       where Leaflet anchors its default zoom control — push it down clear
       of the bar. Leaflet renders its controls inside this shadow root, so
       a plain selector reaches them. */
    .leaflet-top.leaflet-left {
      top: 64px;
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

    .emoji-marker.candidate {
      opacity: 0.6;
      filter: grayscale(0.6) drop-shadow(0 1px 2px rgba(0, 0, 0, 0.4));
      border: 2px dashed #999;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.6);
    }

    .empty-state {
      position: absolute;
      top: 72px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(255, 255, 255, 0.95);
      color: #555;
      padding: 10px 16px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      font-size: 13px;
      text-align: center;
      max-width: 80%;
      z-index: 450;
      pointer-events: none;
    }
  `;

  static properties = {
    places: { type: Array },
    candidates: { type: Array },
    selectedPlace: { type: Object },
    showEmptyState: { type: Boolean, state: true },
  };

  declare places: Place[];
  declare candidates: PlaceCandidate[];
  declare selectedPlace: Place | null;
  declare showEmptyState: boolean;
  map: L.Map | null;
  userLocation: { lat: number; lon: number } | null;
  markerCluster: any;
  candidateLayer: L.LayerGroup | null;
  private resizeObserver: ResizeObserver | null = null;
  private markers: Map<string, L.Marker> = new Map();

  constructor() {
    super();
    this.places = [];
    this.candidates = [];
    this.selectedPlace = null;
    this.showEmptyState = false;
    this.map = null;
    this.userLocation = null;
    this.markerCluster = null;
    this.candidateLayer = null;
  }

  render() {
    console.log('🎨 MapComponent render called');
    return html`
      ${LEAFLET_CSS}
      <div id="map-container"></div>
      ${this.showEmptyState
        ? html`
            <div class="empty-state">
              📍 No laptop-friendly places in view — try panning back toward Milan or zooming out.
            </div>
          `
        : ''}
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
    if (changedProperties.has('candidates')) {
      console.log('💡 Candidates changed, rendering markers. Count:', this.candidates.length);
      this.renderCandidateMarkers();
    }
    if (changedProperties.has('selectedPlace')) {
      this.highlightSelectedPlace();
    }
    if (changedProperties.has('places') || changedProperties.has('candidates')) {
      this.updateEmptyState();
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

      this.candidateLayer = L.layerGroup();
      this.map.addLayer(this.candidateLayer);
      console.log('✓ Candidate layer initialized');

      this.map.on('moveend', () => this.updateEmptyState());

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
      this.renderCandidateMarkers();
      this.updateEmptyState();
    } catch (error) {
      console.error('❌ Error initializing map:', error);
    }
  }

  private updateEmptyState() {
    if (!this.map) return;

    const bounds = this.map.getBounds();
    const hasPlaceInView = this.places.some((p) => bounds.contains([p.latitude, p.longitude]));
    const hasCandidateInView = this.candidates.some((c) =>
      bounds.contains([c.latitude, c.longitude])
    );
    this.showEmptyState = !hasPlaceInView && !hasCandidateInView;
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

  private renderCandidateMarkers() {
    if (!this.map || !this.candidateLayer) return;

    this.candidateLayer.clearLayers();

    for (const candidate of this.candidates) {
      const { emoji } = getCategoryInfo(candidate.category);
      const marker = L.marker([candidate.latitude, candidate.longitude], {
        title: candidate.name,
        icon: L.divIcon({
          html: `<div class="emoji-marker candidate">${emoji}</div>`,
          className: '',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -16],
        }),
      });

      // Candidates open the same place-detail-modal as confirmed places
      // (reviews, amenities, nearby transit) — the modal shows an
      // "unverified" banner based on `unverified: true`.
      marker.on('click', () => {
        this.dispatchEvent(
          new CustomEvent('place-selected', { detail: candidateToPlace(candidate) })
        );
      });

      this.candidateLayer.addLayer(marker);
    }
  }

  private highlightSelectedPlace() {
    if (!this.selectedPlace || !this.map) return;

    const marker = this.markers.get(this.selectedPlace.id);
    marker?.openPopup();
    this.map.setView([this.selectedPlace.latitude, this.selectedPlace.longitude], 15);
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
