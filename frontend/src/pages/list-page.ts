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
        background: var(--color-bg-soft, #f7fafc);
        border: 1px solid var(--color-border, #d7e0e8);
        border-radius: var(--radius-lg, 20px);
        padding: 18px;
        margin-bottom: 22px;
      }

      .field {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .field label {
        font-size: 11px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--color-text-faint, #667483);
      }

      select {
        min-height: 42px;
        padding: 8px 12px;
        border-radius: var(--radius-md, 14px);
        border: 1px solid var(--color-border, #d7e0e8);
        background: white;
        font-size: 14px;
        min-width: 180px;
      }

      select:focus {
        outline: none;
        border-color: var(--color-primary, #006cff);
      }

      .checkbox-group {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .checkbox-field {
        position: relative;
        display: block;
      }

      .checkbox-field input[type='checkbox'] {
        position: absolute;
        inset: 0;
        margin: 0;
        opacity: 0;
        cursor: pointer;
      }

      .checkbox-pill {
        display: inline-flex;
        align-items: center;
        min-height: 36px;
        border-radius: var(--radius-md, 14px);
        border: 1px solid var(--color-border, #d7e0e8);
        background: white;
        color: var(--color-text, #17212b);
        padding: 8px 14px;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        user-select: none;
      }

      .checkbox-field input[type='checkbox']:checked + .checkbox-pill {
        border-color: var(--color-primary, #006cff);
        background: var(--color-primary, #006cff);
        color: white;
        box-shadow: var(--shadow-button, 0 8px 18px rgba(0, 108, 255, 0.22));
      }

      .search-btn {
        background: var(--color-primary, #006cff);
        color: white;
        border: none;
        border-radius: var(--radius-md, 14px);
        padding: 10px 22px;
        font-size: 14px;
        font-weight: 800;
        cursor: pointer;
        box-shadow: var(--shadow-button, 0 8px 18px rgba(0, 108, 255, 0.22));
      }

      .search-btn:disabled {
        background: #bbb;
        cursor: not-allowed;
        box-shadow: none;
      }

      .status-message {
        color: var(--color-text-muted, #51606f);
        padding: 20px 0;
      }

      .error-message {
        color: var(--color-danger, #b42318);
        padding: 12px 0;
        font-weight: 600;
      }

      .results-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .result-item {
        position: relative;
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 14px 16px 14px 20px;
        border: 1px solid var(--color-border, #d7e0e8);
        border-radius: var(--radius-lg, 20px);
        cursor: pointer;
        background: white;
        text-align: left;
        width: 100%;
        font: inherit;
        box-shadow: var(--shadow-card, 0 12px 32px rgba(15, 23, 42, 0.08));
        transition:
          transform 0.15s ease,
          border-color 0.15s ease;
        overflow: hidden;
      }

      .result-item::before {
        content: '';
        position: absolute;
        top: 10px;
        bottom: 10px;
        left: 8px;
        width: 4px;
        border-radius: 999px;
        background: var(--accent-color, #4b5563);
      }

      .result-item:hover {
        border-color: var(--color-primary, #006cff);
        transform: translateY(-1px);
      }

      .result-emoji {
        flex-shrink: 0;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        border-radius: 50%;
        background: color-mix(in srgb, var(--accent-color, #4b5563) 16%, white);
      }

      .result-info {
        flex: 1;
        min-width: 0;
      }

      .result-name {
        font-weight: 800;
        font-size: 15px;
        color: var(--color-text, #17212b);
      }

      .result-address {
        font-size: 13px;
        color: var(--color-text-muted, #51606f);
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
              <span class="checkbox-pill">📡 Has internet access</span>
            </label>
            <label class="checkbox-field">
              <input
                type="checkbox"
                .checked=${this.filters.sockets}
                @change=${(e: Event) =>
                  this.updateFilter('sockets', (e.target as HTMLInputElement).checked)}
              />
              <span class="checkbox-pill">🔌 Has power sockets</span>
            </label>
            <label class="checkbox-field">
              <input
                type="checkbox"
                .checked=${this.filters.openNow}
                @change=${(e: Event) =>
                  this.updateFilter('openNow', (e.target as HTMLInputElement).checked)}
              />
              <span class="checkbox-pill">🕒 Open now</span>
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
          const { emoji, color } = getCategoryInfo(place.category);
          return html`
            <button
              class="result-item"
              style="--accent-color: ${color};"
              @click=${() => this.selectPlace(place)}
            >
              <span class="result-emoji">${emoji}</span>
              <span class="result-info">
                <div class="result-name">${place.name}</div>
                ${place.address ? html`<div class="result-address">${place.address}</div>` : ''}
              </span>
              <span class="result-badges">
                ${place.laptopStatus === 'no'
                  ? html`<span title="Not laptop-friendly">🚫</span>`
                  : ''}
                ${place.laptopStatus === 'restricted'
                  ? html`<span title="Laptop use restricted">⚠️</span>`
                  : ''}
                ${place.internetAccess === 'yes' ||
                place.internetAccess === 'wired' ||
                place.internetAccess === 'wlan'
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
