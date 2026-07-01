import { css } from 'lit';

// Shared layout for full pages rendered inside <remote-work-app>: fills the
// remaining flex space below the fixed top nav, scrolls independently, and
// centers content in a readable column.
export const pageHostStyles = css`
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  :host {
    display: block;
    flex: 1;
    width: 100%;
    min-height: 0;
    overflow-y: auto;
    padding: 80px 24px 32px;
    box-sizing: border-box;
    font-family:
      -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    color: var(--color-text, #17212b);
  }

  .page-content {
    max-width: 800px;
    margin: 0 auto;
  }

  .page-content h2 {
    margin-bottom: 18px;
    font-size: 26px;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: var(--color-text, #17212b);
  }

  .page-content p {
    margin-bottom: 12px;
    line-height: 1.6;
    color: var(--color-text-muted, #51606f);
  }

  .page-content a {
    color: var(--color-primary, #006cff);
    font-weight: 600;
    text-decoration: none;
  }

  .page-content a:hover {
    text-decoration: underline;
  }
`;
