import { LitElement, html, css } from 'lit';
import { property, state } from 'lit/decorators.js';

const PAGES: { id: 'map' | 'list' | 'contribute' | 'about'; label: string; icon: string }[] = [
  { id: 'map', label: 'Map', icon: '🗺️' },
  { id: 'list', label: 'List', icon: '📋' },
  { id: 'contribute', label: 'Contribute', icon: '➕' },
  { id: 'about', label: 'About', icon: 'ℹ️' },
];

export class MenuNav extends LitElement {
  @property() declare currentPage: 'map' | 'list' | 'contribute' | 'about';
  @state() declare open: boolean;

  constructor() {
    super();
    this.currentPage = 'map';
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
      top: 16px;
      left: 16px;
      z-index: 700;
      font-family:
        -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    }

    .menu-toggle {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      border: 1px solid var(--color-border, #d7e0e8);
      border-radius: var(--radius-md, 14px);
      background: rgba(255, 255, 255, 0.95);
      box-shadow: var(--shadow-card, 0 12px 32px rgba(15, 23, 42, 0.08));
      backdrop-filter: blur(6px);
      cursor: pointer;
      font-size: 19px;
    }

    .menu-toggle:hover {
      border-color: var(--color-primary, #006cff);
    }

    .menu-panel {
      position: absolute;
      top: 52px;
      left: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 190px;
      padding: 6px;
      border: 1px solid var(--color-border, #d7e0e8);
      border-radius: var(--radius-lg, 20px);
      background: rgba(255, 255, 255, 0.97);
      box-shadow: var(--shadow-popover, 0 22px 70px rgba(15, 23, 42, 0.16));
      backdrop-filter: blur(8px);
    }

    .menu-item {
      display: flex;
      align-items: center;
      gap: 10px;
      border: none;
      background: none;
      padding: 10px 12px;
      border-radius: var(--radius-sm, 8px);
      cursor: pointer;
      font-size: 14px;
      font-weight: 700;
      color: var(--color-text-muted, #51606f);
      text-align: left;
    }

    .menu-item:hover {
      background: var(--color-bg-chip, #eef3f7);
    }

    .menu-item.active {
      background: var(--color-primary, #006cff);
      color: white;
    }

    .menu-icon {
      font-size: 16px;
      line-height: 1;
    }
  `;

  render() {
    return html`
      <button
        class="menu-toggle"
        @click=${this.toggleOpen}
        aria-label="Open navigation menu"
        aria-expanded=${this.open}
      >
        ${this.open ? '✕' : '☰'}
      </button>

      ${this.open
        ? html`
            <nav class="menu-panel">
              ${PAGES.map(
                (page) => html`
                  <button
                    class="menu-item ${this.currentPage === page.id ? 'active' : ''}"
                    @click=${() => this.changePage(page.id)}
                  >
                    <span class="menu-icon">${page.icon}</span>
                    ${page.label}
                  </button>
                `
              )}
            </nav>
          `
        : ''}
    `;
  }

  private toggleOpen() {
    this.open = !this.open;
  }

  private changePage(page: 'map' | 'list' | 'contribute' | 'about') {
    this.currentPage = page;
    this.open = false;
    this.dispatchEvent(
      new CustomEvent('page-change', {
        detail: page,
      })
    );
  }
}

customElements.define('menu-nav', MenuNav);
