// src/services/weatherCanada.js
// NO API KEY NEEDED! This uses free Environment Canada data

export const weatherCanadaService = {
  // Get current weather for Lethbridge
  async getCurrentWeather() {
    try {
      // Using a CORS proxy to access Environment Canada RSS feed
      // ab-30 is Lethbridge's station code
      const response = await fetch(
        `https://api.allorigins.win/raw?url=https://weather.gc.ca/rss/city/ab-30_e.xml`
      );
      
      const text = await response.text();
      
      // Parse XML
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, 'text/xml');
      
      // Find current conditions entry
      const entries = xml.getElementsByTagName('entry');
      
      for (let entry of entries) {
        const title = entry.getElementsByTagName('title')[0]?.textContent || '';
        
        if (title.includes('Current Conditions')) {
          const summary = entry.getElementsByTagName('summary')[0]?.textContent || '';
          return this.parseCurrentConditions(summary);
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching weather:', error);
      return null;
    }
  },

 // In parseCurrentConditions, fix the temperature parsing:
parseCurrentConditions(text) {
  console.log('Raw weather text:', text);

  const conditions = {
    temperature: null,
    condition: '',
    feelsLike: null,
    humidity: null,
    wind: '',
    pressure: null
  };
  
  // Fix: Handle the </b> tag and &deg; entity
  const tempMatch = text.match(/Temperature:<\/b>\s*([-\d.]+)&deg;C/);
  if (tempMatch) {
    conditions.temperature = parseFloat(tempMatch[1]);
  }
  
  // Condition - also has </b> tag
  const conditionMatch = text.match(/Condition:<\/b>\s*([^<\n]+)/);
  if (conditionMatch) conditions.condition = conditionMatch[1].trim();
  
  // Humidity
  const humidityMatch = text.match(/Humidity:<\/b>\s*(\d+)\s*%/);
  if (humidityMatch) conditions.humidity = parseInt(humidityMatch[1]);
  
  // Wind
  const windMatch = text.match(/Wind:<\/b>\s*([^<\n]+)/);
  if (windMatch) conditions.wind = windMatch[1].trim();
  
  // Pressure
  const pressureMatch = text.match(/Pressure[^:]*:<\/b>\s*([\d.]+)\s*kPa/);
  if (pressureMatch) conditions.pressure = parseFloat(pressureMatch[1]);
  
  conditions.feelsLike = conditions.temperature;
  
  console.log('Parsed conditions:', conditions); // Debug
  return conditions;
},
  // Get weather icon
  getWeatherIcon(condition) {
    const c = condition?.toLowerCase() || '';
    if (c.includes('sun') || c.includes('clear')) return '☀️';
    if (c.includes('partly')) return '⛅';
    if (c.includes('cloud')) return '☁️';
    if (c.includes('rain')) return '🌧️';
    if (c.includes('snow')) return '❄️';
    if (c.includes('thunder')) return '⛈️';
    return '🌤️';
  }
};