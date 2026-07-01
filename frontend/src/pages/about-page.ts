import { LitElement, html, css } from 'lit';
import { state } from 'lit/decorators.js';
import { pageHostStyles } from './page-styles.js';
import type { HealthInfo, WorkerRun } from '../types.js';

export class AboutPage extends LitElement {
  static styles = [
    pageHostStyles,
    css`
      .build-info {
        margin-top: 32px;
        padding-top: 16px;
        border-top: 1px solid var(--color-border, #e5e9ef);
        font-size: 11px;
        color: var(--color-text-muted, #51606f);
        opacity: 0.7;
      }

      .build-info dl {
        display: grid;
        grid-template-columns: max-content 1fr;
        gap: 2px 12px;
        margin: 0 0 8px;
      }

      .build-info dt {
        font-weight: 600;
      }

      .build-info dd {
        margin: 0;
        font-family: monospace;
        word-break: break-all;
      }

      .mismatch {
        color: var(--color-warning, #b45309);
      }

      .sync-regions {
        margin-top: 6px;
        border-collapse: collapse;
        width: 100%;
        font-size: 10px;
        font-family: monospace;
      }

      .sync-regions th,
      .sync-regions td {
        text-align: right;
        padding: 1px 6px;
      }

      .sync-regions th:first-child,
      .sync-regions td:first-child {
        text-align: left;
        padding-left: 0;
      }

      .sync-regions th {
        font-weight: 600;
        border-bottom: 1px solid currentColor;
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

  private renderWorkerRun(run: WorkerRun) {
    const summary = [
      run.inserted != null ? `${run.inserted} new` : null,
      run.updated != null ? `${run.updated} updated` : null,
      run.restored != null && run.restored > 0 ? `${run.restored} restored` : null,
      run.deleted != null && run.deleted > 0 ? `${run.deleted} removed` : null,
    ]
      .filter(Boolean)
      .join(', ');

    return html`
      <dl>
        <dt>Last sync</dt>
        <dd>${run.completedAt ?? run.startedAt}${run.status === 'failed' ? ' ⚠ failed' : ''}</dd>
        ${summary
          ? html`<dt>Changes</dt>
              <dd>${summary}</dd>`
          : null}
      </dl>
      ${run.regions.length > 0
        ? html`
            <table class="sync-regions">
              <thead>
                <tr>
                  <th>Region</th>
                  <th>Places</th>
                  <th>Transit</th>
                  <th>Candidates</th>
                </tr>
              </thead>
              <tbody>
                ${run.regions.map(
                  (r) => html`
                    <tr>
                      <td>${r.regionName}</td>
                      <td>${r.placesFetched ?? '—'}</td>
                      <td>${r.transitStops ?? '—'}</td>
                      <td>${r.candidates ?? '—'}</td>
                    </tr>
                  `
                )}
              </tbody>
            </table>
          `
        : null}
    `;
  }

  private renderHealth() {
    const frontendDate = window.VITE_BUILD_DATE;
    const frontendSha = window.VITE_BUILD_SHA;
    const backendDate = this.health?.buildDate ?? '—';
    const backendSha = this.health?.buildSha ?? '—';
    const mismatch =
      frontendSha !== 'local' && backendSha !== 'local' && frontendSha !== backendSha;

    return html`
      <div class="build-info">
        <dl>
          <dt>Frontend</dt>
          <dd>${frontendDate} (${frontendSha !== 'local' ? frontendSha.slice(0, 7) : 'local'})</dd>
          <dt class=${mismatch ? 'mismatch' : ''}>Backend</dt>
          <dd class=${mismatch ? 'mismatch' : ''}>
            ${backendDate} (${backendSha !== 'local' ? backendSha.slice(0, 7) : 'local'})
            ${mismatch ? '⚠ mismatch' : ''}
          </dd>
        </dl>
        ${this.health?.lastWorkerRun ? this.renderWorkerRun(this.health.lastWorkerRun) : null}
      </div>
    `;
  }

  render() {
    return html`
      <div class="page-content">
        <h2>About</h2>
        <p>Milan Remote Work Map helps you find places in Milan where you can work remotely.</p>
        <p>Data is sourced from OpenStreetMap, updated daily.</p>
        ${this.renderHealth()}
      </div>
    `;
  }
}

customElements.define('about-page', AboutPage);
