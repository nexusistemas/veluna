import { cleanCep } from '../lib/geoCep';
import { supabase } from '../lib/supabase';
import type { DeliveryZone, StoreSettings } from '../types/database';

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function normalizeZoneRow(row: DeliveryZone): DeliveryZone {
  return {
    ...row,
    delivery_fee: Number(row.delivery_fee) || 0,
  };
}

export async function updateLogisticsSettings(payload: Partial<StoreSettings>): Promise<void> {
  const updateBody: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (payload.pickup_enabled !== undefined) updateBody.pickup_enabled = payload.pickup_enabled;
  if (payload.pickup_address !== undefined) {
    updateBody.pickup_address = payload.pickup_address?.trim() || null;
  }
  if (payload.pickup_instructions !== undefined) {
    updateBody.pickup_instructions = payload.pickup_instructions?.trim() || null;
  }
  if (payload.delivery_enabled !== undefined) updateBody.delivery_enabled = payload.delivery_enabled;
  if (payload.delivery_mode !== undefined) updateBody.delivery_mode = payload.delivery_mode;
  if (payload.store_cep !== undefined) {
    const cleaned = cleanCep(payload.store_cep ?? '');
    updateBody.store_cep = cleaned || null;
  }
  if (payload.store_lat !== undefined) updateBody.store_lat = toNullableNumber(payload.store_lat);
  if (payload.store_lng !== undefined) updateBody.store_lng = toNullableNumber(payload.store_lng);
  if (payload.max_radius_km !== undefined) {
    updateBody.max_radius_km = Math.max(0, Number(payload.max_radius_km) || 0);
  }
  if (payload.radius_base_fee !== undefined) {
    updateBody.radius_base_fee = Math.max(0, Number(payload.radius_base_fee) || 0);
  }
  if (payload.radius_km_fee !== undefined) {
    updateBody.radius_km_fee = Math.max(0, Number(payload.radius_km_fee) || 0);
  }
  if (payload.free_shipping_min !== undefined) {
    const parsed = toNullableNumber(payload.free_shipping_min);
    updateBody.free_shipping_min = parsed !== null && parsed > 0 ? parsed : null;
  }

  const { error } = await supabase.from('store_settings').update(updateBody).eq('id', 1);
  if (error) throw new Error(error.message);
}

export async function listDeliveryZonesAdmin(): Promise<DeliveryZone[]> {
  const { data, error } = await supabase
    .from('delivery_zones')
    .select('*')
    .order('city', { ascending: true })
    .order('neighborhood', { ascending: true, nullsFirst: true });

  if (error) throw new Error(error.message);
  return ((data ?? []) as DeliveryZone[]).map(normalizeZoneRow);
}

export async function listActiveDeliveryZonesPublic(): Promise<DeliveryZone[]> {
  const { data, error } = await supabase
    .from('delivery_zones')
    .select('*')
    .eq('is_active', true)
    .order('city', { ascending: true })
    .order('neighborhood', { ascending: true, nullsFirst: true });

  if (error) throw new Error(error.message);
  return ((data ?? []) as DeliveryZone[]).map(normalizeZoneRow);
}

export async function saveDeliveryZone(
  zone: Partial<DeliveryZone> & { city: string; state: string; delivery_fee: number },
): Promise<void> {
  const city = zone.city.trim();
  const state = zone.state.trim().toUpperCase().slice(0, 2);
  if (!city || state.length !== 2) {
    throw new Error('Informe a cidade e a sigla do estado (2 letras).');
  }

  const neighborhood = zone.neighborhood?.trim() ? zone.neighborhood.trim() : null;
  const payload = {
    city,
    state,
    neighborhood,
    delivery_fee: Math.max(0, Number(zone.delivery_fee) || 0),
    estimated_time: zone.estimated_time?.trim() || null,
    is_active: zone.is_active ?? true,
  };

  if (zone.id) {
    const { error } = await supabase.from('delivery_zones').update(payload).eq('id', zone.id);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await supabase.from('delivery_zones').insert(payload);
  if (error) throw new Error(error.message);
}

export async function deleteDeliveryZone(id: string): Promise<void> {
  const { error } = await supabase.from('delivery_zones').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
