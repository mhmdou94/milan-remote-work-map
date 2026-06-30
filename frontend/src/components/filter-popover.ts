import { LitElement, html, css } from 'lit';
import { state } from 'lit/decorators.js';

export class FilterPopover extends LitElement {
  @state() declare open: boolean;
  @state() declare filters: {
    internetAccess: boolean;
    sockets: boolean;
    openNow: boolean;
    showRemoved: boolean;
    showCandidates: boolean;
  };

  constructor() {
    super();
    this.open = false;
    this.filters = {
      internetAccess: false,
      sockets: false,
      openNow: false,
      showRemoved: false,
      showCandidates: false,
    };
  }

  static styles = css`
    :host {
      position: fixed;
      top: 60px;
      right: 16px;
      z-index: 500;
    }

    .filter-btn {
      background: white;
      border: none;
      border-radius: 4px;
      padding: 10px;
      cursor: pointer;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      font-size: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
    }

    .filter-btn:hover {
      background: #f5f5f5;
    }

    .filter-badge {
      position: absolute;
      top: -8px;
      right: -8px;
      background: #ff5252;
      color: white;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
    }

    .filter-popover {
      position: absolute;
      top: 54px;
      right: 0;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      padding: 16px;
      min-width: 240px;
      z-index: 501;
    }

    .filter-header {
      font-weight: 600;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .clear-btn {
      background: none;
      border: none;
      color: #d32f2f;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      padding: 0;
    }

    .filter-group {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .filter-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      border-radius: 4px;
      cursor: pointer;
      user-select: none;
    }

    .filter-item:hover {
      background: #f5f5f5;
    }

    .filter-item input[type='checkbox'] {
      cursor: pointer;
      width: 18px;
      height: 18px;
      accent-color: #1976d2;
    }

    .filter-label {
      cursor: pointer;
      flex: 1;
      font-size: 14px;
    }

    .filter-divider {
      border: none;
      border-top: 1px solid #eee;
      margin: 12px 0;
    }

    .filter-section-title {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      color: #999;
      letter-spacing: 0.04em;
      margin-bottom: 8px;
    }
  `;

  render() {
    const activeCount = Object.values(this.filters).filter(Boolean).length;

    return html`
      <button class="filter-btn" @click=${this.toggleOpen} title="Toggle filters">
        🔽 ${activeCount > 0 ? html` <span class="filter-badge">${activeCount}</span> ` : ''}
      </button>

      ${this.open
        ? html`
            <div class="filter-popover">
              <div class="filter-header">
                <span>Filters</span>
                ${activeCount > 0
                  ? html` <button class="clear-btn" @click=${this.clearAll}>Clear all</button> `
                  : ''}
              </div>

              <div class="filter-group">
                <label class="filter-item">
                  <input
                    type="checkbox"
                    .checked=${this.filters.internetAccess}
                    @change=${(e: Event) =>
                      this.updateFilter('internetAccess', (e.target as HTMLInputElement).checked)}
                  />
                  <span class="filter-label">Has internet access</span>
                </label>

                <label class="filter-item">
                  <input
                    type="checkbox"
                    .checked=${this.filters.sockets}
                    @change=${(e: Event) =>
                      this.updateFilter('sockets', (e.target as HTMLInputElement).checked)}
                  />
                  <span class="filter-label">Has power sockets</span>
                </label>

                <label class="filter-item">
                  <input
                    type="checkbox"
                    .checked=${this.filters.openNow}
                    @change=${(e: Event) =>
                      this.updateFilter('openNow', (e.target as HTMLInputElement).checked)}
                  />
                  <span class="filter-label">Open now</span>
                </label>

                <label class="filter-item">
                  <input
                    type="checkbox"
                    .checked=${this.filters.showRemoved}
                    @change=${(e: Event) =>
                      this.updateFilter('showRemoved', (e.target as HTMLInputElement).checked)}
                  />
                  <span class="filter-label">Show recently removed</span>
                </label>
              </div>

              <hr class="filter-divider" />

              <div class="filter-group">
                <div class="filter-section-title">Help find new places</div>
                <label class="filter-item">
                  <input
                    type="checkbox"
                    .checked=${this.filters.showCandidates}
                    @change=${(e: Event) =>
                      this.updateFilter('showCandidates', (e.target as HTMLInputElement).checked)}
                  />
                  <span class="filter-label">Show suggested places (unverified)</span>
                </label>
              </div>
            </div>
          `
        : ''}
    `;
  }

  private toggleOpen() {
    this.open = !this.open;
  }

  private updateFilter(key: keyof typeof this.filters, value: boolean) {
    this.filters = { ...this.filters, [key]: value };
    this.emitFilters();
  }

  private clearAll() {
    this.filters = {
      internetAccess: false,
      sockets: false,
      openNow: false,
      showRemoved: false,
      showCandidates: false,
    };
    this.emitFilters();
  }

  private emitFilters() {
    this.dispatchEvent(
      new CustomEvent('filters-change', {
        detail: this.filters,
      })
    );
  }
}

customElements.define('filter-popover', FilterPopover);
