export interface ResolvedCepAddress {
  cep: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  lat: number | null;
  lng: number | null;
}

const cepMemoryCache = new Map<string, ResolvedCepAddress>();

export function cleanCep(raw: string): string {
  return (raw ?? '').replace(/\D/g, '').slice(0, 8);
}

export function formatCep(raw: string): string {
  const digits = cleanCep(raw);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function normalizeLocationText(text: string | null | undefined): string {
  return (text ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function parseCoord(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

async function fetchNominatimCoords(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ lat?: string; lon?: string }>;
    const first = rows?.[0];
    if (!first) return null;
    const lat = parseCoord(first.lat);
    const lng = parseCoord(first.lon);
    return lat !== null && lng !== null ? { lat, lng } : null;
  } catch {
    return null;
  }
}

async function fetchFromBrasilApi(cep: string): Promise<ResolvedCepAddress | null> {
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      street?: string;
      neighborhood?: string;
      city?: string;
      state?: string;
      location?: { coordinates?: { latitude?: string | number; longitude?: string | number } };
    };
    if (!data.city || !data.state) return null;
    return {
      cep,
      street: data.street ?? '',
      neighborhood: data.neighborhood ?? '',
      city: data.city,
      state: data.state.toUpperCase(),
      lat: parseCoord(data.location?.coordinates?.latitude),
      lng: parseCoord(data.location?.coordinates?.longitude),
    };
  } catch {
    return null;
  }
}

async function fetchFromViaCep(cep: string): Promise<ResolvedCepAddress> {
  const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
  if (!res.ok) {
    throw new Error('Não foi possível consultar o CEP no momento. Tente novamente.');
  }
  const data = (await res.json()) as {
    erro?: boolean | string;
    logradouro?: string;
    bairro?: string;
    localidade?: string;
    uf?: string;
  };
  if (data.erro === true || data.erro === 'true' || !data.localidade || !data.uf) {
    throw new Error('CEP não encontrado. Confira os 8 números.');
  }
  return {
    cep,
    street: data.logradouro ?? '',
    neighborhood: data.bairro ?? '',
    city: data.localidade,
    state: data.uf.toUpperCase(),
    lat: null,
    lng: null,
  };
}

export async function resolveCepWithCoords(rawCep: string): Promise<ResolvedCepAddress> {
  const cep = cleanCep(rawCep);
  if (cep.length !== 8) {
    throw new Error('Digite um CEP válido com 8 números.');
  }

  const cached = cepMemoryCache.get(cep);
  if (cached) return cached;

  let resolved = await fetchFromBrasilApi(cep);
  if (!resolved) {
    resolved = await fetchFromViaCep(cep);
  }

  if (resolved.lat === null || resolved.lng === null) {
    const fullQuery = [resolved.street, resolved.city, resolved.state, 'Brasil']
      .filter(Boolean)
      .join(', ');
    let coords = resolved.street ? await fetchNominatimCoords(fullQuery) : null;
    if (!coords) {
      coords = await fetchNominatimCoords(`${resolved.city}, ${resolved.state}, Brasil`);
    }
    if (coords) {
      resolved = { ...resolved, lat: coords.lat, lng: coords.lng };
    }
  }

  cepMemoryCache.set(cep, resolved);
  return resolved;
}

export function calculateHaversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(Number(lat2) - Number(lat1));
  const dLng = toRad(Number(lng2) - Number(lng1));
  const radLat1 = toRad(Number(lat1));
  const radLat2 = toRad(Number(lat2));

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(earthRadiusKm * c * 100) / 100;
}
