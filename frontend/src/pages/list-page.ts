import { LitElement, html, css } from 'lit';
import { state } from 'lit/decorators.js';
import { pageHostStyles } from './page-styles.js';
import { getCategoryInfo } from '../categories.js';
import type { Place } from '../types.js';

export class ListPage extends LitElement {
  @state() declare cities: string[];
  @state() declare selectedCity: string;
  @state() declare filters: {
    internetAccess: boolean;
    sockets: boolean;
    openNow: boolean;
  };
  @state() declare results: Place[];
  @state() declare loading: boolean;
  @state() declare error: string | null;
  @state() declare hasSearched: boolean;

  constructor() {
    super();
    this.cities = [];
    this.selectedCity = '';
    this.filters = {
      internetAccess: false,
      sockets: false,
      openNow: false,
    };
    this.results = [];
    this.loading = false;
    this.error = null;
    this.hasSearched = false;
  }

  static styles = [
    pageHostStyles,
    css`
      .page-content {
        max-width: 900px;
      }

      .search-form {
        display: flex;
        flex-wrap: wrap;
        gap: 16px;
        align-items: flex-end;
        background: #f9f9f9;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 20px;
      }

      .field {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .field label {
        font-size: 13px;
        font-weight: 600;
        color: #555;
      }

      select {
        padding: 8px 10px;
        border-radius: 4px;
        border: 1px solid #ccc;
        font-size: 14px;
        min-width: 180px;
      }

      .checkbox-group {
        display: flex;
        gap: 16px;
        flex-wrap: wrap;
      }

      .checkbox-field {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 14px;
        cursor: pointer;
      }

      .checkbox-field input[type='checkbox'] {
        cursor: pointer;
        width: 16px;
        height: 16px;
        accent-color: #1976d2;
      }

      .search-btn {
        background: #1976d2;
        color: white;
        border: none;
        border-radius: 4px;
        padding: 9px 20px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
      }

      .search-btn:disabled {
        background: #bbb;
        cursor: not-allowed;
      }

      .status-message {
        color: #666;
        padding: 20px 0;
      }

      .error-message {
        color: #d32f2f;
        padding: 12px 0;
      }

      .results-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .result-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        border: 1px solid #eee;
        border-radius: 8px;
        cursor: pointer;
        background: white;
        text-align: left;
        width: 100%;
        font: inherit;
      }

      .result-item:hover {
        background: #f5f5f5;
        border-color: #ddd;
      }

      .result-emoji {
        font-size: 24px;
        flex-shrink: 0;
      }

      .result-info {
        flex: 1;
        min-width: 0;
      }

      .result-name {
        font-weight: 600;
        font-size: 15px;
      }

      .result-address {
        font-size: 13px;
        color: #777;
        margin-top: 2px;
      }

      .result-badges {
        display: flex;
        gap: 6px;
        flex-shrink: 0;
      }

      .result-badges span {
        font-size: 16px;
      }
    `,
  ];

  async connectedCallback() {
    super.connectedCallback();
    try {
      const res = await fetch('/api/cities');
      const data = await res.json();
      this.cities = data.cities ?? [];
    } catch (error) {
      console.error('Error fetching cities:', error);
    }
  }

  render() {
    return html`
      <div class="page-content">
        <h2>Browse by City</h2>
        <form class="search-form" @submit=${this.handleSubmit}>
          <div class="field">
            <label for="city-select">City</label>
            <select
              id="city-select"
              .value=${this.selectedCity}
              @change=${(e: Event) => {
                this.selectedCity = (e.target as HTMLSelectElement).value;
              }}
            >
              <option value="">Select a city…</option>
              ${this.cities.map(
                (city) =>
                  html`<option value=${city} ?selected=${city === this.selectedCity}>
                    ${city}
                  </option>`
              )}
            </select>
          </div>

          <div class="checkbox-group">
            <label class="checkbox-field">
              <input
                type="checkbox"
                .checked=${this.filters.internetAccess}
                @change=${(e: Event) =>
                  this.updateFilter('internetAccess', (e.target as HTMLInputElement).checked)}
              />
              Has internet access
            </label>
            <label class="checkbox-field">
              <input
                type="checkbox"
                .checked=${this.filters.sockets}
                @change=${(e: Event) =>
                  this.updateFilter('sockets', (e.target as HTMLInputElement).checked)}
              />
              Has power sockets
            </label>
            <label class="checkbox-field">
              <input
                type="checkbox"
                .checked=${this.filters.openNow}
                @change=${(e: Event) =>
                  this.updateFilter('openNow', (e.target as HTMLInputElement).checked)}
              />
              Open now
            </label>
          </div>

          <button class="search-btn" type="submit" ?disabled=${!this.selectedCity}>Search</button>
        </form>

        ${this.renderResults()}
      </div>
    `;
  }

  private renderResults() {
    if (this.loading) {
      return html`<p class="status-message">Loading…</p>`;
    }
    if (this.error) {
      return html`<p class="error-message">${this.error}</p>`;
    }
    if (!this.hasSearched) {
      return html`<p class="status-message">Select a city and hit search to see places.</p>`;
    }
    if (this.results.length === 0) {
      return html`<p class="status-message">No places found for this search.</p>`;
    }

    return html`
      <div class="results-list">
        ${this.results.map((place) => {
          const { emoji } = getCategoryInfo(place.category);
          return html`
            <button class="result-item" @click=${() => this.selectPlace(place)}>
              <span class="result-emoji">${emoji}</span>
              <span class="result-info">
                <div class="result-name">${place.name}</div>
                ${place.address ? html`<div class="result-address">${place.address}</div>` : ''}
              </span>
              <span class="result-badges">
                ${place.internetAccess === 'yes'
                  ? html`<span title="Internet access">📶</span>`
                  : ''}
                ${place.sockets === 'yes' || place.sockets === 'many'
                  ? html`<span title="Power sockets">🔌</span>`
                  : ''}
              </span>
            </button>
          `;
        })}
      </div>
    `;
  }

  private updateFilter(key: keyof typeof this.filters, value: boolean) {
    this.filters = { ...this.filters, [key]: value };
  }

  private selectPlace(place: Place) {
    this.dispatchEvent(new CustomEvent('place-selected', { detail: place }));
  }

  private handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (!this.selectedCity) return;

    this.loading = true;
    this.error = null;
    this.hasSearched = true;

    try {
      const params = new URLSearchParams();
      params.append('city', this.selectedCity);
      if (this.filters.internetAccess) params.append('internet_access', 'yes');
      if (this.filters.sockets) params.append('sockets', 'yes');
      if (this.filters.openNow) params.append('open_now', '1');

      const res = await fetch(`/api/places?${params}`);
      const data = await res.json();

      this.results = data.features.map((f: any) => ({
        ...f.properties,
        latitude: f.geometry.coordinates[1],
        longitude: f.geometry.coordinates[0],
      }));
    } catch (error) {
      console.error('Error fetching places:', error);
      this.error = 'Failed to load places. Please try again.';
    } finally {
      this.loading = false;
    }
  };
}

customElements.define('list-page', ListPage);
