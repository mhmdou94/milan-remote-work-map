import { LitElement, html, css } from 'lit';
import { property } from 'lit/decorators.js';

const PAGES: { id: 'map' | 'list' | 'contribute' | 'about'; label: string; icon: string }[] = [
  { id: 'map', label: 'Map', icon: '🗺️' },
  { id: 'list', label: 'List', icon: '📋' },
  { id: 'contribute', label: 'Contribute', icon: '➕' },
  { id: 'about', label: 'About', icon: 'ℹ️' },
];

export class MenuNav extends LitElement {
  @property() declare currentPage: 'map' | 'list' | 'contribute' | 'about';

  constructor() {
    super();
    this.currentPage = 'map';
  }

  static styles = css`
    *,
    *::before,
    *::after {
      box-sizing: border-box;
    }

    :host {
      position: fixed;
      top: 16px;
      left: 16px;
      right: 280px;
      z-index: 700;
      font-family:
        -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    }

    .nav-shell {
      display: inline-flex;
      align-items: center;
      gap: 14px;
      max-width: 100%;
      padding: 7px;
      border: 1px solid var(--color-border, #d7e0e8);
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.88);
      box-shadow: var(--shadow-card, 0 12px 32px rgba(15, 23, 42, 0.08));
      backdrop-filter: blur(18px);
    }

    .brand {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      min-width: 238px;
      padding: 4px 10px 4px 4px;
      border: none;
      background: transparent;
      color: var(--color-text, #17212b);
      cursor: pointer;
      text-align: left;
    }

    .brand-mark {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 42px;
      height: 42px;
      border-radius: 50%;
      background: var(--color-accent, #173f35);
      color: #fdf8ef;
      font-size: 15px;
      font-weight: 900;
      letter-spacing: -0.05em;
    }

    .brand-copy {
      display: flex;
      min-width: 0;
      flex-direction: column;
      gap: 1px;
    }

    .brand-title {
      font-size: 14px;
      font-weight: 900;
      letter-spacing: -0.02em;
      white-space: nowrap;
    }

    .brand-subtitle {
      color: var(--color-text-muted, #51606f);
      font-size: 11px;
      font-weight: 700;
      white-space: nowrap;
    }

    .nav-items {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .menu-item {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      border: none;
      background: transparent;
      padding: 12px 14px;
      border-radius: 999px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 850;
      color: var(--color-text-muted, #51606f);
      text-align: left;
      white-space: nowrap;
      transition:
        background-color 0.15s ease,
        color 0.15s ease,
        transform 0.15s ease;
    }

    .menu-item:hover {
      background: var(--color-bg-chip, #eef3f7);
      transform: translateY(-1px);
    }

    .menu-item.active {
      background: var(--color-accent, #173f35);
      color: white;
      box-shadow: 0 10px 22px rgba(23, 63, 53, 0.18);
    }

    .menu-icon {
      font-size: 16px;
      line-height: 1;
    }

    @media (max-width: 860px) {
      :host {
        top: auto;
        right: 12px;
        bottom: 12px;
        left: 12px;
      }

      .nav-shell {
        width: 100%;
        justify-content: center;
        padding: 6px;
      }

      .brand {
        display: none;
      }

      .nav-items {
        width: 100%;
      }

      .menu-item {
        flex: 1;
        flex-direction: column;
        gap: 3px;
        padding: 9px 8px;
        font-size: 11px;
      }
    }
  `;

  render() {
    return html`
      <div class="nav-shell">
        <button class="brand" @click=${() => this.changePage('map')} aria-label="Go to map">
          <span class="brand-mark">RW</span>
          <span class="brand-copy">
            <span class="brand-title">Remote Work</span>
            <span class="brand-subtitle">Laptop-friendly places</span>
          </span>
        </button>

        <nav class="nav-items" aria-label="Primary navigation">
          ${PAGES.map(
            (page) => html`
              <button
                class="menu-item ${this.currentPage === page.id ? 'active' : ''}"
                aria-current=${this.currentPage === page.id ? 'page' : 'false'}
                @click=${() => this.changePage(page.id)}
              >
                <span class="menu-icon">${page.icon}</span>
                ${page.label}
              </button>
            `
          )}
        </nav>
      </div>
    `;
  }

  private changePage(page: 'map' | 'list' | 'contribute' | 'about') {
    this.currentPage = page;
    this.dispatchEvent(
      new CustomEvent('page-change', {
        detail: page,
      })
    );
  }
}

customElements.define('menu-nav', MenuNav);
