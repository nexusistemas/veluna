import {
  calculateHaversineKm,
  cleanCep,
  normalizeLocationText,
  resolveCepWithCoords,
  type ResolvedCepAddress,
} from '../lib/geoCep';
import type { DeliveryZone, StoreSettings } from '../types/database';

export type ShippingRuleSource = 'pickup' | 'zone_neighborhood' | 'zone_city' | 'radius';

export interface ShippingQuoteOption {
  id: 'pickup' | 'delivery';
  fulfillmentType: 'pickup' | 'delivery';
  title: string;
  subtitle: string;
  fee: number;
  originalFee: number;
  isFreeShipping: boolean;
  estimatedTime: string;
  distanceKm: number | null;
  ruleSource: ShippingRuleSource;
}

export interface ShippingCalculationResult {
  address: ResolvedCepAddress | null;
  options: ShippingQuoteOption[];
  deliveryUnavailableReason: string | null;
}

function round2(value: number): number {
  return Math.round(Number(value) * 100) / 100;
}

function buildDeliveryOption(params: {
  address: ResolvedCepAddress;
  rawFee: number;
  subtotal: number;
  settings: StoreSettings;
  estimatedTime: string;
  distanceKm: number | null;
  ruleSource: Exclude<ShippingRuleSource, 'pickup'>;
}): ShippingQuoteOption {
  const originalFee = round2(Math.max(0, Number(params.rawFee) || 0));
  const freeMin =
    params.settings.free_shipping_min !== null && params.settings.free_shipping_min !== undefined
      ? Number(params.settings.free_shipping_min)
      : 0;
  const isFreeShipping = freeMin > 0 && Number(params.subtotal) >= freeMin;
  const fee = isFreeShipping ? 0 : originalFee;

  const locationParts = [params.address.neighborhood, `${params.address.city} - ${params.address.state}`]
    .filter(Boolean)
    .join(', ');
  const distanceLabel = params.distanceKm !== null ? ` • ${params.distanceKm.toFixed(2)} km` : '';

  return {
    id: 'delivery',
    fulfillmentType: 'delivery',
    title: isFreeShipping ? 'Entrega — Frete Grátis' : 'Entrega em Domicílio',
    subtitle: `${locationParts}${distanceLabel}`,
    fee,
    originalFee,
    isFreeShipping,
    estimatedTime: params.estimatedTime,
    distanceKm: params.distanceKm,
    ruleSource: params.ruleSource,
  };
}

function findMatchingZone(
  address: ResolvedCepAddress,
  activeZones: DeliveryZone[],
): { zone: DeliveryZone; ruleSource: 'zone_neighborhood' | 'zone_city' } | null {
  const targetState = normalizeLocationText(address.state);
  const targetCity = normalizeLocationText(address.city);
  const targetNeighborhood = normalizeLocationText(address.neighborhood);

  const cityZones = activeZones.filter(
    (z) =>
      z.is_active &&
      normalizeLocationText(z.state) === targetState &&
      normalizeLocationText(z.city) === targetCity,
  );

  if (targetNeighborhood) {
    const exactNeighborhood = cityZones.find(
      (z) =>
        Boolean(z.neighborhood?.trim()) &&
        normalizeLocationText(z.neighborhood) === targetNeighborhood,
    );
    if (exactNeighborhood) {
      return { zone: exactNeighborhood, ruleSource: 'zone_neighborhood' };
    }
  }

  const cityWide = cityZones.find((z) => !z.neighborhood || !z.neighborhood.trim());
  if (cityWide) {
    return { zone: cityWide, ruleSource: 'zone_city' };
  }

  return null;
}

