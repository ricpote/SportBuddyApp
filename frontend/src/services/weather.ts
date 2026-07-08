export type DailyForecast = {
  date: string;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  precipitationProbability: number;
};

type IpmaLocation = {
  globalIdLocal: number;
  name: string;
  latitude: number;
  longitude: number;
};

// Lista de locais do IPMA (capitais de distrito + ilhas), com coordenadas —
// vem de https://api.ipma.pt/open-data/distrits-islands.json. É estável,
// por isso fica fixa aqui em vez de pedida à API a cada carregamento.
const IPMA_LOCATIONS: IpmaLocation[] = [
  { globalIdLocal: 1010500, name: 'Aveiro', latitude: 40.6413, longitude: -8.6535 },
  { globalIdLocal: 1020500, name: 'Beja', latitude: 38.02, longitude: -7.87 },
  { globalIdLocal: 1030300, name: 'Braga', latitude: 41.5475, longitude: -8.4227 },
  { globalIdLocal: 1030800, name: 'Guimarães', latitude: 41.4434, longitude: -8.2938 },
  { globalIdLocal: 1040200, name: 'Bragança', latitude: 41.8076, longitude: -6.7606 },
  { globalIdLocal: 1050200, name: 'Castelo Branco', latitude: 39.8217, longitude: -7.4957 },
  { globalIdLocal: 1060300, name: 'Coimbra', latitude: 40.2081, longitude: -8.4194 },
  { globalIdLocal: 1070500, name: 'Évora', latitude: 38.5701, longitude: -7.9104 },
  { globalIdLocal: 1080500, name: 'Faro', latitude: 37.0146, longitude: -7.9331 },
  { globalIdLocal: 1081505, name: 'Sagres', latitude: 37.0168, longitude: -8.9403 },
  { globalIdLocal: 1081100, name: 'Portimão', latitude: 37.15, longitude: -8.52 },
  { globalIdLocal: 1080800, name: 'Loulé', latitude: 37.1397, longitude: -8.0202 },
  { globalIdLocal: 1090700, name: 'Guarda', latitude: 40.5379, longitude: -7.2647 },
  { globalIdLocal: 1090821, name: 'Penhas Douradas', latitude: 40.4075, longitude: -7.5665 },
  { globalIdLocal: 1100900, name: 'Leiria', latitude: 39.7473, longitude: -8.8069 },
  { globalIdLocal: 1110600, name: 'Lisboa', latitude: 38.766, longitude: -9.1286 },
  { globalIdLocal: 1121400, name: 'Portalegre', latitude: 39.29, longitude: -7.42 },
  { globalIdLocal: 1131200, name: 'Porto', latitude: 41.158, longitude: -8.6294 },
  { globalIdLocal: 1141600, name: 'Santarém', latitude: 39.2, longitude: -8.74 },
  { globalIdLocal: 1151200, name: 'Setúbal', latitude: 38.5246, longitude: -8.8856 },
  { globalIdLocal: 1151300, name: 'Sines', latitude: 37.956, longitude: -8.8643 },
  { globalIdLocal: 1160900, name: 'Viana do Castelo', latitude: 41.6952, longitude: -8.8365 },
  { globalIdLocal: 1171400, name: 'Vila Real', latitude: 41.3053, longitude: -7.744 },
  { globalIdLocal: 1182300, name: 'Viseu', latitude: 40.6585, longitude: -7.912 },
  { globalIdLocal: 2310300, name: 'Funchal', latitude: 32.6485, longitude: -16.9084 },
  { globalIdLocal: 2320100, name: 'Porto Santo', latitude: 33.07, longitude: -16.34 },
  { globalIdLocal: 3410100, name: 'Vila do Porto', latitude: 36.9563, longitude: -25.1409 },
  { globalIdLocal: 3420300, name: 'Ponta Delgada', latitude: 37.7415, longitude: -25.6677 },
  { globalIdLocal: 3430100, name: 'Angra do Heroísmo', latitude: 38.67, longitude: -27.22 },
  { globalIdLocal: 3440100, name: 'Santa Cruz da Graciosa', latitude: 39.08, longitude: -28.0 },
  { globalIdLocal: 3450200, name: 'Velas', latitude: 38.6842, longitude: -28.2133 },
  { globalIdLocal: 3460200, name: 'Madalena', latitude: 38.5325, longitude: -28.5237 },
  { globalIdLocal: 3470100, name: 'Horta', latitude: 38.5363, longitude: -28.6315 },
  { globalIdLocal: 3480200, name: 'Santa Cruz das Flores', latitude: 39.45, longitude: -31.13 },
  { globalIdLocal: 3490100, name: 'Vila do Corvo', latitude: 39.67, longitude: -31.12 },
];

function distanceKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadiusKm = 6371;

  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * earthRadiusKm * Math.asin(Math.sqrt(h));
}

export function findNearestIpmaLocation(latitude: number, longitude: number): IpmaLocation {
  return IPMA_LOCATIONS.reduce((nearest, candidate) =>
    distanceKm({ latitude, longitude }, candidate) < distanceKm({ latitude, longitude }, nearest)
      ? candidate
      : nearest
  );
}

export async function getWeeklyForecast(
  latitude: number,
  longitude: number
): Promise<{ location: string; forecast: DailyForecast[] }> {
  const location = findNearestIpmaLocation(latitude, longitude);

  const response = await fetch(
    `https://api.ipma.pt/open-data/forecast/meteorology/cities/daily/${location.globalIdLocal}.json`
  );

  if (!response.ok) {
    throw new Error('Não foi possível obter a meteorologia');
  }

  const data = await response.json();

  const forecast: DailyForecast[] = data.data.map(
    (day: { forecastDate: string; idWeatherType: number; tMax: string; tMin: string; precipitaProb: string }) => ({
      date: day.forecastDate,
      weatherCode: day.idWeatherType,
      tempMax: Number(day.tMax),
      tempMin: Number(day.tMin),
      precipitationProbability: Number(day.precipitaProb),
    })
  );

  return { location: location.name, forecast };
}
