import { LitElement, html, css } from 'lit';
import { property } from 'lit/decorators.js';

export class MenuNav extends LitElement {
  @property() declare currentPage: 'map' | 'list' | 'contribute' | 'about';

  constructor() {
    super();
    this.currentPage = 'map';
  }

  static styles = css`
    :host {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: white;
      border-bottom: 1px solid #eee;
      padding: 12px;
      z-index: 400;
      display: flex;
      gap: 8px;
    }

    .menu-btn {
      background: none;
      border: none;
      padding: 8px 16px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      border-radius: 4px;
      color: #666;
      transition: all 0.2s ease;
    }

    .menu-btn:hover {
      background: #f5f5f5;
    }

    .menu-btn.active {
      background: #e3f2fd;
      color: #1976d2;
    }
  `;

  render() {
    return html`
      <button
        class="menu-btn ${this.currentPage === 'map' ? 'active' : ''}"
        @click=${() => this.changePage('map')}
      >
        🗺️ Map
      </button>
      <button
        class="menu-btn ${this.currentPage === 'list' ? 'active' : ''}"
        @click=${() => this.changePage('list')}
      >
        📋 List
      </button>
      <button
        class="menu-btn ${this.currentPage === 'contribute' ? 'active' : ''}"
        @click=${() => this.changePage('contribute')}
      >
        ➕ Contribute
      </button>
      <button
        class="menu-btn ${this.currentPage === 'about' ? 'active' : ''}"
        @click=${() => this.changePage('about')}
      >
        ℹ️ About
      </button>
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
