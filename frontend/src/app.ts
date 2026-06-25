import { LitElement, html, css } from 'lit';
import { property, state } from 'lit/decorators.js';
import { MapComponent } from './components/map.js';
import { FilterPopover } from './components/filter-popover.js';
import { LegendPopover } from './components/legend-popover.js';
import { MenuNav } from './components/menu-nav.js';
import { PlaceDetailModal } from './components/place-detail-modal.js';
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
    }

    .hidden-page {
      display: none;
    }
  `;

  @property() center = { lat: 45.4642, lon: 9.19 }; // Milan
  @state() places: Place[] = [];
  @state() selectedPlace: Place | null = null;
  @state() currentPage: 'map' | 'contribute' | 'about' = 'map';
  @state() filters = {
    internetAccess: false,
    sockets: false,
    openNow: false,
  };

  private mapComponent: MapComponent | null = null;

  render() {
    return html`
      <div class="app-container">
        <remote-work-map
          .places=${this.places}
          .selectedPlace=${this.selectedPlace}
          @place-selected=${this.handlePlaceSelect}
          id="map"
          class=${this.currentPage !== 'map' ? 'hidden-page' : ''}
        ></remote-work-map>

        <filter-popover @filters-change=${this.handleFilterChange}></filter-popover>

        <legend-popover></legend-popover>

        <menu-nav
          .currentPage=${this.currentPage}
          @page-change=${this.handlePageChange}
        ></menu-nav>

        ${this.currentPage === 'contribute'
          ? html`
              <div class="hidden-page">
                <h2>How to Contribute</h2>
                <p>
                  Help improve this map by contributing to
                  <a href="https://www.openstreetmap.org/" target="_blank">OpenStreetMap</a>.
                </p>
                <p>
                  You can also use
                  <a href="https://mapcomplete.osm.be/" target="_blank">MapComplete</a> to add or
                  edit places.
                </p>
              </div>
            `
          : ''}

        ${this.currentPage === 'about'
          ? html`
              <div class="hidden-page">
                <h2>About</h2>
                <p>
                  Milan Remote Work Map helps you find places in Milan where you can work
                  remotely.
                </p>
                <p>Data is sourced from OpenStreetMap, updated daily.</p>
              </div>
            `
          : ''}

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
    this.mapComponent = this.renderRoot.querySelector('#map') as MapComponent;
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

  private handlePlaceSelect(event: CustomEvent<Place>) {
    this.selectedPlace = event.detail;
  }

  private handleDetailClose() {
    this.selectedPlace = null;
  }

  private handleFilterChange(event: CustomEvent) {
    this.filters = event.detail;
    this.fetchPlaces();
  }

  private handlePageChange(event: CustomEvent<'map' | 'contribute' | 'about'>) {
    this.currentPage = event.detail;
  }
}

customElements.define('remote-work-app', RemoteWorkApp);
