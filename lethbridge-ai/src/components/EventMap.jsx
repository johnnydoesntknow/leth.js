// src/components/EventMap.jsx
import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

// Lethbridge city center coordinates
const LETHBRIDGE_CENTER = [-112.8340, 49.6956];

export default function EventMap({ events = [], businesses = [], height = '500px' }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize the map
  useEffect(() => {
    if (map.current) return; // Initialize only once

    try {
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: {
          version: 8,
          sources: {
            'osm-tiles': {
              type: 'raster',
              tiles: [
                'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
              ],
              tileSize: 256,
              attribution: '© OpenStreetMap contributors'
            }
          },
          layers: [
            {
              id: 'osm-tiles',
              type: 'raster',
              source: 'osm-tiles',
              minzoom: 0,
              maxzoom: 19
            }
          ]
        },
        center: LETHBRIDGE_CENTER,
        zoom: 11
      });

      console.log('✅ Map initialized successfully');

      // Add navigation controls (zoom buttons)
      map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

      // Mark map as loaded
      map.current.on('load', () => {
        setMapLoaded(true);
      });

      // Error handler
      map.current.on('error', (e) => {
        console.error('❌ Map error:', e);
        if (e.error) console.error('Error details:', e.error);
      });

    } catch (error) {
      console.error('💥 Error creating map:', error);
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
        setMapLoaded(false);
      }
    };
  }, []);

  // Add markers using stored coordinates
  useEffect(() => {
    if (!mapLoaded || !map.current) return;

    // Clear existing markers
    document.querySelectorAll('.maplibre-marker').forEach(el => el.remove());

    // Add event markers using stored coordinates
    events.forEach(event => {
      let lng, lat;
      
      // Use stored coordinates from database
      if (event.longitude && event.latitude) {
        lng = event.longitude;
        lat = event.latitude;
        console.log(`📍 Event "${event.title}" at: ${lat}, ${lng}`);
      } else {
        // Fallback to random position if no coordinates stored
        lng = LETHBRIDGE_CENTER[0] + (Math.random() - 0.5) * 0.1;
        lat = LETHBRIDGE_CENTER[1] + (Math.random() - 0.5) * 0.1;
        console.warn(`⚠️ No coords for event "${event.title}", using random`);
      }

      // Create custom marker element
      const el = document.createElement('div');
      el.className = 'custom-marker';
      el.innerHTML = `
        <div style="
          background: #3B82F6;
          border: 2px solid white;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          cursor: pointer;
        ">
          <span style="font-size: 18px;">📅</span>
        </div>
      `;

      // Create popup
      const popup = new maplibregl.Popup({ offset: 25 })
        .setHTML(`
          <div style="padding: 8px; max-width: 200px;">
            <strong>${event.title}</strong><br/>
            <small>${event.location || 'Lethbridge'}</small><br/>
            ${event.start_date ? `<small>${new Date(event.start_date).toLocaleDateString()}</small>` : ''}
          </div>
        `);

      // Add marker to map
      new maplibregl.Marker({ element: el })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map.current);
    });

    // Add business markers using stored coordinates
    businesses.forEach(business => {
      let lng, lat;
      
      // Use stored coordinates from database
      if (business.longitude && business.latitude) {
        lng = business.longitude;
        lat = business.latitude;
        console.log(`📍 Business "${business.name}" at: ${lat}, ${lng}`);
      } else {
        // Fallback to random position if no coordinates stored
        lng = LETHBRIDGE_CENTER[0] + (Math.random() - 0.5) * 0.1;
        lat = LETHBRIDGE_CENTER[1] + (Math.random() - 0.5) * 0.1;
        console.warn(`⚠️ No coords for business "${business.name}", using random`);
      }

      const el = document.createElement('div');
      el.innerHTML = `
        <div style="
          background: #9333EA;
          border: 2px solid white;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          cursor: pointer;
        ">
          <span style="font-size: 18px;">🏢</span>
        </div>
      `;

      const popup = new maplibregl.Popup({ offset: 25 })
        .setHTML(`
          <div style="padding: 8px; max-width: 200px;">
            <strong>${business.name}</strong><br/>
            <small>${business.category || 'Business'}</small><br/>
            ${business.address ? `<small>${business.address}</small>` : ''}
          </div>
        `);

      new maplibregl.Marker({ element: el })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map.current);
    });

    console.log(`📍 Updated markers: ${events.length} events, ${businesses.length} businesses`);
  }, [mapLoaded, events, businesses]);

  return (
    <div className="relative w-full" style={{ height: height || '500px' }}>
      <div 
        ref={mapContainer} 
        className="w-full h-full rounded-lg"
        style={{ minHeight: '500px', backgroundColor: '#f0f0f0' }}
      />
      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3">
        <div className="text-xs font-semibold mb-2">Map Legend</div>
        <div className="flex items-center gap-2 text-xs mb-1">
          <span className="inline-block w-3 h-3 bg-blue-500 rounded-full"></span>
          <span>Events ({events.length})</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-block w-3 h-3 bg-purple-600 rounded-full"></span>
          <span>Businesses ({businesses.length})</span>
        </div>
      </div>
    </div>
  );
}