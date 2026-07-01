import { LitElement, html, css } from 'lit';
import { state } from 'lit/decorators.js';
import { getLegendCategories } from '../categories.js';

export class LegendPopover extends LitElement {
  @state() declare open: boolean;

  constructor() {
    super();
    this.open = false;
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
      right: 142px;
      z-index: 700;
      font-family:
        -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    }

    .legend-btn {
      background: rgba(255, 255, 255, 0.95);
      border: 1px solid var(--color-border, #d7e0e8);
      border-radius: 999px;
      cursor: pointer;
      box-shadow: var(--shadow-card, 0 12px 32px rgba(15, 23, 42, 0.08));
      backdrop-filter: blur(16px);
      color: var(--color-text, #17212b);
      font-size: 13px;
      font-weight: 900;
      gap: 8px;
      min-width: 112px;
      height: 48px;
      padding: 0 15px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .legend-btn:hover {
      border-color: var(--color-primary, #006cff);
      transform: translateY(-1px);
    }

    .legend-icon {
      font-size: 16px;
    }

    .legend-popover {
      position: absolute;
      top: 52px;
      right: 0;
      background: rgba(255, 255, 255, 0.97);
      border: 1px solid var(--color-border, #d7e0e8);
      border-radius: 24px;
      box-shadow: var(--shadow-popover, 0 22px 70px rgba(15, 23, 42, 0.16));
      backdrop-filter: blur(16px);
      padding: 16px;
      min-width: 230px;
    }

    .legend-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--color-text-faint, #667483);
      margin-bottom: 10px;
    }

    .legend-items {
      display: flex;
      flex-direction: column;
      gap: 9px;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 9px;
      font-size: 13px;
      font-weight: 600;
    }

    .legend-emoji {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      flex-shrink: 0;
      font-size: 13px;
      border-radius: 50%;
      background: var(--color-bg-chip, #eef3f7);
    }

    .legend-label {
      color: var(--color-text, #17212b);
    }

    @media (max-width: 860px) {
      :host {
        top: 12px;
        right: 124px;
      }

      .legend-btn {
        min-width: 100px;
        height: 44px;
      }
    }
  `;

  render() {
    return html`
      <button class="legend-btn" @click=${this.toggleOpen} title="Toggle legend">
        <span class="legend-icon">🗺️</span>
        Legend
      </button>

      ${this.open
        ? html`
            <div class="legend-popover">
              <div class="legend-title">Legend</div>
              <div class="legend-items">
                ${getLegendCategories().map(
                  ({ info }) => html`
                    <div class="legend-item">
                      <span class="legend-emoji" style="background: ${info.color}33;"
                        >${info.emoji}</span
                      >
                      <span class="legend-label">${info.label}</span>
                    </div>
                  `
                )}
                <div class="legend-item">
                  <span class="legend-emoji">📍</span>
                  <span class="legend-label">Other</span>
                </div>
                <div class="legend-item">
                  <span class="legend-emoji" style="opacity: 0.45; filter: grayscale(1);">📍</span>
                  <span class="legend-label">Recently removed from OSM</span>
                </div>
              </div>
            </div>
          `
        : ''}
    `;
  }

  private toggleOpen() {
    this.open = !this.open;
  }
}

customElements.define('legend-popover', LegendPopover);
