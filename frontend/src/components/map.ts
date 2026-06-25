import { LitElement, html, css } from 'lit';
import { property, state } from 'lit/decorators.js';
import L from 'leaflet';
import 'leaflet.markercluster';
import type { Place } from '../types';

export class MapComponent extends LitElement {
  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }

    #map-container {
      width: 100%;
      height: 100%;
    }
  `;

  @property({ type: Array }) places: Place[] = [];
  @property() selectedPlace: Place | null = null;
  @state() map: L.Map | null = null;
  @state() userLocation: { lat: number; lon: number } | null = null;
  @state() markerCluster: any = null;

  private markers: Map<string, L.Marker> = new Map();

  render() {
    return html` <div id="map-container"></div> `;
  }

  firstUpdated() {
    this.initMap();
    this.requestGeolocation();
  }

  updated(changedProperties: Map<string, any>) {
    if (changedProperties.has('places')) {
      this.renderMarkers();
    }
    if (changedProperties.has('selectedPlace')) {
      this.highlightSelectedPlace();
    }
  }

  private initMap() {
    const container = this.renderRoot.querySelector('#map-container') as HTMLElement;
    if (!container) return;

    this.map = L.map(container).setView([45.4642, 9.19], 13);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap, © CARTO',
      maxZoom: 19,
    }).addTo(this.map);

    // Initialize marker cluster group
    this.markerCluster = L.markerClusterGroup({
      maxClusterRadius: 80,
    });
    this.map.addLayer(this.markerCluster);
  }

  private renderMarkers() {
    if (!this.map || !this.markerCluster) return;

    // Clear old markers
    this.markerCluster.clearLayers();
    this.markers.clear();

    // Add new markers
    for (const place of this.places) {
      const marker = L.marker([place.latitude, place.longitude], {
        title: place.name,
      });

      marker.bindPopup(this.createPopupContent(place));

      marker.on('click', () => {
        this.dispatchEvent(new CustomEvent('place-selected', { detail: place }));
      });

      this.markerCluster.addLayer(marker);
      this.markers.set(place.id, marker);
    }
  }

  private highlightSelectedPlace() {
    // Reset all markers
    this.markers.forEach((marker) => {
      const icon = marker.getIcon() as L.Icon;
      if (icon) {
        (icon.options.className as any) = '';
        marker.setIcon(icon);
      }
    });

    // Highlight selected
    if (this.selectedPlace) {
      const marker = this.markers.get(this.selectedPlace.id);
      if (marker) {
        marker.openPopup();
        this.map?.setView([this.selectedPlace.latitude, this.selectedPlace.longitude], 15);
      }
    }
  }

  private createPopupContent(place: Place): string {
    return `
      <div style="min-width: 200px;">
        <strong>${place.name}</strong>
        ${place.category ? `<div style="font-size: 12px; color: #666;">${place.category}</div>` : ''}
        ${place.address ? `<div style="font-size: 12px;">${place.address}</div>` : ''}
      </div>
    `;
  }

  private requestGeolocation() {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.userLocation = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        };

        if (this.map) {
          this.map.setView([this.userLocation.lat, this.userLocation.lon], 14);

          // Add user location marker
          L.circleMarker([this.userLocation.lat, this.userLocation.lon], {
            radius: 8,
            fillColor: '#4285F4',
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8,
          }).addTo(this.map);
        }
      },
      (error) => {
        console.log('Geolocation not available, using default center');
      }
    );
  }
}

customElements.define('remote-work-map', MapComponent);
