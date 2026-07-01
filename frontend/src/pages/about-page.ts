import { LitElement, html } from 'lit';
import { pageHostStyles } from './page-styles.js';

export class AboutPage extends LitElement {
  static styles = pageHostStyles;

  render() {
    return html`
      <div class="page-content">
        <h2>About</h2>
        <p>Milan Remote Work Map helps you find places in Milan where you can work remotely.</p>
        <p>Data is sourced from OpenStreetMap, updated daily.</p>
      </div>
    `;
  }
}

customElements.define('about-page', AboutPage);
