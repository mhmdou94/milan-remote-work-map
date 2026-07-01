import { LitElement, html, css } from 'lit';
import { pageHostStyles } from './page-styles.js';

const WIKI = 'https://wiki.openstreetmap.org/wiki/';

// Custom MapComplete layers (mapcomplete/*.json in this repo), published via
// MapComplete Studio. z/lat/lon just default the view to Milan so first-time
// visitors aren't dropped somewhere random.
const MAPCOMPLETE_DETAILS_URL =
  'https://mapcomplete.org/theme.html?' +
  'userlayout=' +
  encodeURIComponent(
    'https://studio.mapcomplete.org/1914637/layers/laptop_friendly_places/laptop_friendly_places.json'
  ) +
  '&z=13&lat=45.4642&lon=9.19';

const MAPCOMPLETE_CANDIDATES_URL =
  'https://mapcomplete.org/theme.html?' +
  'userlayout=' +
  encodeURIComponent(
    'https://studio.mapcomplete.org/1914637/layers/laptop_friendly_places_candidates/laptop_friendly_places_candidates.json'
  ) +
  '&z=13&lat=45.4642&lon=9.19';

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
  {
    key: 'wheelchair',
    purpose: 'Accessibility info, shown as an amenity badge in place details.',
    wikiUrl: `${WIKI}Key:wheelchair`,
  },
  {
    key: 'air_conditioning',
    purpose: 'Shown as an amenity badge — useful for long work sessions in summer.',
    wikiUrl: `${WIKI}Key:air_conditioning`,
  },
  {
    key: 'indoor_seating',
    purpose: 'Shown as an amenity badge.',
    wikiUrl: `${WIKI}Key:indoor_seating`,
  },
  {
    key: 'outdoor_seating',
    purpose: 'Shown as an amenity badge.',
    wikiUrl: `${WIKI}Key:outdoor_seating`,
  },
  {
    key: 'smoking',
    purpose: 'Smoking policy, shown as an amenity badge.',
    wikiUrl: `${WIKI}Key:smoking`,
  },
  {
    key: 'level',
    purpose: 'Floor shown as an amenity badge — handy for multi-floor buildings.',
    wikiUrl: `${WIKI}Key:level`,
  },
  {
    key: 'phone / contact:phone',
    purpose: 'Powers the "Call" link in place details.',
    wikiUrl: `${WIKI}Key:phone`,
  },
  {
    key: 'website / contact:website',
    purpose: 'Powers the "Visit website" link in place details.',
    wikiUrl: `${WIKI}Key:website`,
  },
  {
    key: 'fee',
    purpose: 'Whether a fee applies to enter or use the place (e.g. coworking spaces).',
    wikiUrl: `${WIKI}Key:fee`,
  },
  {
    key: 'charge',
    purpose: 'Price/cost text shown alongside the fee badge when available.',
    wikiUrl: `${WIKI}Key:charge`,
  },
  {
    key: 'reservation',
    purpose: 'Whether booking ahead is required, recommended, or unnecessary.',
    wikiUrl: `${WIKI}Key:reservation`,
  },
  {
    key: 'capacity',
    purpose: 'Seat/desk count, shown as an amenity badge.',
    wikiUrl: `${WIKI}Key:capacity`,
  },
  {
    key: 'brand / operator',
    purpose: 'Chain or operator name, shown as an amenity badge.',
    wikiUrl: `${WIKI}Key:brand`,
  },
  {
    key: 'drinking_water',
    purpose: 'Whether free drinking water is available.',
    wikiUrl: `${WIKI}Key:drinking_water`,
  },
  {
    key: 'toilets / toilets:wheelchair',
    purpose: 'Whether toilets, and accessible toilets, are available.',
    wikiUrl: `${WIKI}Key:toilets`,
  },
  {
    key: 'dog',
    purpose: 'Whether dogs are allowed, shown as an amenity badge.',
    wikiUrl: `${WIKI}Key:dog`,
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
        <p>You can also use our MapComplete editors to contribute directly:</p>
        <ul>
          <li>
            <a href=${MAPCOMPLETE_CANDIDATES_URL} target="_blank">Map a new place</a>
            &mdash; browse cafés, bars, pubs, fast food places, food courts, libraries, coworking
            spaces, community centres and bakeries that aren't tagged yet, and answer one question
            to add them to this map.
          </li>
          <li>
            <a href=${MAPCOMPLETE_DETAILS_URL} target="_blank">Add details to an existing place</a>
            &mdash; edit places already on this map: WiFi, sockets, opening hours, accessibility,
            and the other fields shown in place details.
          </li>
        </ul>

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
