import { LitElement, html, css } from 'lit';
import { state } from 'lit/decorators.js';

export class LegendPopover extends LitElement {
  static styles = css`
    :host {
      position: fixed;
      bottom: 20px;
      left: 16px;
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
      bottom: 54px;
      left: 0;
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

    .legend-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .legend-label {
      color: #333;
    }
  `;

  @state() open = false;

  render() {
    return html`
      <button
        class="legend-btn"
        @click=${this.toggleOpen}
        title="Toggle legend"
      >
        🗺️
      </button>

      ${this.open
        ? html`
            <div class="legend-popover">
              <div class="legend-title">Legend</div>
              <div class="legend-items">
                <div class="legend-item">
                  <div class="legend-dot" style="background: #3388ff;"></div>
                  <span class="legend-label">Cafe / Bar</span>
                </div>
                <div class="legend-item">
                  <div class="legend-dot" style="background: #8B4513;"></div>
                  <span class="legend-label">Restaurant</span>
                </div>
                <div class="legend-item">
                  <div class="legend-dot" style="background: #9C27B0;"></div>
                  <span class="legend-label">Library</span>
                </div>
                <div class="legend-item">
                  <div class="legend-dot" style="background: #4CAF50;"></div>
                  <span class="legend-label">Coworking</span>
                </div>
                <div class="legend-item">
                  <div class="legend-dot" style="background: #FF9800;"></div>
                  <span class="legend-label">Other</span>
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
