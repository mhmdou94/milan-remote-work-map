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
    :host {
      position: fixed;
      top: 60px;
      right: 68px;
      z-index: 400;
    }

    .legend-btn {
      background: white;
      border: none;
      border-radius: 4px;
      padding: 10px;
      cursor: pointer;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      font-size: 20px;
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .legend-btn:hover {
      background: #f5f5f5;
    }

    .legend-popover {
      position: absolute;
      top: 54px;
      right: 0;
      background: rgba(255, 255, 255, 0.95);
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      padding: 12px;
      min-width: 200px;
      z-index: 401;
    }

    .legend-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #666;
      margin-bottom: 8px;
    }

    .legend-items {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
    }

    .legend-emoji {
      width: 18px;
      text-align: center;
      flex-shrink: 0;
      font-size: 15px;
    }

    .legend-label {
      color: #333;
    }
  `;

  render() {
    return html`
      <button class="legend-btn" @click=${this.toggleOpen} title="Toggle legend">🗺️</button>

      ${this.open
        ? html`
            <div class="legend-popover">
              <div class="legend-title">Legend</div>
              <div class="legend-items">
                ${getLegendCategories().map(
                  ({ info }) => html`
                    <div class="legend-item">
                      <span class="legend-emoji">${info.emoji}</span>
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
