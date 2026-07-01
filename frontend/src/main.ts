import './app.js';

const app = document.getElementById('app');

if (app) {
  const remoteWorkApp = document.createElement('remote-work-app');
  app.appendChild(remoteWorkApp);

  // Set up communication with global UI elements
  const menuNav = document.getElementById('menu-nav') as any;
  const filterPopover = document.getElementById('filter-popover') as any;
  const legendPopover = document.getElementById('legend-popover') as any;
  const app_ = remoteWorkApp as any;

  const syncGlobalUi = () => {
    if (menuNav) {
      menuNav.currentPage = app_.currentPage;
    }

    const onMapPage = app_.currentPage === 'map';
    if (filterPopover) {
      filterPopover.hidden = !onMapPage;
      filterPopover.filters = app_.filters;
      if (!onMapPage) filterPopover.open = false;
    }
    if (legendPopover) {
      legendPopover.hidden = !onMapPage;
      if (!onMapPage) legendPopover.open = false;
    }
  };

  // Listen for page changes from menu-nav
  if (menuNav) {
    menuNav.addEventListener('page-change', (event: Event) => {
      const page = (event as CustomEvent).detail;
      app_.navigateToPage(page);
      syncGlobalUi();
    });
  }

  // Listen for filter changes from filter-popover
  if (filterPopover) {
    filterPopover.addEventListener('filters-change', (event: Event) => {
      const filters = (event as CustomEvent).detail;
      app_.applyFilters(filters);
    });

    filterPopover.addEventListener('filter-opened', () => {
      if (legendPopover) legendPopover.open = false;
    });
  }

  if (legendPopover) {
    legendPopover.addEventListener('legend-opened', () => {
      if (filterPopover) filterPopover.open = false;
    });
  }

  remoteWorkApp.addEventListener('ui-state-change', syncGlobalUi);
  remoteWorkApp.addEventListener('filters-state-change', (event: Event) => {
    if (filterPopover) filterPopover.filters = (event as CustomEvent).detail;
  });
  syncGlobalUi();
} else {
  console.error('App element not found');
}
