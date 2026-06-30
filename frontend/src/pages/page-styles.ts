import { css } from 'lit';

// Shared layout for full pages rendered inside <remote-work-app>: fills the
// remaining flex space below the fixed top nav, scrolls independently, and
// centers content in a readable column.
export const pageHostStyles = css`
  :host {
    display: block;
    flex: 1;
    width: 100%;
    min-height: 0;
    overflow-y: auto;
    padding: 60px 20px 20px;
    box-sizing: border-box;
  }

  .page-content {
    max-width: 800px;
    margin: 0 auto;
  }

  .page-content h2 {
    margin-bottom: 16px;
    font-size: 24px;
    font-weight: 600;
  }

  .page-content p {
    margin-bottom: 12px;
    line-height: 1.6;
  }

  .page-content a {
    color: #1976d2;
    text-decoration: none;
  }

  .page-content a:hover {
    text-decoration: underline;
  }
`;
