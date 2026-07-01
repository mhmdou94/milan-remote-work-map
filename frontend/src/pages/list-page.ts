import { LitElement, html, css } from 'lit';
import { state } from 'lit/decorators.js';
import { pageHostStyles } from './page-styles.js';
import { getCategoryInfo } from '../categories.js';
import type { Place } from '../types.js';

type WorkBadge = { label: string; title: string; tone: 'good' | 'warn' | 'muted' };

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
        max-width: 1180px;
      }

      .hero {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 24px;
        align-items: end;
        margin-bottom: 24px;
      }

      .eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        width: fit-content;
        padding: 7px 11px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.72);
        border: 1px solid var(--color-border-soft, #e3eaf1);
        color: var(--color-primary-dark, #005ad6);
        font-size: 12px;
        font-weight: 900;
        margin-bottom: 14px;
      }

      .hero h2 {
        max-width: 740px;
        margin: 0;
        color: var(--color-text, #17212b);
        font-size: clamp(34px, 6vw, 68px);
        line-height: 0.92;
        letter-spacing: -0.07em;
      }

      .hero p {
        max-width: 560px;
        margin: 18px 0 0;
        color: var(--color-text-muted, #51606f);
        font-size: 16px;
      }

      .hero-stat {
        min-width: 180px;
        padding: 18px;
        border-radius: 28px;
        background: var(--color-accent, #173f35);
        color: #fffaf1;
        box-shadow: 0 22px 45px rgba(23, 63, 53, 0.2);
      }

      .hero-stat strong {
        display: block;
        font-size: 42px;
        line-height: 1;
        letter-spacing: -0.04em;
      }

      .hero-stat span {
        display: block;
        margin-top: 6px;
        color: rgba(255, 250, 241, 0.76);
        font-size: 12px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }

      .content-grid {
        display: grid;
        grid-template-columns: minmax(290px, 360px) minmax(0, 1fr);
        gap: 22px;
        align-items: start;
      }

      .search-form {
        position: sticky;
        top: 100px;
        display: grid;
        gap: 18px;
        background: rgba(255, 255, 255, 0.86);
        border: 1px solid rgba(217, 221, 212, 0.9);
        border-radius: 30px;
        padding: 20px;
        box-shadow: var(--shadow-card, 0 12px 32px rgba(15, 23, 42, 0.08));
        backdrop-filter: blur(18px);
      }

      .form-title {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .form-title h3 {
        margin: 0;
        font-size: 18px;
        letter-spacing: -0.03em;
      }

      .form-title span {
        color: var(--color-text-faint, #667483);
        font-size: 12px;
        font-weight: 800;
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
        width: 100%;
        min-height: 48px;
        padding: 8px 14px;
        border-radius: 16px;
        border: 1px solid var(--color-border, #d7e0e8);
        background: white;
        color: var(--color-text, #17212b);
        font-size: 15px;
        font-weight: 700;
      }

      select:focus {
        outline: none;
        border-color: var(--color-primary, #006cff);
      }

      .checkbox-group {
        display: grid;
        grid-template-columns: 1fr;
        gap: 8px;
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
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        min-height: 44px;
        border-radius: 16px;
        border: 1px solid var(--color-border, #d7e0e8);
        background: white;
        color: var(--color-text, #17212b);
        padding: 10px 13px;
        font-size: 13px;
        font-weight: 850;
        cursor: pointer;
        user-select: none;
      }

      .checkbox-pill::after {
        content: '+';
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: var(--color-bg-chip, #eef3f7);
        color: var(--color-text-muted, #51606f);
        font-weight: 900;
      }

      .checkbox-field input[type='checkbox']:checked + .checkbox-pill {
        border-color: var(--color-primary, #006cff);
        background: var(--color-primary-soft, #fff0e9);
        color: var(--color-primary-dark, #005ad6);
        box-shadow: inset 0 0 0 1px var(--color-primary, #006cff);
      }

      .checkbox-field input[type='checkbox']:checked + .checkbox-pill::after {
        content: '✓';
        background: var(--color-primary, #006cff);
        color: white;
      }

      .search-btn {
        background: var(--color-primary, #006cff);
        color: white;
        border: none;
        border-radius: 18px;
        padding: 14px 22px;
        font-size: 15px;
        font-weight: 900;
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
        padding: 28px;
        border: 1px dashed var(--color-border, #d7e0e8);
        border-radius: 28px;
        background: rgba(255, 255, 255, 0.62);
        font-weight: 700;
      }

      .error-message {
        color: var(--color-danger, #b42318);
        padding: 12px 0;
        font-weight: 600;
      }

      .results-list {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(270px, 1fr));
        gap: 14px;
      }

      .results-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 14px;
      }

      .results-header h3 {
        margin: 0;
        font-size: 18px;
        letter-spacing: -0.03em;
      }

      .results-count {
        color: var(--color-text-faint, #667483);
        font-size: 12px;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }

      .result-item {
        position: relative;
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 13px;
        padding: 16px;
        border: 1px solid var(--color-border, #d7e0e8);
        border-radius: 28px;
        cursor: pointer;
        background: rgba(255, 255, 255, 0.9);
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
        inset: 0 0 auto 0;
        height: 5px;
        background: var(--accent-color, #4b5563);
      }

      .result-item:hover {
        border-color: var(--color-primary, #006cff);
        transform: translateY(-1px);
      }

      .result-emoji {
        flex-shrink: 0;
        width: 48px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 22px;
        border-radius: 18px;
        background: color-mix(in srgb, var(--accent-color, #4b5563) 16%, white);
      }

      .result-info {
        flex: 1;
        min-width: 0;
      }

      .result-name {
        font-weight: 800;
        font-size: 17px;
        line-height: 1.2;
        color: var(--color-text, #17212b);
      }

      .result-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 8px;
      }

      .meta-pill {
        display: inline-flex;
        align-items: center;
        min-height: 24px;
        padding: 4px 8px;
        border-radius: 999px;
        background: var(--color-bg-chip, #eef3f7);
        color: var(--color-text-muted, #51606f);
        font-size: 11px;
        font-weight: 800;
      }

      .result-address {
        font-size: 13px;
        color: var(--color-text-muted, #51606f);
        margin-top: 7px;
      }

      .result-badges {
        grid-column: 1 / -1;
        display: flex;
        gap: 7px;
        flex-wrap: wrap;
        padding-top: 3px;
      }

      .result-badges span {
        display: inline-flex;
        align-items: center;
        min-height: 28px;
        padding: 5px 9px;
        border-radius: 999px;
        background: var(--color-bg-chip, #eef3f7);
        color: var(--color-text-muted, #51606f);
        font-size: 12px;
        font-weight: 850;
      }

      .result-badges span.good {
        background: var(--color-good-bg, #effbf6);
        color: var(--color-good-text, #006b55);
      }

      .result-badges span.warn {
        background: #fff7e8;
        color: #9a5b00;
      }

      @media (max-width: 900px) {
        .hero,
        .content-grid {
          grid-template-columns: 1fr;
        }

        .search-form {
          position: static;
        }

        .hero-stat {
          display: none;
        }
      }

      @media (max-width: 560px) {
        .hero h2 {
          font-size: 42px;
        }

        .results-list {
          grid-template-columns: 1fr;
        }
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
        <section class="hero">
          <div>
            <div class="eyebrow">☕ Curated from OpenStreetMap</div>
            <h2>Find your next laptop-friendly spot.</h2>
            <p>
              Search Milan by city and filter for the basics that matter: WiFi, outlets, and opening
              hours.
            </p>
          </div>
          <div class="hero-stat">
            <strong>${this.results.length || 6}</strong>
            <span>Places tracked</span>
          </div>
        </section>

        <div class="content-grid">
          <form class="search-form" @submit=${this.handleSubmit}>
            <div class="form-title">
              <h3>Refine search</h3>
              <span>${this.activeFilterCount()} active</span>
            </div>

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
                <span class="checkbox-pill">📡 Internet access</span>
              </label>
              <label class="checkbox-field">
                <input
                  type="checkbox"
                  .checked=${this.filters.sockets}
                  @change=${(e: Event) =>
                    this.updateFilter('sockets', (e.target as HTMLInputElement).checked)}
                />
                <span class="checkbox-pill">🔌 Power sockets</span>
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

            <button class="search-btn" type="submit" ?disabled=${!this.selectedCity}>
              Show places
            </button>
          </form>

          <section>${this.renderResults()}</section>
        </div>
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
      return html`<p class="status-message">
        Pick a city to see places as work cards with quick-read amenities.
      </p>`;
    }
    if (this.results.length === 0) {
      return html`<p class="status-message">
        No places found. Try removing a filter or checking the map view.
      </p>`;
    }

    return html`
      <div class="results-header">
        <h3>${this.selectedCity}</h3>
        <span class="results-count">${this.results.length} results</span>
      </div>
      <div class="results-list">
        ${this.results.map((place) => {
          const { emoji, color } = getCategoryInfo(place.category);
          const badges = this.workBadges(place);
          return html`
            <button
              class="result-item"
              style="--accent-color: ${color};"
              @click=${() => this.selectPlace(place)}
            >
              <span class="result-emoji">${emoji}</span>
              <span class="result-info">
                <div class="result-name">${place.name}</div>
                <div class="result-meta">
                  ${place.category ? html`<span class="meta-pill">${place.category}</span>` : ''}
                  ${place.openingHours ? html`<span class="meta-pill">Hours listed</span>` : ''}
                </div>
                ${place.address ? html`<div class="result-address">${place.address}</div>` : ''}
              </span>
              <span class="result-badges">
                ${badges.map(
                  (badge) =>
                    html`<span class=${badge.tone} title=${badge.title}>${badge.label}</span>`
                )}
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

  private activeFilterCount() {
    return Object.values(this.filters).filter(Boolean).length;
  }

  private workBadges(place: Place): WorkBadge[] {
    const badges: WorkBadge[] = [];

    if (place.laptopStatus === 'no') {
      badges.push({ label: '🚫 No laptops', title: 'Not laptop-friendly', tone: 'warn' });
    }
    if (place.laptopStatus === 'restricted') {
      badges.push({ label: '⚠️ Restricted', title: 'Laptop use restricted', tone: 'warn' });
    }
    if (place.laptopStatus === 'yes') {
      badges.push({ label: 'Laptop friendly', title: 'Laptop friendly', tone: 'good' });
    }
    if (
      place.internetAccess === 'yes' ||
      place.internetAccess === 'wired' ||
      place.internetAccess === 'wlan'
    ) {
      badges.push({ label: '📶 Internet access', title: 'Internet access', tone: 'good' });
    }
    if (place.sockets === 'yes' || place.sockets === 'many') {
      badges.push({
        label: place.sockets === 'many' ? '🔌 Many sockets' : '🔌 Sockets',
        title: 'Power sockets',
        tone: 'good',
      });
    }

    return badges.length > 0
      ? badges
      : [{ label: 'Needs details', title: 'Needs details', tone: 'muted' }];
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