function evaluateRadiusDelivery(
  address: ResolvedCepAddress,
  settings: StoreSettings,
): { ok: true; fee: number; distanceKm: number } | { ok: false; reason: string } {
  const storeLat = settings.store_lat !== null ? Number(settings.store_lat) : null;
  const storeLng = settings.store_lng !== null ? Number(settings.store_lng) : null;

  if (storeLat === null || storeLng === null || !Number.isFinite(storeLat) || !Number.isFinite(storeLng)) {
    return {
      ok: false,
      reason: 'A localização da loja (latitude/longitude) ainda não foi configurada para cálculo por raio.',
    };
  }

  if (address.lat === null || address.lng === null) {
    return {
      ok: false,
      reason: 'Não foi possível localizar as coordenadas deste CEP para calcular a distância em KM.',
    };
  }

  const distanceKm = calculateHaversineKm(storeLat, storeLng, address.lat, address.lng);
  const maxRadiusKm = Number(settings.max_radius_km) || 0;

  if (distanceKm > maxRadiusKm) {
    return {
      ok: false,
      reason: `Endereço fora do raio de entrega (${distanceKm.toFixed(2)} km; limite máximo de ${maxRadiusKm} km).`,
    };
  }

  const baseFee = Number(settings.radius_base_fee) || 0;
  const perKmFee = Number(settings.radius_km_fee) || 0;
  const fee = round2(baseFee + distanceKm * perKmFee);
  return { ok: true, fee, distanceKm };
}

export async function calculateShippingQuote(params: {
  rawCep?: string;
  subtotal: number;
  settings: StoreSettings;
  activeZones: DeliveryZone[];
}): Promise<ShippingCalculationResult> {
  const { rawCep, subtotal, settings, activeZones } = params;
  const options: ShippingQuoteOption[] = [];

  if (settings.pickup_enabled) {
    options.push({
      id: 'pickup',
      fulfillmentType: 'pickup',
      title: 'Retirar na Loja',
      subtitle: settings.pickup_address || 'Endereço informado após confirmação',
      fee: 0,
      originalFee: 0,
      isFreeShipping: false,
      estimatedTime: settings.pickup_instructions || 'Combine o horário pelo WhatsApp',
      distanceKm: null,
      ruleSource: 'pickup',
    });
  }

  if (!settings.delivery_enabled) {
    return {
      address: null,
      options,
      deliveryUnavailableReason: 'A entrega em domicílio está temporariamente desativada.',
    };
  }

  const cleanedCep = cleanCep(rawCep ?? '');
  if (cleanedCep.length !== 8) {
    return { address: null, options, deliveryUnavailableReason: null };
  }

  const address = await resolveCepWithCoords(cleanedCep);
  const mode = settings.delivery_mode;

  if (mode === 'zones' || mode === 'both') {
    const matched = findMatchingZone(address, activeZones);
    if (matched) {
      const distanceKm =
        settings.store_lat !== null &&
        settings.store_lng !== null &&
        address.lat !== null &&
        address.lng !== null
          ? calculateHaversineKm(
              Number(settings.store_lat),
              Number(settings.store_lng),
              address.lat,
              address.lng,
            )
          : null;

      options.push(
        buildDeliveryOption({
          address,
          rawFee: Number(matched.zone.delivery_fee) || 0,
          subtotal,
          settings,
          estimatedTime: matched.zone.estimated_time || 'Entrega local combinada',
          distanceKm,
          ruleSource: matched.ruleSource,
        }),
      );
      return { address, options, deliveryUnavailableReason: null };
    }

    if (mode === 'zones') {
      return {
        address,
        options,
        deliveryUnavailableReason: `Ainda não atendemos entrega para ${address.neighborhood ? `${address.neighborhood}, ` : ''}${address.city} - ${address.state}.`,
      };
    }
  }

  const radiusEval = evaluateRadiusDelivery(address, settings);
  if (!radiusEval.ok) {
    return { address, options, deliveryUnavailableReason: radiusEval.reason };
  }

  options.push(
    buildDeliveryOption({
      address,
      rawFee: radiusEval.fee,
      subtotal,
      settings,
      estimatedTime: 'Entrega expressa por distância',
      distanceKm: radiusEval.distanceKm,
      ruleSource: 'radius',
    }),
  );

  return { address, options, deliveryUnavailableReason: null };
}
