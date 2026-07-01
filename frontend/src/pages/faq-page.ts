import { LitElement, html, css } from 'lit';
import { state } from 'lit/decorators.js';
import { pageHostStyles } from './page-styles.js';
import type { HealthInfo } from '../types.js';

export class FaqPage extends LitElement {
  static styles = [
    pageHostStyles,
    css`
      .faq-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 24px;
      }

      .faq-item {
        border: 1px solid var(--color-border, #e5e9ef);
        border-radius: var(--radius-lg, 20px);
        overflow: hidden;
      }

      .faq-question {
        margin: 0;
        padding: 18px 20px;
        font-size: 16px;
        font-weight: 700;
        background: var(--color-bg-soft, #f7fafc);
        color: var(--color-text, #17212b);
        border-bottom: 1px solid var(--color-border, #e5e9ef);
        line-height: 1.4;
      }

      .faq-answer {
        padding: 16px 20px;
        line-height: 1.6;
        color: var(--color-text-muted, #51606f);
        font-size: 15px;
      }

      .faq-answer p {
        margin: 0 0 10px;
      }

      .faq-answer p:last-child {
        margin-bottom: 0;
      }

      .regions-list {
        display: inline-flex;
        flex-wrap: wrap;
        gap: 6px;
        margin: 6px 0;
        padding: 0;
        list-style: none;
      }

      .region-chip {
        background: var(--color-bg-chip, #eef3f7);
        color: var(--color-text, #17212b);
        padding: 2px 10px;
        border-radius: 999px;
        font-size: 13px;
        font-weight: 600;
        font-family: monospace;
      }

      .sync-time {
        font-weight: 600;
        color: var(--color-text, #17212b);
      }
    `,
  ];

  @state() declare private health: HealthInfo | null;

  constructor() {
    super();
    this.health = null;
  }

  override connectedCallback() {
    super.connectedCallback();
    fetch('/api/health')
      .then((r) => r.json())
      .then((data: HealthInfo) => {
        this.health = data;
      })
      .catch(() => {});
  }

  private renderRegions() {
    const regions = this.health?.lastWorkerRun?.regions;
    if (regions && regions.length > 0) {
      return html`
        <ul class="regions-list">
          ${regions.map((r) => html`<li class="region-chip">${r.regionName}</li>`)}
        </ul>
      `;
    }
    return html`<span class="sync-time">Italy (nord-ovest, nord-est, centro, sud, isole)</span>`;
  }

  private renderLastSync() {
    const run = this.health?.lastWorkerRun;
    const ts = run?.completedAt ?? run?.startedAt;
    if (ts) {
      return html` — last ran <span class="sync-time">${ts}</span>`;
    }
    return null;
  }

  render() {
    return html`
      <div class="page-content">
        <h2>FAQ</h2>
        <ul class="faq-list">
          <li class="faq-item">
            <p class="faq-question">
              I know a place tagged <code>laptop=yes</code> in [some country] but it's not showing
              on the map — why?
            </p>
            <div class="faq-answer">
              <p>
                We only import data from a fixed set of regions. Processing the full planet would
                require far more storage and compute, plus the nearby transit stops and candidates
                we pre-compute for each place add up quickly.
              </p>
              <p>Current regions: ${this.renderRegions()}</p>
              <p>
                We periodically check which areas of the world are picking up the
                <code>laptop=yes</code> tag and may expand coverage over time.
              </p>
            </div>
          </li>

          <li class="faq-item">
            <p class="faq-question">
              I just added a new place with <code>laptop=yes</code> on OpenStreetMap but it's not
              showing here yet — when will it appear?
            </p>
            <div class="faq-answer">
              <p>
                The importer runs once a day at around 9 AM UTC${this.renderLastSync()}. Your place
                will appear after the next successful run.
              </p>
              <p>
                If it still doesn't show up after a day, double-check that the place is within one
                of the covered regions above and that the <code>laptop=yes</code> tag is saved on
                the node or way in OpenStreetMap.
              </p>
            </div>
          </li>
        </ul>
      </div>
    `;
  }
}

customElements.define('faq-page', FaqPage);
