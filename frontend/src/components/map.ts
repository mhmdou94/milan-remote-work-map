import { LitElement, html, css } from 'lit';
import L, { map as createMap, tileLayer } from 'leaflet';
import 'leaflet.markercluster';
import type { Place, PlaceCandidate, PlaceCluster } from '../types';
import { getCategoryInfo } from '../categories';
import { candidateToPlace } from '../lib/place.js';
import { getWorkFit } from '../lib/work-fit.js';

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

    #map-container .leaflet-top,
    #map-container .leaflet-bottom {
      z-index: 400;
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

    .cluster-bubble {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 700;
      color: white;
      background: var(--color-primary, #1d4ed8);
      border: 3px solid white;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.25);
      cursor: pointer;
    }

    .cluster-bubble.candidate {
      background: #d97706;
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

    .locate-btn:disabled {
      cursor: wait;
      opacity: 0.75;
    }

    .retry-btn {
      padding: 7px 10px;
      color: var(--color-primary, #006cff);
      border-color: var(--color-primary, #006cff);
    }

    .locate-btn {
      position: absolute;
      left: 16px;
      bottom: calc(24px + env(safe-area-inset-bottom));
      z-index: 650;
      padding: 10px 14px;
      box-shadow: var(--shadow-card, 0 12px 32px rgba(15, 23, 42, 0.08));
      backdrop-filter: blur(16px);
      background: rgba(255, 255, 255, 0.95);
    }

    .location-message {
      position: absolute;
      left: 16px;
      bottom: calc(76px + env(safe-area-inset-bottom));
      z-index: 650;
      max-width: min(320px, calc(100vw - 32px));
      padding: 9px 12px;
      border: 1px solid var(--color-border, #d7e0e8);
      border-radius: var(--radius-md, 14px);
      background: rgba(255, 255, 255, 0.96);
      box-shadow: var(--shadow-card, 0 12px 32px rgba(15, 23, 42, 0.08));
      color: var(--color-text-muted, #51606f);
      font-size: 12px;
      font-weight: 700;
      backdrop-filter: blur(16px);
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
        top: 92px;
        left: 10px;
      }

      .map-message,
      .empty-state {
        top: 68px;
        right: 12px;
        left: auto;
        transform: none;
        max-width: min(210px, calc(100vw - 132px));
        padding: 7px 10px;
        border-radius: 18px;
        font-size: 11px;
        line-height: 1.25;
      }

      .locate-btn {
        top: auto;
        bottom: calc(170px + env(safe-area-inset-bottom));
        left: 12px;
        z-index: 760;
        padding: 8px 12px;
      }

      .location-message {
        top: auto;
        bottom: calc(220px + env(safe-area-inset-bottom));
        left: 12px;
        z-index: 760;
        max-width: min(320px, calc(100vw - 24px));
      }
    }
  `;

  static properties = {
    places: { type: Array },
    clusters: { type: Array },
    candidates: { type: Array },
    candidateClusters: { type: Array },
    selectedPlace: { type: Object },
    loading: { type: Boolean },
    loaded: { type: Boolean },
    error: { type: String },
    showEmptyState: { type: Boolean, state: true },
    locating: { type: Boolean, state: true },
    locationMessage: { type: String, state: true },
  };

  declare places: Place[];
  declare clusters: PlaceCluster[];
  declare candidates: PlaceCandidate[];
  declare candidateClusters: PlaceCluster[];
  declare selectedPlace: Place | null;
  declare loading: boolean;
  declare loaded: boolean;
  declare error: string | null;
  declare showEmptyState: boolean;
  declare locating: boolean;
  declare locationMessage: string | null;
  map: L.Map | null;
  userLocation: { lat: number; lon: number } | null;
  markerCluster: any;
  candidateLayer: L.LayerGroup | null;
  clusterLayer: L.LayerGroup | null;
  candidateClusterLayer: L.LayerGroup | null;
  userLocationMarker: L.CircleMarker | null;
  private resizeObserver: ResizeObserver | null = null;
  private markers: Map<string, L.Marker> = new Map();

  constructor() {
    super();
    this.places = [];
    this.clusters = [];
    this.candidates = [];
    this.candidateClusters = [];
    this.selectedPlace = null;
    this.loading = false;
    this.loaded = false;
    this.error = null;
    this.showEmptyState = false;
    this.locating = false;
    this.locationMessage = null;
    this.map = null;
    this.userLocation = null;
    this.markerCluster = null;
    this.candidateLayer = null;
    this.clusterLayer = null;
    this.candidateClusterLayer = null;
    this.userLocationMarker = null;
  }

  render() {
    return html`
      ${LEAFLET_CSS}
      <div id="map-container"></div>
      <button
        class="locate-btn"
        @click=${this.requestGeolocation}
        type="button"
        ?disabled=${this.locating}
      >
        ${this.locating ? 'Locating...' : '⌖ Locate me'}
      </button>
      ${this.locationMessage
        ? html`<div class="location-message" role="status">${this.locationMessage}</div>`
        : ''}
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
    if (changedProperties.has('clusters')) {
      this.renderClusterMarkers();
    }
    if (changedProperties.has('candidates')) {
      this.renderCandidateMarkers();
    }
    if (changedProperties.has('candidateClusters')) {
      this.renderCandidateClusterMarkers();
    }
    if (changedProperties.has('selectedPlace')) {
      this.highlightSelectedPlace();
    }
    if (
      changedProperties.has('places') ||
      changedProperties.has('clusters') ||
      changedProperties.has('candidates') ||
      changedProperties.has('candidateClusters')
    ) {
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

      this.clusterLayer = L.layerGroup();
      this.map.addLayer(this.clusterLayer);

      this.candidateClusterLayer = L.layerGroup();
      this.map.addLayer(this.candidateClusterLayer);

      this.map.on('moveend', () => {
        this.updateEmptyState();
        this.dispatchEvent(new CustomEvent('map-moved', { detail: this.getCurrentBbox() }));
      });

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
      this.renderClusterMarkers();
      this.renderCandidateMarkers();
      this.renderCandidateClusterMarkers();
      this.updateEmptyState();
      this.dispatchEvent(new CustomEvent('map-ready', { detail: this.getCurrentBbox() }));
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  }

  getCurrentBbox(): { minLat: number; minLon: number; maxLat: number; maxLon: number } | null {
    if (!this.map) return null;
    const b = this.map.getBounds();
    return {
      minLat: b.getSouth(),
      minLon: b.getWest(),
      maxLat: b.getNorth(),
      maxLon: b.getEast(),
    };
  }

  private updateEmptyState() {
    if (!this.map) return;
    if (!this.loaded || this.loading || this.error) {
      this.showEmptyState = false;
      return;
    }

    const bounds = this.map.getBounds();
    const hasPlaceInView =
      this.places.some((p) => bounds.contains([p.latitude, p.longitude])) ||
      this.clusters.length > 0 ||
      this.candidateClusters.length > 0;
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

  private renderClusterMarkers() {
    if (!this.map || !this.clusterLayer) return;
    this.clusterLayer.clearLayers();

    for (const cluster of this.clusters) {
      const marker = L.marker([cluster.latitude, cluster.longitude], {
        icon: L.divIcon({
          html: `<div class="cluster-bubble">${cluster.count}</div>`,
          className: '',
          iconSize: [48, 48],
          iconAnchor: [24, 24],
        }),
      });
      marker.on('click', () => {
        this.map!.setView([cluster.latitude, cluster.longitude], this.map!.getZoom() + 3);
      });
      this.clusterLayer.addLayer(marker);
    }
  }

  private renderCandidateClusterMarkers() {
    if (!this.map || !this.candidateClusterLayer) return;
    this.candidateClusterLayer.clearLayers();

    for (const cluster of this.candidateClusters) {
      const marker = L.marker([cluster.latitude, cluster.longitude], {
        icon: L.divIcon({
          html: `<div class="cluster-bubble candidate">${cluster.count}</div>`,
          className: '',
          iconSize: [48, 48],
          iconAnchor: [24, 24],
        }),
      });
      marker.on('click', () => {
        this.map!.setView([cluster.latitude, cluster.longitude], this.map!.getZoom() + 3);
      });
      this.candidateClusterLayer.addLayer(marker);
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
    const fit = getWorkFit(place);
    const badges = fit.badges
      .slice(0, 3)
      .map((badge) => {
        const colors =
          badge.tone === 'good'
            ? 'background:#effbf6;color:#006b55;'
            : badge.tone === 'warn'
              ? 'background:#fff7e8;color:#9a5b00;'
              : 'background:#f0ebe2;color:#5d6a63;';
        return `<span style="display:inline-flex;align-items:center;min-height:22px;padding:3px 7px;border-radius:999px;font-size:10px;font-weight:800;${colors}">${badge.label}</span>`;
      })
      .join('');

    return `
      <div style="min-width: 240px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div style="display:flex;gap:10px;align-items:flex-start;">
          <div style="display:flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:16px;background:#173f35;color:#fffaf1;font-size:18px;font-weight:900;line-height:1;flex:none;">${fit.score}<span style="font-size:8px;text-transform:uppercase;margin-left:3px;color:rgba(255,250,241,.72);">fit</span></div>
          <div style="min-width:0;">
            <strong style="font-size: 14px; color: #17212b; line-height:1.15; display:block;">${place.name}</strong>
            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: ${color}; margin-top: 2px;">${label}</div>
          </div>
        </div>
        ${place.address ? `<div style="font-size: 12px; color: #51606f; margin-top: 4px;">${place.address}</div>` : ''}
        <div style="font-size: 12px; color: #51606f; margin-top: 8px; font-weight: 600;">${fit.reason}</div>
        <div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:8px;">${badges}</div>
        ${place.laptopStatus === 'no' ? `<div style="font-size: 12px; color: #b42318; margin-top: 6px; font-weight: 600;">🚫 Not laptop-friendly</div>` : ''}
        ${place.laptopStatus === 'restricted' ? `<div style="font-size: 12px; color: #b26a00; margin-top: 6px; font-weight: 600;">⚠️ Laptop use restricted</div>` : ''}
        ${place.deletedAt ? `<div style="font-size: 12px; color: #b42318; margin-top: 6px; font-weight: 600;">⚠️ No longer marked laptop-friendly on OSM</div>` : ''}
      </div>
    `;
  }

  private requestGeolocation = () => {
    if (!navigator.geolocation) {
      this.locationMessage = 'Location is not available in this browser.';
      return;
    }

    if (!window.isSecureContext) {
      this.locationMessage = 'Location needs HTTPS or localhost to work.';
      return;
    }

    this.locating = true;
    this.locationMessage = null;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.locating = false;
        this.userLocation = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        };

        if (this.map) {
          this.map.setView([this.userLocation.lat, this.userLocation.lon], 14);

          this.userLocationMarker?.remove();
          this.userLocationMarker = L.circleMarker([this.userLocation.lat, this.userLocation.lon], {
            radius: 8,
            fillColor: '#4285F4',
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8,
          }).addTo(this.map);
        }
      },
      (error) => {
        this.locating = false;
        this.locationMessage = this.geolocationErrorMessage(error);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  private geolocationErrorMessage(error: GeolocationPositionError) {
    if (error.code === error.PERMISSION_DENIED) {
      return 'Location permission was denied. Enable it in your browser settings and try again.';
    }

    if (error.code === error.POSITION_UNAVAILABLE) {
      return 'Could not determine your location. Check GPS/location services and try again.';
    }

    return 'Location timed out. Try again from a spot with better GPS signal.';
  }

  private retryPlaces = () => {
    this.dispatchEvent(new CustomEvent('retry-places'));
  };
}

customElements.define('remote-work-map', MapComponent);
