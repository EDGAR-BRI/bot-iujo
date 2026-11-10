import { SeismicConfig } from './store';

export interface QuakeEvent {
  id: string;
  magnitude: number;
  place: string;
  time: string; // ISO string
  timestamp: number;
  depthKm: number;
  latitude: number;
  longitude: number;
  distanceFromBqtoKm: number;
  referenceBqto: string;
  source: 'USGS' | 'EMSC' | 'SIMULACRO-IUJO';
  url?: string;
  severity: 'leve' | 'moderado' | 'fuerte' | 'severo';
}

const REFERENCE_CITIES_LARA = [
  { name: 'Barquisimeto (Sede IUJO)', lat: 10.0647, lon: -69.357 },
  { name: 'Cabudare', lat: 10.0331, lon: -69.2633 },
  { name: 'Quíbor', lat: 9.9286, lon: -69.6201 },
  { name: 'El Tocuyo', lat: 9.7822, lon: -69.7929 },
  { name: 'Carora', lat: 10.1755, lon: -70.081 },
  { name: 'Duaca', lat: 10.2869, lon: -69.1628 },
  { name: 'Sarare', lat: 9.7819, lon: -69.1636 },
  { name: 'San Felipe (Yaracuy)', lat: 10.3399, lon: -68.7425 },
  { name: 'Acarigua (Portuguesa)', lat: 9.5545, lon: -69.1956 },
  { name: 'Boconó (Trujillo)', lat: 9.2539, lon: -70.2511 },
];

export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

function getCardinalDirection(lat1: number, lon1: number, lat2: number, lon2: number): string {
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  const angle = (Math.atan2(dLon, dLat) * 180) / Math.PI;
  const deg = (angle + 360) % 360;
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
  return dirs[Math.round(deg / 45) % 8];
}

export function buildBarquisimetoReference(
  lat: number,
  lon: number,
  bqtoLat = 10.0647,
  bqtoLon = -69.357
): { distanceKm: number; text: string } {
  const distBqto = haversineDistanceKm(bqtoLat, bqtoLon, lat, lon);
  const dirBqto = getCardinalDirection(bqtoLat, bqtoLon, lat, lon);

  let nearest = REFERENCE_CITIES_LARA[0];
  let minCityDist = distBqto;
  for (const city of REFERENCE_CITIES_LARA) {
    const d = haversineDistanceKm(city.lat, city.lon, lat, lon);
    if (d < minCityDist) {
      minCityDist = d;
      nearest = city;
    }
  }

  if (distBqto <= 15) {
    return {
      distanceKm: distBqto,
      text: `A ${distBqto} km (${dirBqto}) del campus IUJO Barquisimeto`,
    };
  }

  return {
    distanceKm: distBqto,
    text: `A ${distBqto} km al ${dirBqto} de Barquisimeto (cerca de ${nearest.name}, a ${minCityDist} km)`,
  };
}

export function getSeverity(mag: number): 'leve' | 'moderado' | 'fuerte' | 'severo' {
  if (mag >= 6.0) return 'severo';
  if (mag >= 5.0) return 'fuerte';
  if (mag >= 4.0) return 'moderado';
  return 'leve';
}

