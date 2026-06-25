import { RemoteWorkApp } from './app.js';

const app = document.getElementById('app');
if (app) {
  const remoteWorkApp = new RemoteWorkApp();
  app.appendChild(remoteWorkApp);
}
