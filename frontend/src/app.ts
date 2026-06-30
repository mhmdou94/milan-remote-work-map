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
import type { Place, BBox } from './types.js';

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
    selectedPlace: { type: Object },
    currentPage: { type: String },
    filters: { type: Object },
  };

  declare center: { lat: number; lon: number };
  declare places: Place[];
  declare selectedPlace: Place | null;
  declare currentPage: 'map' | 'list' | 'contribute' | 'about';
  declare filters: {
    internetAccess: boolean;
    sockets: boolean;
    openNow: boolean;
    showRemoved: boolean;
  };

  private mapComponent: any = null;

  constructor() {
    super();
    this.center = { lat: 45.4642, lon: 9.19 };
    this.places = [];
    this.selectedPlace = null;
    this.currentPage = 'map';
    this.filters = {
      internetAccess: false,
      sockets: false,
      openNow: false,
      showRemoved: false,
    };
  }

  render() {
    console.log(
      '🎨 RemoteWorkApp rendering, page:',
      this.currentPage,
      'places:',
      this.places.length
    );
    return html`
      <div class="app-container">
        <remote-work-map
          .places=${this.places}
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
    await this.fetchPlaces();
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

  private handlePlaceSelect = (event: CustomEvent<Place>) => {
    console.log('📍 Place selected:', event.detail);
    this.selectedPlace = event.detail;
  };

  private handleDetailClose = () => {
    console.log('📍 Detail closed');
    this.selectedPlace = null;
  };
}

customElements.define('remote-work-app', RemoteWorkApp);
