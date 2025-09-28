// src/services/geocoding.js
// Using Google Maps Geocoding for accurate results

// Store your Google Maps API key in environment variable for security
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY_HERE';

export const geocodingService = {
  // Convert address to coordinates using Google Maps
  async getCoordinates(address) {
    try {
      // Always append Lethbridge if not included
      const fullAddress = address.toLowerCase().includes('lethbridge') 
        ? address 
        : `${address}, Lethbridge, Alberta, Canada`;
      
      console.log('🔍 Geocoding with Google Maps:', fullAddress);
      
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?` +
        `address=${encodeURIComponent(fullAddress)}&` +
        `key=${GOOGLE_API_KEY}`
      );
      
      const data = await response.json();
      console.log('📦 Google Maps response:', data);
      
      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const result = data.results[0];
        const location = result.geometry.location;
        
        const coords = {
          lat: location.lat,
          lon: location.lng,  // Note: Google uses 'lng'
          display_name: result.formatted_address
        };
        
        console.log('✅ Google Maps found:', coords);
        return coords;
      } else if (data.status === 'ZERO_RESULTS') {
        console.log('⚠️ No results found for address:', fullAddress);
        return this.tryCommonLocations(address);
      } else if (data.error_message) {
        console.error('❌ Google Maps API error:', data.error_message);
        return this.tryCommonLocations(address);
      }
      
      return this.tryCommonLocations(address);
    } catch (error) {
      console.error('Geocoding error:', error);
      return this.tryCommonLocations(address);
    }
  },

  // Fallback for common Lethbridge locations
  tryCommonLocations(address) {
    const lower = address.toLowerCase();
    
    const locations = {
      'fairmont': { lat: 49.662360, lon: -112.788961, name: 'Fairmont Area' },
      'fairmount': { lat: 49.662360, lon: -112.788961, name: 'Fairmont Area' },
      'enmax': { lat: 49.7217, lon: -112.8595, name: 'Enmax Centre' },
      'university': { lat: 49.6783, lon: -112.8695, name: 'University of Lethbridge' },
      'college': { lat: 49.7022, lon: -112.8018, name: 'Lethbridge College' },
      'downtown': { lat: 49.6978, lon: -112.8413, name: 'Downtown Lethbridge' },
      'galt': { lat: 49.6892, lon: -112.8585, name: 'Galt Museum' },
      'city hall': { lat: 49.6976, lon: -112.8419, name: 'City Hall' },
      'exhibition': { lat: 49.6912, lon: -112.7838, name: 'Exhibition Park' },
      'casino': { lat: 49.6854, lon: -112.8408, name: 'Casino Lethbridge' },
      'ymca': { lat: 49.7107, lon: -112.8432, name: 'YMCA' },
      'yates': { lat: 49.6941, lon: -112.8458, name: 'Yates Theatre' }
    };
    
    for (const [key, coords] of Object.entries(locations)) {
      if (lower.includes(key)) {
        console.log(`📍 Using fallback location: ${coords.name}`);
        return coords;
      }
    }
    
    // Default to downtown Lethbridge
    console.log('📍 Using default downtown location');
    return { lat: 49.6978, lon: -112.8413, name: 'Downtown Lethbridge' };
  },

  // Batch geocode multiple addresses with rate limiting
  async geocodeMultiple(addresses) {
    const results = [];
    
    for (const address of addresses) {
      const coords = await this.getCoordinates(address);
      results.push(coords);
      // Google has rate limits, small delay between requests
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    return results;
  }
};