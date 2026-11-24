import { cleanCep, normalizeLocationText } from './geoCep';

export interface ResolvedGpsLocation {
  cep: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  formattedAddress: string;
}

const BR_STATE_UF: Record<string, string> = {
  acre: 'AC', alagoas: 'AL', amapa: 'AP', amazonas: 'AM', bahia: 'BA',
  ceara: 'CE', 'distrito federal': 'DF', 'espirito santo': 'ES', goias: 'GO',
  maranhao: 'MA', 'mato grosso': 'MT', 'mato grosso do sul': 'MS',
  'minas gerais': 'MG', para: 'PA', paraiba: 'PB', parana: 'PR',
  pernambuco: 'PE', piaui: 'PI', 'rio de janeiro': 'RJ',
  'rio grande do norte': 'RN', 'rio grande do sul': 'RS', rondonia: 'RO',
  roraima: 'RR', 'santa catarina': 'SC', 'sao paulo': 'SP', sergipe: 'SE',
  tocantins: 'TO',
};

function resolveStateUf(addr: Record<string, string | undefined>): string {
  const iso = addr['ISO3166-2-lvl4'] ?? '';
  const isoMatch = /^BR-([A-Z]{2})$/i.exec(iso.trim());
  if (isoMatch) return isoMatch[1].toUpperCase();
  const rawState = (addr.state ?? '').trim();
  if (/^[A-Za-z]{2}$/.test(rawState)) return rawState.toUpperCase();
  return BR_STATE_UF[normalizeLocationText(rawState)] ?? rawState.slice(0, 2).toUpperCase();
}

export async function reverseGeocodeCoords(lat: number, lng: number): Promise<ResolvedGpsLocation> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&addressdetails=1&zoom=18`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'pt-BR,pt;q=0.9' } });
  if (!res.ok) {
    throw new Error('Não foi possível identificar o endereço desse ponto no mapa.');
  }

  const data = (await res.json()) as {
    display_name?: string;
    address?: Record<string, string | undefined>;
  };
  const addr = data.address ?? {};

  const cep = cleanCep(addr.postcode ?? '');
  const street = (addr.road ?? addr.pedestrian ?? addr.residential ?? addr.footway ?? '').trim();
  const number = (addr.house_number ?? '').trim();
  const neighborhood = (
    addr.suburb ??
    addr.neighbourhood ??
    addr.quarter ??
    addr.city_district ??
    addr.hamlet ??
    ''
  ).trim();
  const city = (
    addr.city ??
    addr.town ??
    addr.municipality ??
    addr.village ??
    addr.county ??
    ''
  ).trim();
  const state = resolveStateUf(addr);

  const shortLabel = [
    street ? `${street}${number ? `, ${number}` : ''}` : null,
    neighborhood || null,
    city ? `${city}${state ? ` - ${state}` : ''}` : null,
  ]
    .filter(Boolean)
    .join(' • ');

  return {
    cep,
    street,
    number,
    neighborhood,
    city,
    state,
    lat,
    lng,
    formattedAddress: shortLabel || data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
  };
}

export function requestBrowserGps(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Seu navegador não suporta GPS. Arraste o alfinete no mapa para marcar sua casa.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(new Error('Permissão de GPS negada. Libere a localização no navegador ou arraste o alfinete no mapa.'));
          return;
        }
        if (err.code === err.TIMEOUT) {
          reject(new Error('O GPS demorou para responder. Tente novamente ou ajuste o alfinete manualmente.'));
          return;
        }
        reject(new Error('Não foi possível obter sua localização pelo GPS. Arraste o alfinete no mapa.'));
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 15000 },
    );
  });
}

export function buildGoogleMapsUrl(params: {
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
}): string {
  const { lat, lng, address } = params;
  const cleanAddr = address?.trim() ?? '';
  if (lat !== null && lat !== undefined && lng !== null && lng !== undefined && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
    return `https://www.google.com/maps/dir/?api=1&destination=${Number(lat)},${Number(lng)}`;
  }
  if (cleanAddr) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanAddr)}`;
  }
  return '';
}

export function buildWazeUrl(params: {
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
}): string {
  const { lat, lng, address } = params;
  const cleanAddr = address?.trim() ?? '';
  if (lat !== null && lat !== undefined && lng !== null && lng !== undefined && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
    return `https://waze.com/ul?ll=${Number(lat)},${Number(lng)}&navigate=yes`;
  }
  if (cleanAddr) {
    return `https://waze.com/ul?q=${encodeURIComponent(cleanAddr)}&navigate=yes`;
  }
  return '';
}
