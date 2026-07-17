import { Ionicons } from '@expo/vector-icons';

export type IconName = keyof typeof Ionicons.glyphMap;
export type WeatherCategory =
  | 'clear'
  | 'partly-cloud'
  | 'cloud'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'snow'
  | 'storm';

type WeatherInfo = { icon: IconName; label: string; category: WeatherCategory };

// Tipos de tempo do IPMA (idWeatherType): https://api.ipma.pt/open-data/weather-type-classe.json
const IPMA_WEATHER_TYPES: Record<number, WeatherInfo> = {
  1: { icon: 'sunny', label: 'Clear sky', category: 'clear' },
  2: { icon: 'partly-sunny', label: 'Slightly cloudy', category: 'partly-cloud' },
  3: { icon: 'partly-sunny', label: 'Partly cloudy', category: 'partly-cloud' },
  4: { icon: 'cloudy', label: 'Very cloudy', category: 'cloud' },
  5: { icon: 'cloudy', label: 'High clouds', category: 'cloud' },
  6: { icon: 'rainy', label: 'Showers/rain', category: 'rain' },
  7: { icon: 'rainy', label: 'Light showers/rain', category: 'rain' },
  8: { icon: 'rainy', label: 'Heavy showers/rain', category: 'rain' },
  9: { icon: 'rainy', label: 'Rain/showers', category: 'rain' },
  10: { icon: 'rainy-outline', label: 'Light rain or drizzle', category: 'drizzle' },
  11: { icon: 'rainy', label: 'Heavy rain/showers', category: 'rain' },
  12: { icon: 'rainy', label: 'Rainy periods', category: 'rain' },
  13: { icon: 'rainy-outline', label: 'Periods of light rain', category: 'drizzle' },
  14: { icon: 'rainy', label: 'Periods of heavy rain', category: 'rain' },
  15: { icon: 'rainy-outline', label: 'Drizzle', category: 'drizzle' },
  16: { icon: 'cloud-outline', label: 'Mist', category: 'fog' },
  17: { icon: 'cloud-outline', label: 'Fog or low clouds', category: 'fog' },
  18: { icon: 'snow', label: 'Snow', category: 'snow' },
  19: { icon: 'thunderstorm', label: 'Thunderstorm', category: 'storm' },
  20: { icon: 'thunderstorm', label: 'Showers with possible thunderstorm', category: 'storm' },
  21: { icon: 'thunderstorm', label: 'Hail', category: 'storm' },
  22: { icon: 'snow', label: 'Frost', category: 'snow' },
  23: { icon: 'thunderstorm', label: 'Rain with possible thunderstorm', category: 'storm' },
  24: { icon: 'cloudy', label: 'Convective clouds', category: 'cloud' },
  25: { icon: 'cloudy', label: 'Periods of very cloudy sky', category: 'cloud' },
  26: { icon: 'cloud-outline', label: 'Fog', category: 'fog' },
  27: { icon: 'cloudy', label: 'Cloudy sky', category: 'cloud' },
  28: { icon: 'snow', label: 'Snow showers', category: 'snow' },
  29: { icon: 'snow', label: 'Rain and snow', category: 'snow' },
  30: { icon: 'snow', label: 'Rain and snow', category: 'snow' },
};

const FALLBACK: WeatherInfo = { icon: 'partly-sunny', label: 'No information', category: 'partly-cloud' };

export function getWeatherInfo(idWeatherType: number): WeatherInfo {
  return IPMA_WEATHER_TYPES[idWeatherType] ?? FALLBACK;
}

export const WEATHER_CATEGORY_COLORS: Record<WeatherCategory, string> = {
  clear: '#FACC15',
  'partly-cloud': '#FACC15',
  cloud: '#f4f2ef',
  fog: '#c9c5bf',
  drizzle: '#93C5FD',
  rain: '#60A5FA',
  snow: '#f4f2ef',
  storm: '#FDE68A',
};

// O IPMA devolve a direção do vento já em inglês (N, NE, E, SE, S, SW, W, NW).
export function getWindDirectionLabel(direction: string): string {
  return direction;
}

export function getUvColor(uv: number): string {
  if (uv < 3) return '#22C55E';
  if (uv < 6) return '#EAB308';
  if (uv < 8) return '#F97316';
  if (uv < 11) return '#EF4444';
  return '#A855F7';
}

export function getUvLabel(uv: number): string {
  if (uv < 3) return 'Low';
  if (uv < 6) return 'Moderate';
  if (uv < 8) return 'High';
  if (uv < 11) return 'Very high';
  return 'Extreme';
}

// https://api.ipma.pt/open-data/wind-speed-daily-classe.json
export const WIND_SPEED_LABELS: Record<number, string> = {
  1: 'Light',
  2: 'Moderate',
  3: 'Strong',
  4: 'Very strong',
};

export const WARNING_LEVEL_LABELS: Record<'yellow' | 'orange' | 'red', string> = {
  yellow: 'Yellow',
  orange: 'Orange',
  red: 'Red',
};

export const WARNING_LEVEL_COLORS: Record<'yellow' | 'orange' | 'red', string> = {
  yellow: '#EAB308',
  orange: '#F97316',
  red: '#EF4444',
};
