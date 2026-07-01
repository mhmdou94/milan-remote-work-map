import './app.js';

console.log('🚀 Main.ts loaded');

const app = document.getElementById('app');
console.log('📍 App element:', app);

if (app) {
  console.log('✓ Creating remote-work-app element');
  const remoteWorkApp = document.createElement('remote-work-app');
  console.log('✓ Appending to DOM');
  app.appendChild(remoteWorkApp);
  console.log('✓ Done');

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
      console.log('🎯 Page change event:', page);
      app_.navigateToPage(page);
      syncGlobalUi();
    });
  }

  // Listen for filter changes from filter-popover
  if (filterPopover) {
    filterPopover.addEventListener('filters-change', (event: Event) => {
      const filters = (event as CustomEvent).detail;
      console.log('🎯 Filters change event:', filters);
      app_.applyFilters(filters);
    });
  }

  remoteWorkApp.addEventListener('ui-state-change', syncGlobalUi);
  syncGlobalUi();
} else {
  console.error('❌ App element not found!');
}
