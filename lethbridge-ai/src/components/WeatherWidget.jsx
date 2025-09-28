// src/components/WeatherWidget.jsx
import React, { useState, useEffect } from 'react';
import { weatherCanadaService } from '../services/weatherCanada';

export default function WeatherWidget() {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWeather();
    // Refresh every 10 minutes
    const interval = setInterval(loadWeather, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadWeather = async () => {
    try {
      const data = await weatherCanadaService.getCurrentWeather();
      setWeather(data);
    } catch (error) {
      console.error('Error loading weather:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-white/20 rounded w-24 mb-2"></div>
          <div className="h-8 bg-white/20 rounded w-16"></div>
        </div>
      </div>
    );
  }

  if (!weather) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm opacity-90">Lethbridge, AB</p>
          <p className="text-3xl font-bold">
            {weather.temperature}°C
          </p>
          {weather.feelsLike !== weather.temperature && (
            <p className="text-xs opacity-90">
              Feels like {weather.feelsLike}°C
            </p>
          )}
          <p className="text-sm opacity-90 mt-1">{weather.condition}</p>
          {weather.wind && (
            <p className="text-xs opacity-75 mt-1">Wind: {weather.wind}</p>
          )}
        </div>
        <div className="text-5xl">
          {weatherCanadaService.getWeatherIcon(weather.condition)}
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-white/20">
        <p className="text-xs opacity-75">
          Data from Environment Canada 🇨🇦
        </p>
      </div>
    </div>
  );
}