import { LitElement, html, css } from 'lit';
// Import components as side effects to register custom elements
import './components/map.js';
import './components/filter-popover.js';
import './components/legend-popover.js';
import './components/menu-nav.js';
import './components/place-detail-modal.js';
import './pages/list-page.js';
import './pages/contribute-page.js';
import './pages/faq-page.js';
import './pages/about-page.js';
import type { Place, BBox, PlaceCandidate, PlaceCluster } from './types.js';
import {
  parsePlaceIdFromPath,
  placeUrl,
  parsePageFromPath,
  pageUrl,
  type Page,
} from './lib/router.js';
import { candidateToPlace } from './lib/place.js';
import { debounce } from './lib/debounce.js';

export class RemoteWorkApp extends LitElement {
  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100vh;
      height: 100dvh;
    }

    .app-container {
      width: 100%;
      height: 100%;
      position: relative;
      background: transparent;
      display: flex;
      flex-direction: column;
    }

    remote-work-map {
      flex: 1;
      width: 100%;
      min-height: 0;
    }

    .hidden-page {
      display: none;
    }

    .discovery-panel {
      position: fixed;
      top: 86px;
      right: 16px;
      z-index: 650;
      width: min(420px, calc(100vw - 32px));
      max-height: calc(100dvh - 108px);
      overflow-y: auto;
      padding: 18px;
      border: 1px solid rgba(217, 221, 212, 0.92);
      border-radius: 30px;
      background:
        linear-gradient(145deg, rgba(255, 255, 255, 0.96), rgba(255, 250, 241, 0.9)),
        radial-gradient(circle at 12% 4%, rgba(239, 111, 69, 0.14), transparent 16rem);
      box-shadow: var(--shadow-popover, 0 26px 80px rgba(38, 31, 20, 0.2));
      backdrop-filter: blur(18px);
    }

    .discovery-eyebrow {
      display: inline-flex;
      align-items: center;
      width: fit-content;
      padding: 6px 10px;
      border-radius: 999px;
      background: var(--color-primary-soft, #fff0e9);
      color: var(--color-primary-dark, #d85630);
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .discovery-title {
      margin: 12px 0 8px;
      color: var(--color-text, #18231f);
      font-size: 34px;
      line-height: 0.94;
      letter-spacing: -0.06em;
    }

    .discovery-copy {
      margin: 0;
      color: var(--color-text-muted, #5d6a63);
      font-size: 14px;
      line-height: 1.45;
      font-weight: 650;
    }

    .search-box {
      position: relative;
      margin-top: 16px;
    }

    .search-box input {
      width: 100%;
      min-height: 48px;
      padding: 12px 14px 12px 40px;
      border: 1px solid var(--color-border, #d9ddd4);
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.92);
      color: var(--color-text, #18231f);
      font: inherit;
      font-size: 14px;
      font-weight: 750;
    }

    .search-box input:focus {
      outline: 2px solid var(--color-primary, #ef6f45);
      outline-offset: 2px;
    }

    .search-icon {
      position: absolute;
      top: 50%;
      left: 14px;
      transform: translateY(-50%);
      font-size: 15px;
      pointer-events: none;
    }

    .quick-filters {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin: 12px 0 16px;
    }

    .quick-chip {
      border: 1px solid var(--color-border, #d9ddd4);
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.9);
      color: var(--color-text, #18231f);
      cursor: pointer;
      padding: 8px 11px;
      font: inherit;
      font-size: 12px;
      font-weight: 900;
      transition:
        background-color 0.15s ease,
        border-color 0.15s ease,
        transform 0.15s ease;
    }

    .quick-chip:hover {
      border-color: var(--color-primary, #ef6f45);
      transform: translateY(-1px);
    }

    .quick-chip.active {
      border-color: var(--color-primary, #ef6f45);
      background: var(--color-primary, #ef6f45);
      color: white;
      box-shadow: var(--shadow-button, 0 12px 24px rgba(239, 111, 69, 0.22));
    }

    .panel-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 10px;
    }

    .panel-row h2 {
      margin: 0;
      font-size: 15px;
      letter-spacing: -0.02em;
    }

    .panel-count {
      color: var(--color-text-faint, #7c8982);
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      white-space: nowrap;
    }

    .spot-list {
      display: grid;
      gap: 9px;
    }

    .spot-card {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 10px;
      width: 100%;
      padding: 12px;
      border: 1px solid var(--color-border-soft, #e9ece5);
      border-radius: 20px;
      background: rgba(255, 255, 255, 0.9);
      color: inherit;
      cursor: pointer;
      text-align: left;
      font: inherit;
      box-shadow: 0 10px 26px rgba(38, 31, 20, 0.08);
    }

    .spot-card:hover {
      border-color: var(--color-primary, #ef6f45);
      transform: translateY(-1px);
    }

    .spot-emoji {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 42px;
      height: 42px;
      border-radius: 15px;
      background: color-mix(in srgb, var(--spot-color, #4b5563) 16%, white);
      font-size: 20px;
    }

    .spot-main {
      min-width: 0;
    }

    .spot-name {
      color: var(--color-text, #18231f);
      font-size: 14px;
      font-weight: 900;
      line-height: 1.15;
    }

    .spot-reason {
      margin-top: 4px;
      color: var(--color-text-muted, #5d6a63);
      font-size: 12px;
      line-height: 1.35;
      font-weight: 650;
    }

    .spot-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      margin-top: 8px;
    }

    .spot-badge {
      display: inline-flex;
      align-items: center;
      min-height: 22px;
      padding: 3px 7px;
      border-radius: 999px;
      background: var(--color-bg-chip, #f0ebe2);
      color: var(--color-text-muted, #5d6a63);
      font-size: 10px;
      font-weight: 900;
    }

    .spot-badge.good {
      background: var(--color-good-bg, #effbf6);
      color: var(--color-good-text, #006b55);
    }

    .spot-badge.warn {
      background: #fff7e8;
      color: #9a5b00;
    }

    .spot-score {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 56px;
      height: 56px;
      border-radius: 18px;
      background: var(--color-accent, #173f35);
      color: #fffaf1;
      font-size: 18px;
      font-weight: 950;
      line-height: 1;
    }

    .spot-score span {
      margin-top: 3px;
      color: rgba(255, 250, 241, 0.72);
      font-size: 8px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .mobile-card-label,
    .mobile-card-action {
      display: none;
    }

    .panel-state {
      padding: 14px;
      border: 1px dashed var(--color-border, #d9ddd4);
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.68);
      color: var(--color-text-muted, #5d6a63);
      font-size: 13px;
      font-weight: 750;
    }

    .quick-chip:focus-visible,
    .spot-card:focus-visible {
      outline: 2px solid var(--color-primary, #ef6f45);
      outline-offset: 2px;
    }

    @media (max-width: 920px) {
      .discovery-panel {
        top: auto;
        right: 12px;
        bottom: calc(82px + env(safe-area-inset-bottom));
        left: 12px;
        width: auto;
        max-height: none;
        padding: 0;
        border: none;
        border-radius: 0;
        background: transparent;
        box-shadow: none;
        backdrop-filter: none;
        overflow: visible;
      }

      .discovery-eyebrow,
      .discovery-copy,
      .discovery-title,
      .search-box,
      .quick-filters,
      .panel-row {
        display: none;
      }

      .spot-list {
        display: grid;
        gap: 0;
      }

      .spot-card {
        grid-template-columns: auto minmax(0, 1fr) auto;
        align-items: center;
        gap: 9px;
        padding: 9px 10px;
        border-radius: 22px;
        background: rgba(255, 255, 255, 0.96);
        box-shadow: 0 12px 34px rgba(38, 31, 20, 0.18);
      }

      .spot-card:nth-child(n + 2) {
        display: none;
      }

      .spot-emoji {
        width: 38px;
        height: 38px;
        border-radius: 15px;
        font-size: 18px;
      }

      .spot-name {
        font-size: 13px;
      }

      .mobile-card-label {
        display: block;
        margin-bottom: 2px;
        color: var(--color-primary-dark, #d85630);
        font-size: 10px;
        font-weight: 950;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }

      .spot-reason {
        display: -webkit-box;
        margin-top: 3px;
        overflow: hidden;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 1;
        font-size: 11px;
      }

      .spot-badges {
        display: none;
      }

      .spot-score {
        display: none;
      }

      .mobile-card-action {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 34px;
        padding: 0 12px;
        border-radius: 999px;
        background: var(--color-accent, #173f35);
        color: #fffaf1;
        font-size: 11px;
        font-weight: 950;
        white-space: nowrap;
      }

      .panel-state {
        padding: 10px 12px;
        border-style: solid;
        background: rgba(255, 255, 255, 0.96);
        box-shadow: 0 12px 34px rgba(38, 31, 20, 0.16);
        font-size: 12px;
      }
    }
  `;

  static properties = {
    center: { type: Object },
    places: { type: Array },
    clusters: { type: Array },
    candidates: { type: Array },
    candidateClusters: { type: Array },
    selectedPlace: { type: Object },
    currentPage: { type: String },
    filters: { type: Object },
    searchQuery: { type: String },
    placesLoading: { type: Boolean },
    placesLoaded: { type: Boolean },
    placesError: { type: String },
  };

  declare center: { lat: number; lon: number };
  declare places: Place[];
  declare clusters: PlaceCluster[];
  declare candidates: PlaceCandidate[];
  declare candidateClusters: PlaceCluster[];
  declare selectedPlace: Place | null;
  declare currentPage: Page;
  declare placesLoading: boolean;
  declare placesLoaded: boolean;
  declare placesError: string | null;
  declare filters: MapFilters;
  declare searchQuery: string;

  private mapComponent: any = null;

  constructor() {
    super();
    this.center = { lat: 45.4642, lon: 9.19 };
    this.places = [];
    this.clusters = [];
    this.candidates = [];
    this.candidateClusters = [];
    this.selectedPlace = null;
    this.currentPage = 'map';
    this.placesLoading = false;
    this.placesLoaded = false;
    this.placesError = null;
    this.searchQuery = '';
    this.filters = {
      internetAccess: false,
      sockets: false,
      openNow: false,
      showRemoved: false,
      showCandidates: false,
    };
  }

  render() {
    return html`
      <div class="app-container">
        <remote-work-map
          .places=${this.places}
          .clusters=${this.clusters}
          .candidates=${this.candidates}
          .candidateClusters=${this.candidateClusters}
          .selectedPlace=${this.selectedPlace}
          .loading=${this.placesLoading}
          .loaded=${this.placesLoaded}
          .error=${this.placesError}
          @place-selected=${this.handlePlaceSelect}
          @retry-places=${this.retryPlaces}
          @map-ready=${this.handleMapReady}
          @map-moved=${this.handleMapMoved}
          id="map"
          class=${this.currentPage !== 'map' ? 'hidden-page' : ''}
        ></remote-work-map>

        ${this.currentPage === 'map' && !this.selectedPlace ? this.renderDiscoveryPanel() : ''}
        ${this.currentPage === 'list'
          ? html`<list-page @place-selected=${this.handlePlaceSelect}></list-page>`
          : ''}
        ${this.currentPage === 'contribute' ? html`<contribute-page></contribute-page>` : ''}
        ${this.currentPage === 'faq' ? html`<faq-page></faq-page>` : ''}
        ${this.currentPage === 'about' ? html`<about-page></about-page>` : ''}
        ${this.selectedPlace
          ? html`
              <place-detail-modal
                .place=${this.selectedPlace}
                @close=${this.handleDetailClose}
                @view-on-map=${this.handleViewOnMap}
              ></place-detail-modal>
            `
          : ''}
      </div>
    `;
  }

  firstUpdated() {
    this.mapComponent = this.renderRoot.querySelector('#map');
  }

  async connectedCallback() {
    super.connectedCallback();
    window.addEventListener('popstate', this.handlePopState);
    this.syncPageFromUrl();
    this.emitUiState();
    await this.syncSelectedPlaceFromUrl();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('popstate', this.handlePopState);
  }

  private handleMapReady = async (event: CustomEvent<BBox>) => {
    await this.fetchPlaces(event.detail);
    if (this.filters.showCandidates) {
      await this.fetchCandidates(event.detail);
    }
  };

  private handleMapMoved = debounce(async (event: CustomEvent<BBox>) => {
    await this.fetchPlaces(event.detail);
    if (this.filters.showCandidates) {
      await this.fetchCandidates(event.detail);
    }
  }, 400);

  async applyFilters(filters: typeof this.filters) {
    this.filters = filters;
    const bbox = this.mapComponent?.getCurrentBbox();
    if (!bbox) return;
    await this.fetchPlaces(bbox);

    if (this.filters.showCandidates) {
      await this.fetchCandidates(bbox);
    } else {
      this.candidates = [];
      this.candidateClusters = [];
    }
  }

  async fetchPlaces(bbox: BBox) {
    this.placesLoading = true;
    this.placesError = null;

    try {
      const params = new URLSearchParams();
      params.append('bbox', `${bbox.minLat},${bbox.minLon},${bbox.maxLat},${bbox.maxLon}`);

      if (this.filters.internetAccess) {
        params.append('internet_access', 'yes');
      }
      if (this.filters.sockets) {
        params.append('sockets', 'yes');
      }
      if (this.filters.openNow) {
        params.append('open_now', '1');
      }
      if (this.filters.showRemoved) {
        params.append('include_deleted', '1');
      }

      const res = await fetch(`/api/places?${params}`);
      if (!res.ok) {
        throw new Error(`Places request failed with ${res.status}`);
      }
      const data = await res.json();

      if (data.features[0]?.properties?.type === 'cluster') {
        this.clusters = data.features.map((f: any) => ({
          latitude: f.geometry.coordinates[1],
          longitude: f.geometry.coordinates[0],
          count: f.properties.count,
        }));
        this.places = [];
      } else {
        this.places = data.features.map((f: any) => ({
          ...f.properties,
          latitude: f.geometry.coordinates[1],
          longitude: f.geometry.coordinates[0],
        }));
        this.clusters = [];
      }
      this.placesLoaded = true;
    } catch (error) {
      console.error('Error fetching places:', error);
      this.placesError = 'Could not load places. Check your connection and try again.';
    } finally {
      this.placesLoading = false;
    }
  }

  async fetchCandidates(bbox: BBox) {
    try {
      const params = new URLSearchParams();
      params.append('bbox', `${bbox.minLat},${bbox.minLon},${bbox.maxLat},${bbox.maxLon}`);

      const res = await fetch(`/api/places/candidates?${params}`);
      const data = await res.json();

      if (data.features[0]?.properties?.type === 'cluster') {
        this.candidateClusters = data.features.map((f: any) => ({
          latitude: f.geometry.coordinates[1],
          longitude: f.geometry.coordinates[0],
          count: f.properties.count,
        }));
        this.candidates = [];
      } else {
        this.candidates = data.features.map((f: any) => ({
          ...f.properties,
          latitude: f.geometry.coordinates[1],
          longitude: f.geometry.coordinates[0],
        }));
        this.candidateClusters = [];
      }
    } catch (error) {
      console.error('Error fetching candidates:', error);
    }
  }

  // Looks up a place locally first (already-loaded places/candidates), and
  // only hits the network for deep links to a place outside the currently
  // loaded bbox/filters — e.g. someone opening a shared /p/:id URL fresh.
  private async loadPlaceById(id: string): Promise<Place | null> {
    const localPlace = this.places.find((p) => p.id === id);
    if (localPlace) return localPlace;

    const localCandidate = this.candidates.find((c) => c.id === id);
    if (localCandidate) return candidateToPlace(localCandidate);

    try {
      const res = await fetch(`/api/places/${encodeURIComponent(id)}`);
      if (!res.ok) return null;
      return await res.json();
    } catch (error) {
      console.error('Error fetching place by id:', error);
      return null;
    }
  }

  // Single source of truth for `selectedPlace`: re-derives it from the
  // current URL. Called on initial load and on every popstate (back/forward)
  // so the modal always reflects what's in the address bar.
  private async syncSelectedPlaceFromUrl() {
    const id = parsePlaceIdFromPath(location.pathname);
    if (!id) {
      this.selectedPlace = null;
      return;
    }

    const place = await this.loadPlaceById(id);
    if (!place) {
      history.replaceState(null, '', '/');
    }
    this.selectedPlace = place;
  }

  private syncPageFromUrl() {
    const page = parsePageFromPath(location.pathname);
    if (page) this.currentPage = page;
  }

  private handlePopState = () => {
    this.syncPageFromUrl();
    this.emitUiState();
    this.syncSelectedPlaceFromUrl();
  };

  navigateToPage(page: Page) {
    const pageChanged = page !== this.currentPage;
    if (!pageChanged && !this.selectedPlace) return;

    history.pushState({ viaApp: true }, '', pageUrl(page));
    this.currentPage = page;
    this.selectedPlace = null;
    this.emitUiState();
  }

  private handlePlaceSelect = (event: CustomEvent<Place>) => {
    const place = event.detail;
    history.pushState({ viaApp: true }, '', placeUrl(place.id));
    this.selectedPlace = place;
  };

  private retryPlaces = () => {
    const bbox = this.mapComponent?.getCurrentBbox();
    if (!bbox) return;
    this.fetchPlaces(bbox);
  };

  private renderDiscoveryPanel() {
    const spots = this.bestSpots();
    const activeCount = Object.values(this.filters).filter(Boolean).length;

    return html`
      <section class="discovery-panel" aria-label="Find your next work spot">
        <div class="discovery-eyebrow">Work from anywhere</div>
        <h1 class="discovery-title">Find your next work spot.</h1>
        <p class="discovery-copy">
          Jump straight to places with the essentials: internet, power, opening hours, and a clear
          laptop policy.
        </p>

        <label class="search-box">
          <span class="search-icon">⌕</span>
          <input
            type="search"
            placeholder="Search place, area, or category"
            .value=${this.searchQuery}
            @input=${(event: Event) => {
              this.searchQuery = (event.target as HTMLInputElement).value;
            }}
          />
        </label>

        <div class="quick-filters" aria-label="Quick filters">
          <button
            class="quick-chip ${this.filters.openNow ? 'active' : ''}"
            type="button"
            aria-pressed=${this.filters.openNow}
            @click=${() => this.toggleQuickFilter('openNow')}
          >
            Open now
          </button>
          <button
            class="quick-chip ${this.filters.internetAccess ? 'active' : ''}"
            type="button"
            aria-pressed=${this.filters.internetAccess}
            @click=${() => this.toggleQuickFilter('internetAccess')}
          >
            WiFi
          </button>
          <button
            class="quick-chip ${this.filters.sockets ? 'active' : ''}"
            type="button"
            aria-pressed=${this.filters.sockets}
            @click=${() => this.toggleQuickFilter('sockets')}
          >
            Power
          </button>
          <button
            class="quick-chip ${this.filters.showCandidates ? 'active' : ''}"
            type="button"
            aria-pressed=${this.filters.showCandidates}
            @click=${() => this.toggleQuickFilter('showCandidates')}
          >
            Suggestions
          </button>
        </div>

        <div class="panel-row">
          <h2>Best right now</h2>
          <span class="panel-count">${activeCount} filters · ${this.places.length} places</span>
        </div>

        ${this.renderBestSpotList(spots)}
      </section>
    `;
  }

  private renderBestSpotList(spots: Place[]) {
    if (this.placesLoading && !this.placesLoaded) {
      return html`<div class="panel-state">Loading the best work spots…</div>`;
    }

    if (this.placesError) {
      return html`<div class="panel-state">Places could not be loaded. Use Retry on the map.</div>`;
    }

    if (spots.length === 0) {
      return html`<div class="panel-state">
        No matching spots yet. Try a broader search or fewer filters.
      </div>`;
    }

    return html`
      <div class="spot-list">
        ${spots.map((place) => {
          const category = getCategoryInfo(place.category);
          const fit = getWorkFit(place);
          return html`
            <button
              class="spot-card"
              type="button"
              style="--spot-color:${category.color};"
              @click=${() => this.selectPlaceFromDiscovery(place)}
            >
              <span class="spot-emoji" aria-hidden="true">${category.emoji}</span>
              <span class="spot-main">
                <span class="mobile-card-label">Best nearby work spot</span>
                <span class="spot-name">${place.name}</span>
                <span class="spot-reason">${fit.reason}</span>
                <span class="spot-badges">
                  ${fit.badges
                    .slice(0, 3)
                    .map(
                      (badge) =>
                        html`<span class="spot-badge ${badge.tone}" title=${badge.title}
                          >${badge.label}</span
                        >`
                    )}
                </span>
              </span>
              <span class="spot-score">${fit.score}<span>Work fit</span></span>
              <span class="mobile-card-action">View details</span>
            </button>
          `;
        })}
      </div>
    `;
  }

  private bestSpots() {
    const query = this.searchQuery.trim().toLowerCase();
    return [...this.places]
      .filter((place) => {
        if (!query) return true;
        return [place.name, place.address, place.city, place.category]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(query));
      })
      .sort((a, b) => getWorkFit(b).score - getWorkFit(a).score || a.name.localeCompare(b.name))
      .slice(0, 3);
  }

  private toggleQuickFilter(key: keyof MapFilters) {
    this.applyFilters({ ...this.filters, [key]: !this.filters[key] });
  }

  private selectPlaceFromDiscovery(place: Place) {
    this.handlePlaceSelect(new CustomEvent('place-selected', { detail: place }));
  }

  private handleViewOnMap = () => {
    if (!this.selectedPlace) return;
    history.replaceState(null, '', placeUrl(this.selectedPlace.id));
    this.currentPage = 'map';
    this.emitUiState();
  };

  private handleDetailClose = () => {
    if ((history.state as { viaApp?: boolean } | null)?.viaApp) {
      // Pops back to whatever URL we pushed from — popstate then clears
      // selectedPlace via syncSelectedPlaceFromUrl.
      history.back();
    } else {
      // Reached this place via a deep link (no app history to go back to).
      history.replaceState(null, '', '/');
      this.selectedPlace = null;
    }
  };

  private emitUiState() {
    this.dispatchEvent(
      new CustomEvent('ui-state-change', {
        detail: { currentPage: this.currentPage },
      })
    );
  }

  private emitFilterState() {
    this.dispatchEvent(
      new CustomEvent('filters-state-change', {
        detail: this.filters,
      })
    );
  }
}

customElements.define('remote-work-app', RemoteWorkApp);
