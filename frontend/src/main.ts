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
  const app_ = remoteWorkApp as any;

  // Listen for page changes from menu-nav
  if (menuNav) {
    menuNav.addEventListener('page-change', (event: CustomEvent) => {
      console.log('🎯 Page change event:', event.detail);
      app_.currentPage = event.detail;
    });
  }

  // Listen for filter changes from filter-popover
  if (filterPopover) {
    filterPopover.addEventListener('filters-change', (event: CustomEvent) => {
      console.log('🎯 Filters change event:', event.detail);
      app_.filters = event.detail;
      app_.fetchPlaces();
    });
  }

  // Watch for currentPage changes and sync to menu-nav
  setInterval(() => {
    if (menuNav && menuNav.currentPage !== app_.currentPage) {
      menuNav.currentPage = app_.currentPage;
    }
  }, 100);
} else {
  console.error('❌ App element not found!');
}
