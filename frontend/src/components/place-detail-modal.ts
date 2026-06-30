import { LitElement, html, css } from 'lit';
import { property, state } from 'lit/decorators.js';
import type { Place, TransitStop } from '../types.js';
import { fetchReviews, submitReview, relativeDate, type MangroveReview } from '../lib/mangrove.js';
import {
  fetchNearbyTransit,
  getTransitKindInfo,
  dedupeTransitStops,
  getNavLinks,
  TRANSIT_KIND_ORDER,
} from '../lib/transit.js';
import { googleMapsIcon, appleMapsIcon, osmIcon } from '../lib/icons.js';

const STAR_VALUES = [20, 40, 60, 80, 100];
const NEARBY_RADIUS_METERS = 500;
const NEARBY_VISIBLE_PER_KIND = 3;

export class PlaceDetailModal extends LitElement {
  @property() declare place: Place | null;

  @state() declare reviews: MangroveReview[];
  @state() declare reviewsLoading: boolean;
  @state() declare reviewsError: boolean;
  @state() declare selectedRating: number | null;
  @state() declare hoverRating: number | null;
  @state() declare opinion: string;
  @state() declare submitting: boolean;
  @state() declare submitStatus: 'success' | 'error' | null;
  @state() declare nearbyTransit: TransitStop[];
  @state() declare nearbyTransitLoading: boolean;
  @state() declare nearbyExpanded: boolean;

  private reviewsAbortController: AbortController | null = null;
  private nearbyTransitAbortController: AbortController | null = null;

  constructor() {
    super();
    this.place = null;
    this.reviews = [];
    this.reviewsLoading = true;
    this.reviewsError = false;
    this.selectedRating = null;
    this.hoverRating = null;
    this.opinion = '';
    this.submitting = false;
    this.submitStatus = null;
    this.nearbyTransit = [];
    this.nearbyTransitLoading = true;
    this.nearbyExpanded = false;
  }

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

    .amenity-nav {
      display: flex;
      gap: 4px;
    }