export async function fetchRecentQuakesForBarquisimeto(
  config: SeismicConfig,
  daysBack = 30
): Promise<QuakeEvent[]> {
  const startTime = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();
  const minMagFetch = Math.max(2.0, Math.min(config.minMagnitude, 2.5));
  const results: QuakeEvent[] = [];

  // 1. Primary Source: USGS FDSN Event Web Service (GeoJSON)
  const usgsUrl = new URL('https://earthquake.usgs.gov/fdsnws/event/1/query');
  usgsUrl.searchParams.set('format', 'geojson');
  usgsUrl.searchParams.set('latitude', String(config.latitude));
  usgsUrl.searchParams.set('longitude', String(config.longitude));
  usgsUrl.searchParams.set('maxradiuskm', String(config.maxRadiusKm));
  usgsUrl.searchParams.set('minmagnitude', String(minMagFetch));
  usgsUrl.searchParams.set('starttime', startTime);
  usgsUrl.searchParams.set('orderby', 'time');
  usgsUrl.searchParams.set('limit', '35');

  // 2. Secondary Source: EMSC / SeismicPortal FDSN API
  const maxRadiusDeg = Math.max(1, Math.min(10, config.maxRadiusKm / 111.12));
  const emscUrl = new URL('https://www.seismicportal.eu/fdsnws/event/1/query');
  emscUrl.searchParams.set('format', 'json');
  emscUrl.searchParams.set('lat', String(config.latitude));
  emscUrl.searchParams.set('lon', String(config.longitude));
  emscUrl.searchParams.set('maxradius', maxRadiusDeg.toFixed(2));
  emscUrl.searchParams.set('minmag', String(minMagFetch));
  emscUrl.searchParams.set('starttime', startTime);
  emscUrl.searchParams.set('limit', '35');

  const [usgsRes, emscRes] = await Promise.allSettled([
    fetch(usgsUrl.toString(), {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    }),
    fetch(emscUrl.toString(), {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    }),
  ]);

  if (usgsRes.status === 'fulfilled' && usgsRes.value.ok) {
    try {
      const data = await usgsRes.value.json();
      if (Array.isArray(data.features)) {
        for (const feat of data.features) {
          const props = feat.properties || {};
          const geom = feat.geometry || {};
          const coords = Array.isArray(geom.coordinates) ? geom.coordinates : [0, 0, 0];
          const lon = Number(coords[0]);
          const lat = Number(coords[1]);
          const depthKm = Math.round(Number(coords[2] || 0) * 10) / 10;
          const mag = Math.round(Number(props.mag || 0) * 10) / 10;
          const timestamp = Number(props.time || Date.now());
          const ref = buildBarquisimetoReference(lat, lon, config.latitude, config.longitude);

          results.push({
            id: `usgs-${feat.id}`,
            magnitude: mag,
            place: props.place || 'Región Centro-Occidental de Venezuela',
            time: new Date(timestamp).toISOString(),
            timestamp,
            depthKm,
            latitude: lat,
            longitude: lon,
            distanceFromBqtoKm: ref.distanceKm,
            referenceBqto: ref.text,
            source: 'USGS',
            url: props.url || `https://www.google.com/maps?q=${lat},${lon}`,
            severity: getSeverity(mag),
          });
        }
      }
    } catch {
      // ignore parse error
    }
  }

  if (emscRes.status === 'fulfilled' && emscRes.value.ok) {
    try {
      const data = await emscRes.value.json();
      if (Array.isArray(data.features)) {
        for (const feat of data.features) {
          const props = feat.properties || {};
          const geom = feat.geometry || {};
          const coords = Array.isArray(geom.coordinates) ? geom.coordinates : [0, 0, 0];
          const lon = Number(coords[0]);
          const lat = Number(coords[1]);
          const depthKm = Math.round(Math.abs(Number(coords[2] || props.depth || 0)) * 10) / 10;
          const mag = Math.round(Number(props.mag || 0) * 10) / 10;
          const timestamp = new Date(props.time || Date.now()).getTime();

          // Deduplicate against USGS if within 90 seconds and 60 km
          const isDuplicate = results.some(
            (existing) =>
              Math.abs(existing.timestamp - timestamp) < 90_000 &&
              haversineDistanceKm(existing.latitude, existing.longitude, lat, lon) < 60
          );

          if (!isDuplicate) {
            const ref = buildBarquisimetoReference(lat, lon, config.latitude, config.longitude);
            results.push({
              id: `emsc-${feat.id || props.unid || timestamp}`,
              magnitude: mag,
              place: props.flynn_region || 'Occidente de Venezuela / Lara',
              time: new Date(timestamp).toISOString(),
              timestamp,
              depthKm,
              latitude: lat,
              longitude: lon,
              distanceFromBqtoKm: ref.distanceKm,
              referenceBqto: ref.text,
              source: 'EMSC',
              url: `https://www.google.com/maps?q=${lat},${lon}`,
              severity: getSeverity(mag),
            });
          }
        }
      }
    } catch {
      // ignore parse error
    }
  }

  return results.sort((a, b) => b.timestamp - a.timestamp);
}

export function formatQuakeTelegramAlert(quake: QuakeEvent, isSimulation = false): string {
  const dateStr = new Intl.DateTimeFormat('es-VE', {
    dateStyle: 'medium',
    timeStyle: 'medium',
    timeZone: 'America/Caracas',
  }).format(new Date(quake.timestamp));

  const badge =
    quake.magnitude >= 5.0
      ? '🔴 <b>ALERTA SÍSMICA MAYOR - IUJO BARQUISIMETO</b>'
      : quake.magnitude >= 4.0
      ? '🟠 <b>ALERTA SÍSMICA PREVENTIVA - IUJO BARQUISIMETO</b>'
      : '🟡 <b>REPORTE SÍSMICO REGIONAL - IUJO BARQUISIMETO</b>';

  const simHeader = isSimulation
    ? '🧪 <b>[SIMULACRO DE PRUEBA - NO ES UN EVENTO REAL]</b>\n\n'
    : '';

  const mapsLink = `https://www.google.com/maps?q=${quake.latitude},${quake.longitude}`;

  return (
    `${simHeader}${badge}\n\n` +
    `📉 <b>Magnitud:</b> ${quake.magnitude.toFixed(1)} Mw\n` +
    `📍 <b>Referencia Sede:</b> ${quake.referenceBqto}\n` +
    `🗺️ <b>Zona epicentral:</b> ${quake.place}\n` +
    `⬇️ <b>Profundidad:</b> ${quake.depthKm} km\n` +
    `🕒 <b>Hora (Venezuela):</b> ${dateStr}\n` +
    `🛰️ <b>Fuente:</b> ${quake.source}\n\n` +
    `🛡️ <b>Protocolo IUJO Barquisimeto:</b>\n` +
    `• Mantén la calma, aléjate de ventanas y objetos que puedan caer.\n` +
    `• Si estás en los edificios del campus, dirígete a las zonas despejadas de seguridad.\n\n` +
    `🔗 <a href="${mapsLink}">Ver epicentro en el mapa</a>`
  );
}

