import { LitElement, html, css } from 'lit';
// Import components as side effects to register custom elements
import './components/map.js';
import './components/filter-popover.js';
import './components/legend-popover.js';
import './components/menu-nav.js';
import './components/place-detail-modal.js';
import './pages/list-page.js';
import './pages/contribute-page.js';
import './pages/about-page.js';
import type { Place, BBox, PlaceCandidate } from './types.js';
import {
  parsePlaceIdFromPath,
  placeUrl,
  parsePageFromPath,
  pageUrl,
  type Page,
} from './lib/router.js';
import { candidateToPlace } from './lib/place.js';

export class RemoteWorkApp extends LitElement {
  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100vh;
    }

    .app-container {
      width: 100%;
      height: 100%;
      position: relative;
      background: #fff;
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
  `;

  static properties = {
    center: { type: Object },
    places: { type: Array },
    candidates: { type: Array },
    selectedPlace: { type: Object },
    currentPage: { type: String },
    filters: { type: Object },
  };

  declare center: { lat: number; lon: number };
  declare places: Place[];
  declare candidates: PlaceCandidate[];
  declare selectedPlace: Place | null;
  declare currentPage: Page;
  declare filters: {
    internetAccess: boolean;
    sockets: boolean;
    openNow: boolean;
    showRemoved: boolean;
    showCandidates: boolean;
  };

  private mapComponent: any = null;

  constructor() {
    super();
    this.center = { lat: 45.4642, lon: 9.19 };
    this.places = [];
    this.candidates = [];
    this.selectedPlace = null;
    this.currentPage = 'map';
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
          .candidates=${this.candidates}
          .selectedPlace=${this.selectedPlace}
          @place-selected=${this.handlePlaceSelect}
          id="map"
          class=${this.currentPage !== 'map' ? 'hidden-page' : ''}
        ></remote-work-map>

        ${this.currentPage === 'list'
          ? html`<list-page @place-selected=${this.handlePlaceSelect}></list-page>`
          : ''}
        ${this.currentPage === 'contribute' ? html`<contribute-page></contribute-page>` : ''}
        ${this.currentPage === 'about' ? html`<about-page></about-page>` : ''}
        ${this.selectedPlace
          ? html`
              <place-detail-modal
                .place=${this.selectedPlace}
                @close=${this.handleDetailClose}
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
    await this.fetchPlaces();
    await this.syncSelectedPlaceFromUrl();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('popstate', this.handlePopState);
  }

  async applyFilters(filters: typeof this.filters) {
    this.filters = filters;
    await this.fetchPlaces();

    if (this.filters.showCandidates) {
      await this.fetchCandidates();
    } else {
      this.candidates = [];
    }
  }

  async fetchPlaces(bbox?: BBox) {
    try {
      const params = new URLSearchParams();

      if (bbox) {
        params.append('bbox', `${bbox.minLat},${bbox.minLon},${bbox.maxLat},${bbox.maxLon}`);
      } else {
        // Default Milan bbox
        params.append('bbox', '45.3,9.0,45.6,9.4');
      }

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
      const data = await res.json();

      this.places = data.features.map((f: any) => ({
        ...f.properties,
        latitude: f.geometry.coordinates[1],
        longitude: f.geometry.coordinates[0],
      }));
    } catch (error) {
      console.error('Error fetching places:', error);
    }
  }

  async fetchCandidates(bbox?: BBox) {
    try {
      const params = new URLSearchParams();
      if (bbox) {
        params.append('bbox', `${bbox.minLat},${bbox.minLon},${bbox.maxLat},${bbox.maxLon}`);
      } else {
        params.append('bbox', '45.3,9.0,45.6,9.4');
      }

      const res = await fetch(`/api/places/candidates?${params}`);
      const data = await res.json();

      this.candidates = data.features.map((f: any) => ({
        ...f.properties,
        latitude: f.geometry.coordinates[1],
        longitude: f.geometry.coordinates[0],
      }));
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
    this.syncSelectedPlaceFromUrl();
  };

  navigateToPage(page: Page) {
    const pageChanged = page !== this.currentPage;
    if (!pageChanged && !this.selectedPlace) return;

    history.pushState({ viaApp: true }, '', pageUrl(page));
    this.currentPage = page;
    this.selectedPlace = null;
  }

  private handlePlaceSelect = (event: CustomEvent<Place>) => {
    const place = event.detail;
    history.pushState({ viaApp: true }, '', placeUrl(place.id));
    this.selectedPlace = place;
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
}

customElements.define('remote-work-app', RemoteWorkApp);