    .nav-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      background: #e8e8e8;
      border-radius: 4px;
    }

    .nav-icon:hover {
      background: #ddd;
    }

    .nearby-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .nearby-group .amenities {
      gap: 4px;
    }

    .nearby-group .amenity {
      padding: 6px 8px;
    }

    .nearby-group-title {
      font-size: 12px;
      font-weight: 600;
      color: #555;
    }

    .nearby-more-hint {
      color: #999;
      font-size: 11px;
      margin-left: 4px;
    }

    .nearby-toggle-btn {
      align-self: flex-start;
      background: none;
      border: none;
      color: #1976d2;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      padding: 4px 0;
    }

    .nearby-toggle-btn:hover {
      text-decoration: underline;
    }

    .links {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .removed-notice {
      background: #fdecea;
      color: #d32f2f;
      padding: 8px 10px;
      border-radius: 4px;
      font-size: 13px;
    }

    .restriction-notice {
      background: #fff3e0;
      color: #b26a00;
      padding: 8px 10px;
      border-radius: 4px;
      font-size: 13px;
    }

    .restriction-notice code {
      background: rgba(178, 106, 0, 0.12);
      padding: 1px 4px;
      border-radius: 3px;
    }

    .unverified-notice {
      background: #eef3fc;
      color: #1f4f8f;
      padding: 10px 12px;
      border-radius: 4px;
      font-size: 13px;
      line-height: 1.5;
    }

    .unverified-notice code {
      background: rgba(31, 79, 143, 0.12);
      padding: 1px 4px;
      border-radius: 3px;
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

    .review-aggregate {
      display: flex;
      align-items: center;
      gap: 12px;
      background: #f3f4f6;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 10px 14px;
    }

    .review-score {
      font-size: 26px;
      font-weight: 700;
      color: #1f2937;
      line-height: 1;
    }

    .review-stars {
      color: #f59e0b;
    }

    .review-stars .empty {
      color: #d1d5db;
    }

    .review-count {
      color: #666;
      font-size: 11px;
    }

    .review-card {
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 10px 12px;
      font-size: 13px;
    }

    .review-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 5px;
    }

    .review-date {
      font-size: 11px;
      color: #9ca3af;
    }

    .review-body {
      margin: 0;
      color: #1f2937;
      line-height: 1.5;
    }

    .review-form {
      border: 1px dashed #e5e7eb;
      border-radius: 10px;
      padding: 12px 14px;
      background: #f9fafb;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .star-picker {
      display: flex;
      gap: 4px;
    }

    .star-btn {
      background: none;
      border: none;
      padding: 0;
      font-size: 22px;
      line-height: 1;
      cursor: pointer;
      color: #d1d5db;
    }

    .star-btn.filled {
      color: #f59e0b;
    }

    .review-textarea {
      font-size: 13px;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      resize: none;
      font-family: inherit;
    }

    .review-submit-btn {
      background: #10b981;
      color: white;
      border: none;
      padding: 8px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
    }

    .review-submit-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .review-status-success {
      color: #10b981;
      font-size: 12px;
    }

    .review-status-error {
      color: #d32f2f;
      font-size: 12px;
    }

    .review-privacy-note {
      font-size: 11px;
      color: #999;
    }

    .review-privacy-note a {
      color: #666;
    }
  `;

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
          ${this.place.unverified
            ? html`
                <div class="unverified-notice">
                  💡 <strong>Unverified suggestion</strong> — this place isn't confirmed as
                  laptop-friendly yet. If you've been here, help us out by tagging
                  <code>laptop=yes</code>, <code>laptop=no</code>, or
                  <code>laptop:conditional=...</code> on OpenStreetMap so it shows up correctly for
                  everyone (usually within a day).
                </div>
              `
            : ''}
          ${this.place.deletedAt
            ? html`
                <div class="removed-notice">
                  ⚠️ No longer marked laptop-friendly on OpenStreetMap since
                  ${new Date(this.place.deletedAt).toLocaleDateString()}
                </div>
              `
            : ''}
          ${this.place.laptopConditional
            ? html`
                <div class="restriction-notice">
                  ⚠️ Laptop use restricted: <code>${this.place.laptopConditional}</code>
                </div>
              `
            : ''}
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
          ${this.renderNearbyTransit()} ${this.renderReviews()} ${this.renderLinks()}
        </div>
      </div>
    `;
  }

  willUpdate(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('place') && this.place) {
      this.loadReviews();
      this.loadNearbyTransit();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.reviewsAbortController?.abort();
    this.nearbyTransitAbortController?.abort();
  }

  private async loadReviews() {
    if (!this.place) return;

    this.reviewsAbortController?.abort();
    const controller = new AbortController();
    this.reviewsAbortController = controller;

    this.reviewsLoading = true;
    this.reviewsError = false;
    this.selectedRating = null;
    this.opinion = '';
    this.submitStatus = null;

    try {
      this.reviews = await fetchReviews(
        this.place.latitude,
        this.place.longitude,
        this.place.osmId,
        controller.signal
      );
    } catch (err) {
      if ((err as Error).name !== 'AbortError') this.reviewsError = true;
    } finally {
      if (!controller.signal.aborted) this.reviewsLoading = false;
    }
  }

  private async loadNearbyTransit() {
    if (!this.place) return;

    this.nearbyTransitAbortController?.abort();
    const controller = new AbortController();
    this.nearbyTransitAbortController = controller;

    this.nearbyTransitLoading = true;
    this.nearbyExpanded = false;

    try {
      this.nearbyTransit = await fetchNearbyTransit(
        this.place.latitude,
        this.place.longitude,
        NEARBY_RADIUS_METERS,
        controller.signal
      );
    } catch (err) {
      if ((err as Error).name !== 'AbortError') this.nearbyTransit = [];
    } finally {
      if (!controller.signal.aborted) this.nearbyTransitLoading = false;
    }
  }

  private async submit() {
    if (!this.place || !this.selectedRating) return;

    this.submitting = true;
    this.submitStatus = null;

    try {
      const ok = await submitReview(
        this.place.latitude,
        this.place.longitude,
        this.place.osmId,
        this.selectedRating,
        this.opinion.trim() || null
      );
      this.submitStatus = ok ? 'success' : 'error';
      if (ok) {
        this.selectedRating = null;
        this.opinion = '';
        setTimeout(() => this.loadReviews(), 1000);
      }
    } catch {
      this.submitStatus = 'error';
    } finally {
      this.submitting = false;
    }
  }

  private renderStars(rating100: number) {
    const n = Math.max(1, Math.min(5, Math.round(rating100 / 20)));
    return html`<span class="review-stars"
      >${'★'.repeat(n)}<span class="empty">${'☆'.repeat(5 - n)}</span></span
    >`;
  }

  private renderReviews() {
    const ratedReviews = this.reviews.filter((r) => typeof r.payload?.rating === 'number');
    const avgRating = ratedReviews.length
      ? ratedReviews.reduce((sum, r) => sum + (r.payload.rating ?? 0), 0) / ratedReviews.length
      : null;
    const displayRating = this.hoverRating ?? this.selectedRating;

    return html`
      <div class="modal-section">
        <div class="modal-section-title">Reviews</div>

        ${this.reviewsLoading
          ? html`<small style="color: #999;">Loading reviews…</small>`
          : this.reviewsError
            ? html`<small style="color: #999;">Couldn't load reviews.</small>`
            : html`
                ${avgRating !== null
                  ? html`
                      <div class="review-aggregate">
                        <span class="review-score">${(avgRating / 20).toFixed(1)}</span>
                        <div>
                          ${this.renderStars(avgRating)}
                          <div class="review-count">
                            ${ratedReviews.length} review${ratedReviews.length === 1 ? '' : 's'}
                          </div>
                        </div>
                      </div>
                    `
                  : html`<small style="color: #999;">No reviews yet — be the first!</small>`}
                ${this.reviews.map(
                  (r) => html`
                    <div class="review-card">
                      <div class="review-card-header">
                        ${typeof r.payload.rating === 'number'
                          ? this.renderStars(r.payload.rating)
                          : ''}
                        <span class="review-date">${relativeDate(r.payload.iat)}</span>
                      </div>
                      ${r.payload.opinion
                        ? html`<p class="review-body">"${r.payload.opinion}"</p>`
                        : ''}
                    </div>
                  `
                )}
              `}

        <div class="review-form">
          <div class="modal-section-title">Your opinion</div>
          <div class="star-picker">
            ${STAR_VALUES.map(
              (v) => html`
                <button
                  type="button"
                  class="star-btn ${displayRating && v <= displayRating ? 'filled' : ''}"
                  @click=${() => (this.selectedRating = v)}
                  @mouseenter=${() => (this.hoverRating = v)}
                  @mouseleave=${() => (this.hoverRating = null)}
                >
                  ★
                </button>
              `
            )}
          </div>

          <textarea
            class="review-textarea"
            rows="2"
            placeholder="What was it like to work from here?"
            .value=${this.opinion}
            ?disabled=${this.submitting}
            @input=${(e: Event) => (this.opinion = (e.target as HTMLTextAreaElement).value)}
          ></textarea>

          <button
            class="review-submit-btn"
            ?disabled=${!this.selectedRating || this.submitting}
            @click=${this.submit}
          >
            ${this.submitting ? 'Submitting…' : 'Submit review'}
          </button>

          ${this.submitStatus === 'success'
            ? html`<span class="review-status-success">Thanks for your review!</span>`
            : this.submitStatus === 'error'
              ? html`<span class="review-status-error">Couldn't submit, please try again.</span>`
              : ''}

          <div class="review-privacy-note">
            Reviews are powered by
            <a href="https://mangrove.reviews" target="_blank">Mangrove.reviews</a>, an open,
            decentralized review platform — no account needed.
          </div>
        </div>
      </div>
    `;
  }

  private renderNearbyTransit() {
    if (this.nearbyTransitLoading) {
      return html`
        <div class="modal-section">
          <div class="modal-section-title">Nearby</div>
          <small style="color: #999;">Loading nearby transit…</small>
        </div>
      `;
    }

    if (this.nearbyTransit.length === 0) return html``;

    const groups = TRANSIT_KIND_ORDER.map((kind) => ({
      kind,
      stops: dedupeTransitStops(this.nearbyTransit.filter((stop) => stop.kind === kind)),
    })).filter((group) => group.stops.length > 0);

    const hasMore = groups.some((group) => group.stops.length > NEARBY_VISIBLE_PER_KIND);

    return html`
      <div class="modal-section">
        <div class="modal-section-title">Nearby (within ${NEARBY_RADIUS_METERS}m)</div>
        ${groups.map((group) => this.renderNearbyGroup(group))}
        ${hasMore
          ? html`
              <button
                class="nearby-toggle-btn"
                @click=${() => (this.nearbyExpanded = !this.nearbyExpanded)}
              >
                ${this.nearbyExpanded ? 'Show fewer' : 'Show all'}
              </button>
            `
          : ''}
      </div>
    `;
  }

  private renderNearbyGroup(group: { kind: TransitStop['kind']; stops: TransitStop[] }) {
    const { icon, label, groupLabel } = getTransitKindInfo(group.kind);
    const visible = this.nearbyExpanded
      ? group.stops
      : group.stops.slice(0, NEARBY_VISIBLE_PER_KIND);
    const hiddenCount = group.stops.length - visible.length;

    return html`
      <div class="nearby-group">
        <div class="nearby-group-title">${icon} ${groupLabel}</div>
        <div class="amenities">
          ${visible.map((stop) => {
            const links = getNavLinks(stop.latitude, stop.longitude);
            return html`
              <div class="amenity">
                <span class="amenity-name">${stop.name || label}</span>
                <span class="amenity-value">${Math.round(stop.distanceMeters)}m</span>
                <span class="amenity-nav">
                  <a
                    class="nav-icon"
                    href=${links.googleMaps}
                    target="_blank"
                    rel="noopener"
                    title="Open in Google Maps"
                    >${googleMapsIcon}</a
                  >
                  <a
                    class="nav-icon"
                    href=${links.appleMaps}
                    target="_blank"
                    rel="noopener"
                    title="Open in Apple Maps"
                    >${appleMapsIcon}</a
                  >
                  <a
                    class="nav-icon"
                    href=${links.osm}
                    target="_blank"
                    rel="noopener"
                    title="Open in OpenStreetMap"
                    >${osmIcon}</a
                  >
                </span>
              </div>
            `;
          })}
        </div>
        ${hiddenCount > 0 ? html`<small class="nearby-more-hint">+${hiddenCount} more</small>` : ''}
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
        value:
          this.place.sockets === 'yes' ? 'Yes' : this.place.sockets === 'many' ? 'Many' : 'Some',
      });
    }

    if (this.place?.wifiSsid) {
      const feeNote =
        this.place.wifiFee === 'yes'
          ? ' (paid)'
          : this.place.wifiFee === 'customers'
            ? ' (customers)'
            : '';
      const passwordNote = this.place.wifiPassword === 'yes' ? ', password required' : '';
      amenities.push({
        icon: '📶',
        name: 'WiFi network',
        value: `${this.place.wifiSsid}${feeNote}${passwordNote}`,
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

    links.push({
      label: 'Open in Google Maps',
      href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${this.place.name},${this.place.latitude},${this.place.longitude}`
      )}`,
      target: '_blank',
    });

    if (this.place.osmId) {
      links.push({
        label: 'View on OpenStreetMap',
        href: `https://www.openstreetmap.org/${this.place.osmId}`,
        target: '_blank',
      });
    }

    if (this.place.osmId) {
      links.push({
        label: 'Edit in MapComplete',
        href: `https://mapcomplete.osm.be/`,
        target: '_blank',
      });
    }

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
