import { LitElement, html, css } from 'lit';
import { property } from 'lit/decorators.js';
import type { Place } from '../types.js';

export class PlaceDetailModal extends LitElement {
  static styles = css`
    :host {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 600;
    }

    .modal-backdrop {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: white;
      border-radius: 12px 12px 0 0;
      box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
      padding: 20px;
      max-height: 80vh;
      overflow-y: auto;
      animation: slideUp 0.3s ease-out;
    }

    @keyframes slideUp {
      from {
        transform: translateY(100%);
      }
      to {
        transform: translateY(0);
      }
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
      border-bottom: 1px solid #eee;
      padding-bottom: 12px;
    }

    .modal-title {
      font-size: 20px;
      font-weight: 700;
    }

    .modal-category {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      margin-top: 4px;
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #999;
    }

    .close-btn:hover {
      color: #333;
    }

    .modal-content {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .modal-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .modal-section-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      color: #666;
      letter-spacing: 0.04em;
    }

    .address {
      font-size: 14px;
      color: #333;
    }

    .amenities {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .amenity {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      background: #f5f5f5;
      border-radius: 4px;
      font-size: 14px;
    }

    .amenity-icon {
      font-size: 16px;
    }

    .amenity-name {
      font-weight: 500;
      flex: 1;
    }

    .amenity-value {
      color: #666;
      font-size: 12px;
    }

    .links {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .link-btn {
      background: #1976d2;
      color: white;
      border: none;
      padding: 10px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      text-decoration: none;
      display: inline-block;
      text-align: center;
    }

    .link-btn:hover {
      background: #1565c0;
    }

    .link-btn.secondary {
      background: white;
      color: #1976d2;
      border: 1px solid #1976d2;
    }

    .link-btn.secondary:hover {
      background: #f5f5f5;
    }
  `;

  @property() place: Place | null = null;

  render() {
    if (!this.place) return html``;

    return html`
      <div class="modal-backdrop">
        <div class="modal-header">
          <div>
            <div class="modal-title">${this.place.name}</div>
            ${this.place.category
              ? html` <div class="modal-category">${this.place.category}</div> `
              : ''}
          </div>
          <button class="close-btn" @click=${this.close}>✕</button>
        </div>

        <div class="modal-content">
          ${this.place.address
            ? html`
                <div class="modal-section">
                  <div class="modal-section-title">Address</div>
                  <div class="address">${this.place.address}</div>
                </div>
              `
            : ''}

          ${this.renderAmenities()}

          ${this.place.openingHours
            ? html`
                <div class="modal-section">
                  <div class="modal-section-title">Hours</div>
                  <div style="font-size: 14px;">${this.place.openingHours}</div>
                </div>
              `
            : ''}

          ${this.renderLinks()}
        </div>
      </div>
    `;
  }

  private renderAmenities() {
    const amenities = [];

    if (this.place?.internetAccess) {
      amenities.push({
        icon: '📡',
        name: 'Internet',
        value: this.place.internetAccess === 'yes' ? 'Yes' : 'Wired',
      });
    }

    if (this.place?.sockets) {
      amenities.push({
        icon: '🔌',
        name: 'Power sockets',
        value: this.place.sockets === 'yes' ? 'Yes' : this.place.sockets === 'many' ? 'Many' : 'Some',
      });
    }

    if (amenities.length === 0) return html``;

    return html`
      <div class="modal-section">
        <div class="modal-section-title">Amenities</div>
        <div class="amenities">
          ${amenities.map(
            (a) => html`
              <div class="amenity">
                <span class="amenity-icon">${a.icon}</span>
                <span class="amenity-name">${a.name}</span>
                <span class="amenity-value">${a.value}</span>
              </div>
            `
          )}
        </div>
      </div>
    `;
  }

  private renderLinks() {
    if (!this.place) return html``;

    const links = [];

    if (this.place.osmId) {
      links.push({
        label: 'View on OpenStreetMap',
        href: `https://www.openstreetmap.org/${this.place.osmId}`,
        target: '_blank',
      });
    }

    if (this.place.osmId) {
      const osmId = this.place.osmId.split('/')[1];
      links.push({
        label: 'Edit in MapComplete',
        href: `https://mapcomplete.osm.be/`,
        target: '_blank',
      });
    }

    if (links.length === 0) return html``;

    return html`
      <div class="modal-section">
        <div class="links">
          ${links.map(
            (link) => html`
              <a class="link-btn secondary" href=${link.href} target=${link.target}>
                ${link.label}
              </a>
            `
          )}
        </div>
      </div>
    `;
  }

  private close() {
    this.dispatchEvent(new CustomEvent('close'));
  }
}

customElements.define('place-detail-modal', PlaceDetailModal);
