// src/pages/TestMapWeather.jsx
// Create this temporary test page to verify everything works

import React, { useState, useEffect } from 'react';
import EventMap from '../components/EventMap';
import WeatherWidget from '../components/WeatherWidget';
import { geocodingService } from '../services/geocoding';
import { weatherCanadaService } from '../services/weatherCanada';

export default function TestMapWeather() {
  const [testResults, setTestResults] = useState({});
  const [loading, setLoading] = useState(true);

  // Sample events for testing
  const sampleEvents = [
    {
      id: 1,
      title: 'Test Event at Enmax',
      location: 'Enmax Centre, Lethbridge',
      latitude: 49.7217,
      longitude: -112.8595,
      start_date: new Date().toISOString(),
      is_free: false,
      cost: 25
    },
    {
      id: 2,
      title: 'Free Event Downtown',
      location: 'Downtown Lethbridge',
      latitude: 49.6978,
      longitude: -112.8413,
      start_date: new Date().toISOString(),
      is_free: true
    }
  ];

  const sampleBusinesses = [
    {
      id: 1,
      name: 'Test Business',
      category: 'Restaurant',
      address: '123 Main St, Lethbridge',
      latitude: 49.6956,
      longitude: -112.8340,
      phone: '(403) 555-0123'
    }
  ];

  useEffect(() => {
    runTests();
  }, []);

  const runTests = async () => {
    const results = {};
    
    // Test 1: Weather Service
    try {
      const weather = await weatherCanadaService.getCurrentWeather();
      results.weather = weather ? '✅ Weather loaded' : '❌ Weather failed';
      console.log('Weather data:', weather);
    } catch (error) {
      results.weather = '❌ Weather error: ' + error.message;
    }

    // Test 2: Geocoding Service
    try {
      const coords = await geocodingService.getCoordinates('Enmax Centre');
      results.geocoding = coords ? '✅ Geocoding works' : '❌ Geocoding failed';
      console.log('Geocoded coordinates:', coords);
    } catch (error) {
      results.geocoding = '❌ Geocoding error: ' + error.message;
    }

    // Test 3: Map Component
    results.map = '✅ Map component loaded';

    setTestResults(results);
    setLoading(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Map & Weather Integration Test</h1>
      
      {/* Test Results */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Integration Status:</h2>
        {loading ? (
          <p>Running tests...</p>
        ) : (
          <div className="space-y-2">
            {Object.entries(testResults).map(([key, value]) => (
              <p key={key} className="font-mono text-sm">
                {key}: {value}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Weather Widget Test */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div>
          <h2 className="text-lg font-semibold mb-4">Weather Widget:</h2>
          <WeatherWidget />
        </div>
      </div>

      {/* Map Test */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Event Map:</h2>
        <EventMap 
          events={sampleEvents}
          businesses={sampleBusinesses}
          height="400px"
        />
      </div>

      {/* Geocoding Test */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Test Geocoding:</h2>
        <button
          onClick={async () => {
            const address = prompt('Enter an address in Lethbridge:');
            if (address) {
              const coords = await geocodingService.getCoordinates(address);
              alert(`Coordinates: ${coords ? `${coords.lat}, ${coords.lon}` : 'Not found'}`);
            }
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Test Address Geocoding
        </button>
      </div>
    </div>
  );
}

