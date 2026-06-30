import { html } from 'lit';

// Small inline SVGs instead of brand logos — recognizable map/compass/globe
// glyphs tinted in each service's brand color, with no external asset or
// trademarked-logo dependency.

export const googleMapsIcon = html`
  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
    <path
      d="M12 2C7.58 2 4 5.58 4 10c0 5.25 7 12 8 12s8-6.75 8-12c0-4.42-3.58-8-8-8z"
      fill="#EA4335"
    />
    <circle cx="12" cy="10" r="3" fill="white" />
  </svg>
`;

export const appleMapsIcon = html`
  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke="#555" stroke-width="1.5" fill="none" />
    <path d="M15.5 8.5l-2.2 6-6 2.2 2.2-6z" fill="#555" />
  </svg>
`;

export const osmIcon = html`
  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke="#7ebc6a" stroke-width="1.5" fill="none" />
    <path
      d="M3 12h18M12 3c2.5 2.5 2.5 15.5 0 18M12 3c-2.5 2.5-2.5 15.5 0 18"
      stroke="#7ebc6a"
      stroke-width="1.2"
      fill="none"
    />
  </svg>
`;
