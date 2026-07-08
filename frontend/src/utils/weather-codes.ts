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
  1: { icon: 'sunny', label: 'Céu limpo', category: 'clear' },
  2: { icon: 'partly-sunny', label: 'Céu pouco nublado', category: 'partly-cloud' },
  3: { icon: 'partly-sunny', label: 'Céu parcialmente nublado', category: 'partly-cloud' },
  4: { icon: 'cloudy', label: 'Céu muito nublado', category: 'cloud' },
  5: { icon: 'cloudy', label: 'Céu nublado por nuvens altas', category: 'cloud' },
  6: { icon: 'rainy', label: 'Aguaceiros/chuva', category: 'rain' },
  7: { icon: 'rainy', label: 'Aguaceiros/chuva fracos', category: 'rain' },
  8: { icon: 'rainy', label: 'Aguaceiros/chuva fortes', category: 'rain' },
  9: { icon: 'rainy', label: 'Chuva/aguaceiros', category: 'rain' },
  10: { icon: 'rainy-outline', label: 'Chuva fraca ou chuvisco', category: 'drizzle' },
  11: { icon: 'rainy', label: 'Chuva/aguaceiros forte', category: 'rain' },
  12: { icon: 'rainy', label: 'Períodos de chuva', category: 'rain' },
  13: { icon: 'rainy-outline', label: 'Períodos de chuva fraca', category: 'drizzle' },
  14: { icon: 'rainy', label: 'Períodos de chuva forte', category: 'rain' },
  15: { icon: 'rainy-outline', label: 'Chuvisco', category: 'drizzle' },
  16: { icon: 'cloud-outline', label: 'Neblina', category: 'fog' },
  17: { icon: 'cloud-outline', label: 'Nevoeiro ou nuvens baixas', category: 'fog' },
  18: { icon: 'snow', label: 'Neve', category: 'snow' },
  19: { icon: 'thunderstorm', label: 'Trovoada', category: 'storm' },
  20: { icon: 'thunderstorm', label: 'Aguaceiros e possibilidade de trovoada', category: 'storm' },
  21: { icon: 'thunderstorm', label: 'Granizo', category: 'storm' },
  22: { icon: 'snow', label: 'Geada', category: 'snow' },
  23: { icon: 'thunderstorm', label: 'Chuva e possibilidade de trovoada', category: 'storm' },
  24: { icon: 'cloudy', label: 'Nebulosidade convectiva', category: 'cloud' },
  25: { icon: 'cloudy', label: 'Céu com períodos de muito nublado', category: 'cloud' },
  26: { icon: 'cloud-outline', label: 'Nevoeiro', category: 'fog' },
  27: { icon: 'cloudy', label: 'Céu nublado', category: 'cloud' },
  28: { icon: 'snow', label: 'Aguaceiros de neve', category: 'snow' },
  29: { icon: 'snow', label: 'Chuva e neve', category: 'snow' },
  30: { icon: 'snow', label: 'Chuva e neve', category: 'snow' },
};

const FALLBACK: WeatherInfo = { icon: 'partly-sunny', label: 'Sem informação', category: 'partly-cloud' };

export function getWeatherInfo(idWeatherType: number): WeatherInfo {
  return IPMA_WEATHER_TYPES[idWeatherType] ?? FALLBACK;
}

export const WEATHER_CATEGORY_COLORS: Record<WeatherCategory, string> = {
  clear: '#FACC15',
  'partly-cloud': '#FACC15',
  cloud: '#E2E8F0',
  fog: '#CBD5E1',
  drizzle: '#93C5FD',
  rain: '#60A5FA',
  snow: '#FFFFFF',
  storm: '#FDE68A',
};

// O IPMA devolve a direção do vento em inglês (N, NE, E, SE, S, SW, W, NW).
const WIND_DIRECTION_PT: Record<string, string> = {
  N: 'N',
  NE: 'NE',
  E: 'E',
  SE: 'SE',
  S: 'S',
  SW: 'SO',
  W: 'O',
  NW: 'NO',
};

export function getWindDirectionLabel(direction: string): string {
  return WIND_DIRECTION_PT[direction] ?? direction;
}

export function getUvColor(uv: number): string {
  if (uv < 3) return '#22C55E';
  if (uv < 6) return '#EAB308';
  if (uv < 8) return '#F97316';
  if (uv < 11) return '#EF4444';
  return '#A855F7';
}

export function getUvLabel(uv: number): string {
  if (uv < 3) return 'Baixo';
  if (uv < 6) return 'Moderado';
  if (uv < 8) return 'Alto';
  if (uv < 11) return 'Muito alto';
  return 'Extremo';
}

// https://api.ipma.pt/open-data/wind-speed-daily-classe.json
export const WIND_SPEED_LABELS: Record<number, string> = {
  1: 'Fraco',
  2: 'Moderado',
  3: 'Forte',
  4: 'Muito forte',
};

export const WARNING_LEVEL_LABELS: Record<'yellow' | 'orange' | 'red', string> = {
  yellow: 'Amarelo',
  orange: 'Laranja',
  red: 'Vermelho',
};

export const WARNING_LEVEL_COLORS: Record<'yellow' | 'orange' | 'red', string> = {
  yellow: '#EAB308',
  orange: '#F97316',
  red: '#EF4444',
};
