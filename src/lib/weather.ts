/**
 * Weather & Spray Advice Service using the free Open-Meteo API
 * Docs: https://open-meteo.com
 * No API key required.
 */

export interface DailyForecast {
  date: string;
  rainProbMax: number; // %
  tempMax: number; // °C
  tempMin: number; // °C
  windSpeedMax: number; // km/h
}

export type SprayAdviceStatus = "rain" | "wind" | "good";

export interface SprayAdvice {
  status: SprayAdviceStatus;
  rainChance: number;
  windSpeed: number;
}

export interface WeatherData {
  locationName: string;
  latitude: number;
  longitude: number;
  daily: DailyForecast[];
  sprayAdvice: SprayAdvice;
}

/**
 * Calculates agricultural spray suitability based on next 24 hours:
 * 1. Rain > 50%: Wash-off hazard -> "Don't spray today, rain expected"
 * 2. Wind > 15 km/h: Drift hazard -> "Wind is high, avoid spraying"
 * 3. Else: Optimal -> "Good time to spray"
 */
export function calculateSprayAdvice(today: DailyForecast): SprayAdvice {
  if (today.rainProbMax > 50) {
    return {
      status: "rain",
      rainChance: today.rainProbMax,
      windSpeed: today.windSpeedMax,
    };
  }

  if (today.windSpeedMax > 15) {
    return {
      status: "wind",
      rainChance: today.rainProbMax,
      windSpeed: today.windSpeedMax,
    };
  }

  return {
    status: "good",
    rainChance: today.rainProbMax,
    windSpeed: today.windSpeedMax,
  };
}

/**
 * Fetches 3-day weather forecast from Open-Meteo by coordinates
 */
export async function fetchWeatherByCoords(
  lat: number,
  lon: number,
  customLocationName?: string
): Promise<WeatherData> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=precipitation_probability_max,temperature_2m_max,temperature_2m_min,wind_speed_10m_max&forecast_days=3&timezone=auto`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Open-Meteo forecast failed with status ${res.status}`);
  }

  const data = await res.json();
  const times: string[] = data?.daily?.time || [];
  const rainProbs: number[] = data?.daily?.precipitation_probability_max || [];
  const tempMaxs: number[] = data?.daily?.temperature_2m_max || [];
  const tempMins: number[] = data?.daily?.temperature_2m_min || [];
  const winds: number[] = data?.daily?.wind_speed_10m_max || [];

  const daily: DailyForecast[] = times.slice(0, 3).map((date, idx) => ({
    date,
    rainProbMax: Math.round(rainProbs[idx] ?? 0),
    tempMax: Math.round(tempMaxs[idx] ?? 0),
    tempMin: Math.round(tempMins[idx] ?? 0),
    windSpeedMax: Math.round(winds[idx] ?? 0),
  }));

  // Resolve location name if not explicitly passed
  let locationName = customLocationName || "";
  if (!locationName) {
    try {
      const geoRes = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
      );
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        const city = geoData.locality || geoData.city || geoData.principalSubdivision;
        const state = geoData.principalSubdivision;
        locationName =
          city && state && city !== state ? `${city}, ${state}` : city || state || "Field Location";
      }
    } catch {
      locationName = "Field Location";
    }
  }

  const sprayAdvice: SprayAdvice = daily[0]
    ? calculateSprayAdvice(daily[0])
    : { status: "good", rainChance: 0, windSpeed: 0 };

  return {
    locationName: locationName || "Field Location",
    latitude: lat,
    longitude: lon,
    daily,
    sprayAdvice,
  };
}

/**
 * Searches city via Open-Meteo Geocoding API and fetches 3-day weather
 */
export async function searchCityAndFetchWeather(city: string): Promise<WeatherData> {
  const query = city.trim();
  if (!query) throw new Error("EMPTY_CITY");

  const searchUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    query
  )}&count=1&language=en&format=json`;

  const res = await fetch(searchUrl);
  if (!res.ok) {
    throw new Error(`Geocoding failed with status ${res.status}`);
  }

  const data = await res.json();
  if (!data?.results || data.results.length === 0) {
    throw new Error("CITY_NOT_FOUND");
  }

  const result = data.results[0];
  const name = result.name || query;
  const admin1 = result.admin1 || "";
  const country = result.country || "";
  const displayName = admin1 ? `${name}, ${admin1}` : country ? `${name}, ${country}` : name;

  return await fetchWeatherByCoords(result.latitude, result.longitude, displayName);
}
