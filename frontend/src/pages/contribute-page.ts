import { LitElement, html, css } from 'lit';
import { pageHostStyles } from './page-styles.js';

const WIKI = 'https://wiki.openstreetmap.org/wiki/';

const TAGS_USED = [
  {
    key: 'laptop=yes',
    purpose: 'Selects which places show up on the map at all.',
    wikiUrl: 'https://taginfo.openstreetmap.org/keys/laptop',
  },
  {
    key: 'internet_access',
    purpose: 'Powers the "Has internet access" filter.',
    wikiUrl: `${WIKI}Key:internet_access`,
  },
  {
    key: 'socket / sockets / power_supply',
    purpose: 'Powers the "Has power sockets" filter.',
    wikiUrl: `${WIKI}Key:power_supply`,
  },
  {
    key: 'opening_hours',
    purpose: 'Powers the "Open now" filter and the hours shown in place details.',
    wikiUrl: `${WIKI}Key:opening_hours`,
  },
  {
    key: 'laptop:conditional',
    purpose:
      'Notes time-based restrictions (e.g. no laptops during meal times), shown as a warning in place details.',
    wikiUrl: `${WIKI}Conditional_restrictions`,
  },
  {
    key: 'internet_access:ssid',
    purpose: 'WiFi network name, shown in place details.',
    wikiUrl: `${WIKI}Key:internet_access:ssid`,
  },
  {
    key: 'internet_access:fee',
    purpose: 'Whether the WiFi is paid, free, or customers-only.',
    wikiUrl: `${WIKI}Tag:internet_access=wlan`,
  },
  {
    key: 'internet_access:password',
    purpose:
      'Whether a password is needed (yes/no only — we never display real passwords, per OSM privacy guidance).',
    wikiUrl: `${WIKI}Key:internet_access:password`,
  },
  {
    key: 'amenity / shop / leisure / office',
    purpose: 'Determines the marker icon and category shown for a place.',
    wikiUrl: `${WIKI}Key:amenity`,
  },
  {
    key: 'addr:city',
    purpose: 'Powers the city dropdown on the List page.',
    wikiUrl: `${WIKI}Key:addr:city`,
  },
];

export class ContributePage extends LitElement {
  static styles = [
    pageHostStyles,
    css`
      .tags-table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        margin-top: 12px;
        font-size: 14px;
        border: 1px solid var(--color-border, #d7e0e8);
        border-radius: var(--radius-lg, 20px);
        overflow: hidden;
      }

      .tags-table th {
        text-align: left;
        padding: 12px;
        background: var(--color-bg-soft, #f7fafc);
        font-size: 11px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--color-text-faint, #667483);
      }

      .tags-table td {
        text-align: left;
        padding: 12px;
        border-top: 1px solid var(--color-border-soft, #e3eaf1);
        vertical-align: top;
        color: var(--color-text-muted, #51606f);
      }

      .tags-table code {
        background: var(--color-bg-chip, #eef3f7);
        color: var(--color-text, #17212b);
        padding: 2px 6px;
        border-radius: var(--radius-sm, 8px);
        font-size: 13px;
        font-weight: 600;
      }
    `,
  ];

  render() {
    return html`
      <div class="page-content">
        <h2>How to Contribute</h2>
        <p>
          Help improve this map by contributing to
          <a href="https://www.openstreetmap.org/" target="_blank">OpenStreetMap</a>.
        </p>
        <p>
          You can also use <a href="https://mapcomplete.osm.be/" target="_blank">MapComplete</a>
          to add or edit places.
        </p>

        <h2>Which tags we use</h2>
        <p>
          This map only shows places explicitly tagged as laptop-friendly. Adding or fixing these
          tags on OpenStreetMap is the best way to improve the data shown here:
        </p>
        <table class="tags-table">
          <thead>
            <tr>
              <th>Tag</th>
              <th>Used for</th>
              <th>OSM Wiki</th>
            </tr>
          </thead>
          <tbody>
            ${TAGS_USED.map(
              (tag) => html`
                <tr>
                  <td><code>${tag.key}</code></td>
                  <td>${tag.purpose}</td>
                  <td>
                    <a href=${tag.wikiUrl} target="_blank"
                      >${tag.wikiUrl.replace('https://wiki.openstreetmap.org/wiki/', '')}</a
                    >
                  </td>
                </tr>
              `
            )}
          </tbody>
        </table>
      </div>
    `;
  }
}

customElements.define('contribute-page', ContributePage);
