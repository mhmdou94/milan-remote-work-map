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
    *,
    *::before,
    *::after {
      box-sizing: border-box;
    }

    :host {
      position: fixed;
      top: 18px;
      right: 16px;
      z-index: 700;
      font-family:
        -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    }

    .filter-btn {
      position: relative;
      gap: 8px;
      min-width: 112px;
      height: 48px;
      padding: 0 15px;
      background: var(--color-accent, #173f35);
      color: #fffaf1;
      border: 1px solid var(--color-border, #d7e0e8);
      border-radius: 999px;
      cursor: pointer;
      box-shadow: 0 16px 34px rgba(23, 63, 53, 0.22);
      font-size: 13px;
      font-weight: 900;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .filter-btn:hover {
      transform: translateY(-1px);
    }

    .filter-icon {
      font-size: 16px;
    }

    .filter-badge {
      background: var(--color-primary, #006cff);
      color: white;
      border-radius: 50%;
      min-width: 21px;
      height: 21px;
      padding: 0 6px;
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      box-shadow: var(--shadow-button, 0 8px 18px rgba(0, 108, 255, 0.22));
    }

    .filter-popover {
      position: absolute;
      top: 52px;
      right: 0;
      background: rgba(255, 255, 255, 0.97);
      border: 1px solid var(--color-border, #d7e0e8);
      border-radius: 24px;
      box-shadow: var(--shadow-popover, 0 22px 70px rgba(15, 23, 42, 0.16));
      backdrop-filter: blur(16px);
      padding: 18px;
      width: min(360px, calc(100vw - 32px));
      z-index: 701;
    }

    .filter-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .filter-header span {
      font-size: 13px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--color-text-faint, #667483);
    }

    .clear-btn {
      background: none;
      border: none;
      color: var(--color-danger, #b42318);
      cursor: pointer;
      font-size: 12px;
      font-weight: 700;
      padding: 0;
    }

    .filter-group {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .filter-item.wide {
      width: 100%;
    }

    .filter-item {
      position: relative;
      display: block;
    }

    /* Kept visible-but-transparent (not clipped to 1px) and stacked above
       .filter-label via position:absolute, so it stays the actual click/tap
       target across the whole pill instead of being intercepted by the
       label's own box — matters both for real users and for tools like
       Playwright that click the input directly rather than its label. */
    .filter-item input[type='checkbox'] {
      position: absolute;
      inset: 0;
      margin: 0;
      opacity: 0;
      cursor: pointer;
    }

    .filter-label {
      display: inline-flex;
      align-items: center;
      min-height: 36px;
      border-radius: 999px;
      border: 1px solid var(--color-border, #d7e0e8);
      background: white;
      color: var(--color-text, #17212b);
      padding: 8px 14px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      user-select: none;
      transition:
        background-color 0.15s ease,
        border-color 0.15s ease,
        color 0.15s ease;
    }

    .filter-item:hover .filter-label {
      border-color: #a8bac8;
    }

    .filter-item input[type='checkbox']:checked + .filter-label {
      border-color: var(--color-primary, #006cff);
      background: var(--color-primary-soft, #fff0e9);
      color: var(--color-primary-dark, #d85630);
      box-shadow: inset 0 0 0 1px var(--color-primary, #006cff);
    }

    .filter-item.wide .filter-label {
      width: 100%;
      justify-content: center;
    }

    .filter-item.wide input[type='checkbox']:checked + .filter-label {
      background: var(--color-primary, #006cff);
      color: white;
      box-shadow: var(--shadow-button, 0 8px 18px rgba(0, 108, 255, 0.22));
    }

    .filter-item input[type='checkbox']:focus-visible + .filter-label {
      outline: 2px solid var(--color-primary, #006cff);
      outline-offset: 2px;
    }

    .filter-divider {
      border: none;
      border-top: 1px solid var(--color-border-soft, #e3eaf1);
      margin: 14px 0;
    }

    .filter-section-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      color: var(--color-text-faint, #667483);
      letter-spacing: 0.06em;
      margin-bottom: 8px;
    }

    @media (max-width: 860px) {
      :host {
        top: 12px;
        right: 12px;
      }

      .filter-btn {
        min-width: 104px;
        height: 44px;
      }
    }
  `;

  render() {
    const activeCount = Object.values(this.filters).filter(Boolean).length;

    return html`
      <button class="filter-btn" @click=${this.toggleOpen} title="Toggle filters">
        <span class="filter-icon">⚙</span>
        Filters ${activeCount > 0 ? html` <span class="filter-badge">${activeCount}</span> ` : ''}
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
                <label class="filter-item wide">
                  <input
                    type="checkbox"
                    .checked=${this.filters.internetAccess}
                    @change=${(e: Event) =>
                      this.updateFilter('internetAccess', (e.target as HTMLInputElement).checked)}
                  />
                  <span class="filter-label">📡 Has internet access</span>
                </label>

                <label class="filter-item">
                  <input
                    type="checkbox"
                    .checked=${this.filters.sockets}
                    @change=${(e: Event) =>
                      this.updateFilter('sockets', (e.target as HTMLInputElement).checked)}
                  />
                  <span class="filter-label">🔌 Has power sockets</span>
                </label>

                <label class="filter-item">
                  <input
                    type="checkbox"
                    .checked=${this.filters.openNow}
                    @change=${(e: Event) =>
                      this.updateFilter('openNow', (e.target as HTMLInputElement).checked)}
                  />
                  <span class="filter-label">🕒 Open now</span>
                </label>

                <label class="filter-item">
                  <input
                    type="checkbox"
                    .checked=${this.filters.showRemoved}
                    @change=${(e: Event) =>
                      this.updateFilter('showRemoved', (e.target as HTMLInputElement).checked)}
                  />
                  <span class="filter-label">🕘 Show recently removed</span>
                </label>
              </div>

              <hr class="filter-divider" />

              <div class="filter-section-title">Help find new places</div>
              <div class="filter-group">
                <label class="filter-item">
                  <input
                    type="checkbox"
                    .checked=${this.filters.showCandidates}
                    @change=${(e: Event) =>
                      this.updateFilter('showCandidates', (e.target as HTMLInputElement).checked)}
                  />
                  <span class="filter-label">💡 Show suggested places (unverified)</span>
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
