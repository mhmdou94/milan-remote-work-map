import './app.js';

const app = document.getElementById('app');

if (app) {
  const remoteWorkApp = document.createElement('remote-work-app');
  app.appendChild(remoteWorkApp);

  // Set up communication with global UI elements
  const menuNav = document.getElementById('menu-nav') as any;
  const filterPopover = document.getElementById('filter-popover') as any;
  const app_ = remoteWorkApp as any;

  // Listen for page changes from menu-nav
  if (menuNav) {
    menuNav.addEventListener('page-change', (event: CustomEvent) => {
      app_.navigateToPage(event.detail);
    });
  }

  // Listen for filter changes from filter-popover
  if (filterPopover) {
    filterPopover.addEventListener('filters-change', (event: CustomEvent) => {
      app_.applyFilters(event.detail);
    });
  }

  // Watch for currentPage changes and sync to menu-nav
  setInterval(() => {
    if (menuNav && menuNav.currentPage !== app_.currentPage) {
      menuNav.currentPage = app_.currentPage;
    }
  }, 100);
} else {
  console.error('App element not found');
}
