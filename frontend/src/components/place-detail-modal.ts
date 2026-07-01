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
import { getCategoryInfo } from '../categories.js';

const STAR_VALUES = [20, 40, 60, 80, 100];
const NEARBY_RADIUS_METERS = 500;
const NEARBY_VISIBLE_PER_KIND = 3;

type Tone = 'good' | 'neutral' | 'unknown';

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
    *,
    *::before,
    *::after {
      box-sizing: border-box;
    }

    :host {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 750;
      font-family:
        -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    }

    @media (min-width: 861px) {
      :host {
        top: auto;
        bottom: 16px;
        left: auto;
        right: 16px;
        width: min(390px, calc(100% - 32px));
      }
    }

    .modal-backdrop {
      background: rgba(255, 255, 255, 0.97);
      backdrop-filter: blur(10px);
      border: 1px solid var(--color-border, #d7e0e8);
      border-radius: var(--radius-xl, 26px) var(--radius-xl, 26px) 0 0;
      box-shadow: var(--shadow-popover, 0 22px 70px rgba(15, 23, 42, 0.16));
      padding: 20px;
      max-height: 85vh;
      overflow-y: auto;
      animation: slideUp 0.25s ease-out;
    }

    @media (min-width: 861px) {
      .modal-backdrop {
        border-radius: var(--radius-xl, 26px);
        max-height: calc(100vh - 32px);
      }
    }

    @keyframes slideUp {
      from {
        transform: translateY(40px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 16px;
    }

    .modal-title {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.02em;
      line-height: 1.1;
      color: var(--color-text, #17212b);
    }

    .modal-category {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-top: 8px;
      border-radius: 999px;
      padding: 4px 10px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      background: var(--category-bg, #eef3f7);
      color: var(--category-color, #344252);
    }

    .modal-category-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--category-color, #344252);
    }

    .close-btn {
      flex: none;
      background: white;
      border: 1px solid var(--color-border, #d7e0e8);
      border-radius: var(--radius-md, 14px);
      font-size: 13px;
      font-weight: 800;
      cursor: pointer;
      padding: 8px 14px;
      color: var(--color-text, #17212b);
    }

    .close-btn:hover {
      border-color: var(--color-primary, #006cff);
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
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      color: var(--color-text-faint, #667483);
      letter-spacing: 0.08em;
    }

    .address {
      font-size: 14px;
      color: var(--color-text-muted, #51606f);
    }

    .amenities {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .amenity {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      background: var(--tone-bg, #f7fafc);
      border: 1px solid var(--tone-border, #e3e8ef);
      border-radius: var(--radius-md, 14px);
      font-size: 14px;
    }

    .amenity-icon {
      font-size: 16px;
      flex: none;
    }

    .amenity-name {
      font-weight: 700;
      flex: 1;
      color: var(--color-text, #17212b);
    }

    .amenity-value {
      color: var(--tone-text, #51606f);
      font-size: 12px;
      font-weight: 700;
    }

    .amenity-nav {
      display: flex;
      gap: 4px;
    }

    .nav-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      background: var(--color-bg-chip, #eef3f7);
      border-radius: var(--radius-sm, 8px);
    }

    .nav-icon:hover {
      background: var(--color-border, #d7e0e8);
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
      padding: 7px 10px;
      --tone-bg: var(--color-bg-soft, #f7fafc);
      --tone-border: var(--color-border-soft, #e3eaf1);
    }

    .nearby-group-title {
      font-size: 12px;
      font-weight: 700;
      color: var(--color-text-muted, #51606f);
    }

    .nearby-more-hint {
      color: var(--color-text-faint, #667483);
      font-size: 11px;
      margin-left: 4px;
    }

    .nearby-toggle-btn {
      align-self: flex-start;
      background: none;
      border: none;
      color: var(--color-primary, #006cff);
      font-size: 12px;
      font-weight: 800;
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
      color: var(--color-danger, #b42318);
      padding: 10px 12px;
      border-radius: var(--radius-md, 14px);
      font-size: 13px;
      font-weight: 600;
    }

    .not-allowed-notice {
      background: #fdecea;
      color: var(--color-danger, #b42318);
      padding: 10px 12px;
      border-radius: var(--radius-md, 14px);
      font-size: 13px;
      font-weight: 600;
    }

    .restriction-notice {
      background: #fff3e0;
      color: #b26a00;
      padding: 10px 12px;
      border-radius: var(--radius-md, 14px);
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
      padding: 12px 14px;
      border-radius: var(--radius-md, 14px);
      font-size: 13px;
      line-height: 1.5;
    }

    .unverified-notice code {
      background: rgba(31, 79, 143, 0.12);
      padding: 1px 4px;
      border-radius: 3px;
    }

    .link-btn {
      background: white;
      color: var(--color-primary, #006cff);
      border: 1px solid var(--color-primary, #006cff);
      padding: 11px;
      border-radius: var(--radius-md, 14px);
      cursor: pointer;
      font-size: 13px;
      font-weight: 800;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      text-align: center;
    }

    .link-btn:hover {
      background: #f2f7ff;
    }

    .link-btn.primary {
      background: var(--color-primary, #006cff);
      color: white;
      border-color: var(--color-primary, #006cff);
      box-shadow: var(--shadow-button, 0 8px 18px rgba(0, 108, 255, 0.22));
    }

    .link-btn.primary:hover {
      background: var(--color-primary-dark, #005ad6);
    }

    .review-aggregate {
      display: flex;
      align-items: center;
      gap: 12px;
      background: var(--color-bg-soft, #f7fafc);
      border: 1px solid var(--color-border-soft, #e3eaf1);
      border-radius: var(--radius-md, 14px);
      padding: 12px 14px;
    }

    .review-score {
      font-size: 26px;
      font-weight: 800;
      color: var(--color-text, #17212b);
      line-height: 1;
    }

    .review-stars {
      color: #f59e0b;
    }

    .review-stars .empty {
      color: #d1d5db;
    }

    .review-count {
      color: var(--color-text-muted, #51606f);
      font-size: 11px;
      font-weight: 600;
    }

    .review-card {
      border: 1px solid var(--color-border-soft, #e3eaf1);
      border-radius: var(--radius-md, 14px);
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
      color: var(--color-text-faint, #667483);
    }

    .review-body {
      margin: 0;
      color: var(--color-text, #17212b);
      line-height: 1.5;
    }

    .review-form {
      border: 1px dashed var(--color-border, #d7e0e8);
      border-radius: var(--radius-md, 14px);
      padding: 14px;
      background: var(--color-bg-soft, #f7fafc);
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

    .star-btn:focus-visible,
    .close-btn:focus-visible,
    .link-btn:focus-visible,
    .view-map-btn:focus-visible {
      outline: 2px solid var(--color-primary, #006cff);
      outline-offset: 2px;
    }

    .review-textarea {
      font-size: 13px;
      padding: 9px;
      border: 1px solid var(--color-border, #d7e0e8);
      border-radius: var(--radius-sm, 8px);
      resize: none;
      font-family: inherit;
    }

    .review-submit-btn {
      background: var(--color-primary, #006cff);
      color: white;
      border: none;
      padding: 9px;
      border-radius: var(--radius-sm, 8px);
      cursor: pointer;
      font-size: 13px;
      font-weight: 800;
      box-shadow: var(--shadow-button, 0 8px 18px rgba(0, 108, 255, 0.22));
    }

    .review-submit-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      box-shadow: none;
    }

    .review-status-success {
      color: var(--color-good-text, #006b55);
      font-size: 12px;
      font-weight: 600;
    }

    .review-status-error {
      color: var(--color-danger, #b42318);
      font-size: 12px;
      font-weight: 600;
    }

    .review-privacy-note {
      font-size: 11px;
      color: var(--color-text-faint, #667483);
    }

    .review-privacy-note a {
      color: var(--color-text-muted, #51606f);
    }

    .action-row {
      position: sticky;
      bottom: -20px;
      margin: 4px -20px -20px;
      padding: 12px 20px;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(6px);
      border-top: 1px solid var(--color-border-soft, #e3eaf1);
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }

    .action-row .link-btn:only-child {
      grid-column: 1 / -1;
    }

    .view-map-btn {
      background: var(--color-primary, #006cff);
      color: white;
      border: 1px solid var(--color-primary, #006cff);
      padding: 11px;
      border-radius: var(--radius-md, 14px);
      cursor: pointer;
      font-size: 13px;
      font-weight: 800;
      font-family: inherit;
      box-shadow: var(--shadow-button, 0 8px 18px rgba(0, 108, 255, 0.22));
    }

    .view-map-btn:hover {
      background: var(--color-primary-dark, #005ad6);
    }
  `;

  render() {
    if (!this.place) return html``;

    const categoryInfo = getCategoryInfo(this.place.category);

    return html`
      <div
        class="modal-backdrop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="place-detail-title"
        tabindex="-1"
        @keydown=${this.handleKeydown}
        style="--category-color:${categoryInfo.color}; --category-bg:${categoryInfo.color}1a;"
      >
        <div class="modal-header">
          <div>
            <div id="place-detail-title" class="modal-title">${this.place.name}</div>
            ${this.place.category
              ? html`
                  <div class="modal-category">
                    <span class="modal-category-dot"></span>
                    ${categoryInfo.label}
                  </div>
                `
              : ''}
          </div>
          <button class="close-btn" @click=${this.close} aria-label="Close place detail">
            Close
          </button>
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
          ${this.place.laptopStatus === 'no'
            ? html` <div class="not-allowed-notice">🚫 Laptop use is not allowed here</div> `
            : ''}
          ${this.place.laptopStatus === 'restricted'
            ? html`
                <div class="restriction-notice">
                  ⚠️ Laptop use
                  restricted${this.place.laptopConditional
                    ? html`: <code>${this.place.laptopConditional}</code>`
                    : ''}
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
          ${this.renderNearbyTransit()} ${this.renderReviews()}
        </div>

        ${this.renderActionRow()}
      </div>
    `;
  }

  willUpdate(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('place') && this.place) {
      this.loadReviews();
      this.loadNearbyTransit();
    }
  }

  firstUpdated() {
    this.updateComplete.then(() => {
      this.renderRoot.querySelector<HTMLButtonElement>('.close-btn')?.focus();
    });
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
          ? html`<small style="color: var(--color-text-faint, #667483);">Loading reviews…</small>`
          : this.reviewsError
            ? html`<small style="color: var(--color-text-faint, #667483);"
                >Couldn't load reviews.</small
              >`
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
                  : html`<small style="color: var(--color-text-faint, #667483);"
                      >No reviews yet — be the first!</small
                    >`}
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
                  aria-label=${`Rate ${v / 20} star${v === 20 ? '' : 's'}`}
                  aria-pressed=${this.selectedRating === v}
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
          <small style="color: var(--color-text-faint, #667483);">Loading nearby transit…</small>
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
    const amenities: { icon: string; name: string; value: string; tone: Tone }[] = [];

    if (this.place?.internetAccess) {
      amenities.push({
        icon: '📡',
        name: 'Internet',
        value:
          this.place.internetAccess === 'yes'
            ? 'Yes'
            : this.place.internetAccess === 'wlan'
              ? 'WiFi'
              : 'Wired',
        tone: 'good',
      });
    }

    if (this.place?.sockets) {
      amenities.push({
        icon: '🔌',
        name: 'Power sockets',
        value:
          this.place.sockets === 'yes' ? 'Yes' : this.place.sockets === 'many' ? 'Many' : 'Some',
        tone: this.place.sockets === 'many' || this.place.sockets === 'yes' ? 'good' : 'neutral',
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
        tone: 'neutral',
      });
    }

    if (this.place?.wheelchair) {
      amenities.push({
        icon: '♿',
        name: 'Wheelchair access',
        value:
          this.place.wheelchair === 'yes'
            ? 'Yes'
            : this.place.wheelchair === 'limited'
              ? 'Limited'
              : 'No',
        tone:
          this.place.wheelchair === 'yes'
            ? 'good'
            : this.place.wheelchair === 'limited'
              ? 'neutral'
              : 'unknown',
      });
    }

    if (this.place?.airConditioning) {
      amenities.push({
        icon: '❄️',
        name: 'Air conditioning',
        value: this.place.airConditioning === 'yes' ? 'Yes' : 'No',
        tone: this.place.airConditioning === 'yes' ? 'good' : 'unknown',
      });
    }

    if (this.place?.indoorSeating) {
      amenities.push({
        icon: '🏠',
        name: 'Indoor seating',
        value: this.place.indoorSeating === 'yes' ? 'Yes' : 'No',
        tone: this.place.indoorSeating === 'yes' ? 'good' : 'unknown',
      });
    }

    if (this.place?.outdoorSeating) {
      amenities.push({
        icon: '☂️',
        name: 'Outdoor seating',
        value: this.place.outdoorSeating === 'yes' ? 'Yes' : 'No',
        tone: this.place.outdoorSeating === 'yes' ? 'good' : 'unknown',
      });
    }

    if (this.place?.smoking) {
      const smokingLabels: Record<string, string> = {
        yes: 'Yes',
        no: 'No',
        outside: 'Outside only',
        separated: 'Separated area',
      };
      amenities.push({
        icon: '🚬',
        name: 'Smoking',
        value: smokingLabels[this.place.smoking],
        tone: this.place.smoking === 'no' ? 'good' : 'neutral',
      });
    }

    if (this.place?.drinkingWater) {
      amenities.push({
        icon: '🚰',
        name: 'Drinking water',
        value: this.place.drinkingWater === 'yes' ? 'Yes' : 'No',
        tone: this.place.drinkingWater === 'yes' ? 'good' : 'unknown',
      });
    }

    if (this.place?.toilets) {
      const wheelchairNote =
        this.place.toiletsWheelchair === 'yes' ? ' (wheelchair accessible)' : '';
      amenities.push({
        icon: '🚻',
        name: 'Toilets',
        value: `${this.place.toilets === 'yes' ? 'Yes' : 'No'}${wheelchairNote}`,
        tone: this.place.toilets === 'yes' ? 'good' : 'unknown',
      });
    }

    if (this.place?.dog) {
      amenities.push({
        icon: '🐕',
        name: 'Dogs allowed',
        value: this.place.dog === 'yes' ? 'Yes' : this.place.dog === 'leashed' ? 'On leash' : 'No',
        tone: this.place.dog === 'no' ? 'unknown' : 'neutral',
      });
    }

    if (this.place?.fee) {
      amenities.push({
        icon: '💶',
        name: 'Fee',
        value: this.place.charge || (this.place.fee === 'yes' ? 'Yes' : 'No'),
        tone: this.place.fee === 'yes' ? 'neutral' : 'good',
      });
    }

    if (this.place?.reservation) {
      amenities.push({
        icon: '📅',
        name: 'Reservation',
        value:
          this.place.reservation === 'yes'
            ? 'Required'
            : this.place.reservation === 'recommended'
              ? 'Recommended'
              : 'Not needed',
        tone: 'neutral',
      });
    }

    if (this.place?.capacity) {
      amenities.push({ icon: '👥', name: 'Capacity', value: this.place.capacity, tone: 'neutral' });
    }

    if (this.place?.level) {
      amenities.push({ icon: '🏢', name: 'Floor', value: this.place.level, tone: 'neutral' });
    }

    if (this.place?.brand) {
      amenities.push({ icon: '🏷️', name: 'Brand', value: this.place.brand, tone: 'neutral' });
    }

    if (amenities.length === 0) return html``;

    return html`
      <div class="modal-section">
        <div class="modal-section-title">Amenities</div>
        <div class="amenities">${amenities.map((a) => this.renderAmenity(a))}</div>
      </div>
    `;
  }

  private renderAmenity(a: { icon: string; name: string; value: string; tone: Tone }) {
    const toneVars: Record<Tone, string> = {
      good: '--tone-bg: var(--color-good-bg, #effbf6); --tone-border: var(--color-good-border, #c7eadc); --tone-text: var(--color-good-text, #006b55);',
      neutral:
        '--tone-bg: var(--color-bg-soft, #f7fafc); --tone-border: #dce5ee; --tone-text: #344252;',
      unknown:
        '--tone-bg: var(--color-bg-soft, #f7fafc); --tone-border: #e3e8ef; --tone-text: var(--color-text-faint, #667483);',
    };

    return html`
      <div class="amenity" style=${toneVars[a.tone]}>
        <span class="amenity-icon">${a.icon}</span>
        <span class="amenity-name">${a.name}</span>
        <span class="amenity-value">${a.value}</span>
      </div>
    `;
  }

  private renderActionRow() {
    if (!this.place) return html``;

    const links: { label: string; href: string }[] = [];

    links.push({
      label: 'Open in Google Maps',
      href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${this.place.name},${this.place.latitude},${this.place.longitude}`
      )}`,
    });

    if (this.place.website) {
      const href = /^https?:\/\//.test(this.place.website)
        ? this.place.website
        : `https://${this.place.website}`;
      links.push({ label: 'Visit website', href });
    }

    if (this.place.phone) {
      links.push({ label: 'Call', href: `tel:${this.place.phone.replace(/\s+/g, '')}` });
    }

    if (this.place.osmId) {
      links.push({
        label: 'View on OSM',
        href: `https://www.openstreetmap.org/${this.place.osmId}`,
      });
      links.push({
        label: 'Edit in MapComplete',
        href: `https://mapcomplete.osm.be/`,
      });
    }

    return html`
      <div class="action-row">
        <button class="view-map-btn" type="button" @click=${this.viewOnMap}>View on map</button>
        ${links.map(
          (link) => html`
            <a class="link-btn" href=${link.href} target="_blank" rel="noopener"> ${link.label} </a>
          `
        )}
      </div>
    `;
  }

  private close() {
    this.dispatchEvent(new CustomEvent('close'));
  }

  private viewOnMap() {
    this.dispatchEvent(new CustomEvent('view-on-map'));
  }

  private handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      this.close();
    }
  };
}

customElements.define('place-detail-modal', PlaceDetailModal);
