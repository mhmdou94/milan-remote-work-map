import { LitElement, html, css } from 'lit';
import L, { map as createMap, tileLayer } from 'leaflet';
import 'leaflet.markercluster';
import type { Place, PlaceCandidate } from '../types';
import { getCategoryInfo } from '../categories';
import { candidateToPlace } from '../lib/place.js';

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
    *,
    *::before,
    *::after {
      box-sizing: border-box;
    }

    :host {
      display: block;
      position: relative;
      width: 100%;
      height: 100%;
    }

    #map-container {
      width: 100%;
      height: 100%;
      background: #ebe4d8;
    }

    /* menu-nav is a fixed top bar that overlaps the map's top-left corner,
       where Leaflet anchors its default zoom control — push it down clear
       of the bar. Leaflet renders its controls inside this shadow root, so
       a plain selector reaches them. */
    .leaflet-top.leaflet-left {
      top: 86px;
      left: 16px;
    }

    .leaflet-left .leaflet-control {
      margin-left: 16px;
    }

    .leaflet-control-zoom {
      overflow: hidden;
      border: 1px solid var(--color-border, #d7e0e8) !important;
      border-radius: 16px !important;
      box-shadow: var(--shadow-card, 0 12px 32px rgba(15, 23, 42, 0.08)) !important;
    }

    .leaflet-control-zoom a {
      width: 40px !important;
      height: 40px !important;
      line-height: 40px !important;
      border: none !important;
      color: var(--color-text, #17212b) !important;
      font-size: 20px !important;
    }

    .emoji-marker {
      width: 42px;
      height: 42px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      font-size: 19px;
      line-height: 1;
      background: white;
      border: 3px solid var(--marker-color, #4b5563);
      border-radius: 18px 18px 18px 6px;
      box-shadow: 0 10px 18px rgba(38, 31, 20, 0.28);
      transform: rotate(-45deg);
    }

    .emoji-marker span {
      display: inline-block;
      transform: rotate(45deg);
    }

    .emoji-marker.deleted {
      opacity: 0.5;
      filter: grayscale(1);
    }

    .emoji-marker.candidate {
      opacity: 0.75;
      border-style: dashed;
      background: rgba(255, 255, 255, 0.75);
      box-shadow: none;
    }

    .emoji-marker.not-allowed {
      border-color: var(--color-danger, #b42318);
      filter: grayscale(0.6);
    }

    .emoji-marker.restricted {
      border-color: #b26a00;
    }

    .map-message,
    .empty-state {
      position: absolute;
      top: 72px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(6px);
      color: var(--color-text-muted, #51606f);
      padding: 10px 18px;
      border: 1px solid var(--color-border, #d7e0e8);
      border-radius: var(--radius-lg, 20px);
      box-shadow: var(--shadow-card, 0 12px 32px rgba(15, 23, 42, 0.08));
      font-size: 13px;
      font-weight: 600;
      text-align: center;
      max-width: 80%;
      z-index: 450;
      pointer-events: none;
    }

    .map-message {
      display: flex;
      align-items: center;
      gap: 10px;
      pointer-events: auto;
    }

    .map-message.error {
      color: var(--color-danger, #b42318);
    }

    .retry-btn,
    .locate-btn {
      border: 1px solid var(--color-border, #d7e0e8);
      background: white;
      color: var(--color-text, #17212b);
      border-radius: var(--radius-md, 14px);
      cursor: pointer;
      font: inherit;
      font-size: 13px;
      font-weight: 800;
    }

    .retry-btn {
      padding: 7px 10px;
      color: var(--color-primary, #006cff);
      border-color: var(--color-primary, #006cff);
    }

    .locate-btn {
      position: absolute;
      left: 16px;
      bottom: 24px;
      z-index: 450;
      padding: 10px 14px;
      box-shadow: var(--shadow-card, 0 12px 32px rgba(15, 23, 42, 0.08));
      backdrop-filter: blur(16px);
      background: rgba(255, 255, 255, 0.95);
    }

    .retry-btn:hover,
    .locate-btn:hover {
      border-color: var(--color-primary, #006cff);
    }

    .retry-btn:focus-visible,
    .locate-btn:focus-visible {
      outline: 2px solid var(--color-primary, #006cff);
      outline-offset: 2px;
    }

    @media (max-width: 920px) {
      .leaflet-top.leaflet-left {
        top: 70px;
        left: 10px;
      }

      .locate-btn {
        bottom: 96px;
        left: 12px;
      }
    }
  `;

  static properties = {
    places: { type: Array },
    candidates: { type: Array },
    selectedPlace: { type: Object },
    loading: { type: Boolean },
    loaded: { type: Boolean },
    error: { type: String },
    showEmptyState: { type: Boolean, state: true },
  };

  declare places: Place[];
  declare candidates: PlaceCandidate[];
  declare selectedPlace: Place | null;
  declare loading: boolean;
  declare loaded: boolean;
  declare error: string | null;
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
    this.loading = false;
    this.loaded = false;
    this.error = null;
    this.showEmptyState = false;
    this.map = null;
    this.userLocation = null;
    this.markerCluster = null;
    this.candidateLayer = null;
  }

  render() {
    return html`
      ${LEAFLET_CSS}
      <div id="map-container"></div>
      <button class="locate-btn" @click=${this.requestGeolocation} type="button">
        ⌖ Locate me
      </button>
      ${this.loading && !this.loaded
        ? html`<div class="map-message">Loading laptop-friendly places…</div>`
        : ''}
      ${this.error
        ? html`
            <div class="map-message error">
              <span>${this.error}</span>
              <button class="retry-btn" type="button" @click=${this.retryPlaces}>Retry</button>
            </div>
          `
        : ''}
      ${this.showEmptyState && !this.loading && !this.error
        ? html`
            <div class="empty-state">
              📍 No laptop-friendly places in view — try panning back toward Milan or zooming out.
            </div>
          `
        : ''}
    `;
  }

  firstUpdated() {
    // Wait for multiple layout cycles to ensure the flexbox layout is fully settled
    let attempts = 0;
    const waitForLayout = () => {
      attempts++;
      const rect = this.getBoundingClientRect();

      // Need both a minimum size and multiple attempts to ensure layout is settled
      if (rect.width > 100 && rect.height > 100 && attempts > 2) {
        this.initMap();
      } else if (attempts < 10) {
        requestAnimationFrame(waitForLayout);
      } else {
        this.initMap();
      }
    };

    requestAnimationFrame(waitForLayout);
  }

  updated(changedProperties: Map<string, any>) {
    if (changedProperties.has('places')) {
      this.renderMarkers();
    }
    if (changedProperties.has('candidates')) {
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
    const container = this.shadowRoot?.querySelector('#map-container') as HTMLElement;

    if (!container) {
      console.error('Map container not found');
      return;
    }

    try {
      this.map = createMap(container);

      this.map.invalidateSize();

      this.map.setView([45.4642, 9.19], 13);

      tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap, © CARTO',
        maxZoom: 19,
      }).addTo(this.map);

      // Initialize marker cluster group
      this.markerCluster = L.markerClusterGroup({
        maxClusterRadius: 80,
      });
      this.map.addLayer(this.markerCluster);

      this.candidateLayer = L.layerGroup();
      this.map.addLayer(this.candidateLayer);

      this.map.on('moveend', () => this.updateEmptyState());

      // Watch for container resize
      this.resizeObserver = new ResizeObserver(() => {
        if (this.map) {
          this.map.invalidateSize();
        }
      });
      this.resizeObserver.observe(container);

      // `places` may have already arrived (and triggered `updated()`) before
      // the map finished initializing — that earlier renderMarkers() call
      // would have bailed out with nothing to render into, and `places`
      // won't change again to retrigger it. Render now that we're ready.
      this.renderMarkers();
      this.renderCandidateMarkers();
      this.updateEmptyState();
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  }

  private updateEmptyState() {
    if (!this.map) return;
    if (!this.loaded || this.loading || this.error) {
      this.showEmptyState = false;
      return;
    }

    const bounds = this.map.getBounds();
    const hasPlaceInView = this.places.some((p) => bounds.contains([p.latitude, p.longitude]));
    const hasCandidateInView = this.candidates.some((c) =>
      bounds.contains([c.latitude, c.longitude])
    );
    this.showEmptyState = !hasPlaceInView && !hasCandidateInView;
  }

  private renderMarkers() {
    if (!this.map || !this.markerCluster) {
      return;
    }

    // Clear old markers
    this.markerCluster.clearLayers();
    this.markers.clear();

    // Add new markers
    for (const place of this.places) {
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
  }

  private renderCandidateMarkers() {
    if (!this.map || !this.candidateLayer) return;

    this.candidateLayer.clearLayers();

    for (const candidate of this.candidates) {
      const { emoji, color } = getCategoryInfo(candidate.category);
      const marker = L.marker([candidate.latitude, candidate.longitude], {
        title: candidate.name,
        icon: L.divIcon({
          html: `<div class="emoji-marker candidate" style="--marker-color:${color}"><span>${emoji}</span></div>`,
          className: '',
          iconSize: [42, 42],
          iconAnchor: [21, 38],
          popupAnchor: [0, -34],
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
    const { emoji, color } = getCategoryInfo(place.category);
    const statusClass =
      place.laptopStatus === 'no'
        ? ' not-allowed'
        : place.laptopStatus === 'restricted'
          ? ' restricted'
          : '';
    return L.divIcon({
      html: `<div class="emoji-marker${place.deletedAt ? ' deleted' : ''}${statusClass}" style="--marker-color:${color}"><span>${emoji}</span></div>`,
      className: '',
      iconSize: [42, 42],
      iconAnchor: [21, 38],
      popupAnchor: [0, -34],
    });
  }

  private createPopupContent(place: Place): string {
    const { label, color } = getCategoryInfo(place.category);
    return `
      <div style="min-width: 200px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <strong style="font-size: 14px; color: #17212b;">${place.name}</strong>
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: ${color}; margin-top: 2px;">${label}</div>
        ${place.address ? `<div style="font-size: 12px; color: #51606f; margin-top: 4px;">${place.address}</div>` : ''}
        ${place.laptopStatus === 'no' ? `<div style="font-size: 12px; color: #b42318; margin-top: 6px; font-weight: 600;">🚫 Not laptop-friendly</div>` : ''}
        ${place.laptopStatus === 'restricted' ? `<div style="font-size: 12px; color: #b26a00; margin-top: 6px; font-weight: 600;">⚠️ Laptop use restricted</div>` : ''}
        ${place.deletedAt ? `<div style="font-size: 12px; color: #b42318; margin-top: 6px; font-weight: 600;">⚠️ No longer marked laptop-friendly on OSM</div>` : ''}
      </div>
    `;
  }

  private requestGeolocation = () => {
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
        return;
      }
    );
  };

  private retryPlaces = () => {
    this.dispatchEvent(new CustomEvent('retry-places'));
  };
}

customElements.define('remote-work-map', MapComponent);
