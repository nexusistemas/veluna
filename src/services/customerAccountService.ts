import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type {
  CustomerOrderItemSummary,
  CustomerOrderSummary,
  CustomerProfile,
} from '../types/customer';
import type { FulfillmentType, OrderStatus, PaymentMethod, PaymentStatus } from '../types/database';

function buildFallbackProfile(
  userId: string,
  fallbackMeta?: { name?: string; email?: string },
): CustomerProfile {
  return {
    user_id: userId,
    full_name: fallbackMeta?.name?.trim() ?? '',
    email: fallbackMeta?.email?.trim() ?? '',
    whatsapp: '',
    cpf: '',
    cep: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
  };
}

export async function getMyCustomerProfile(
  userId: string,
  fallbackMeta?: { name?: string; email?: string },
): Promise<CustomerProfile> {
  const fallback = buildFallbackProfile(userId, fallbackMeta);
  if (!isSupabaseConfigured || !userId) return fallback;

  const { data, error } = await supabase
    .from('customer_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Não foi possível carregar seu perfil.');
  }

  if (!data) return fallback;

  const row = data as Partial<CustomerProfile>;
  return {
    user_id: userId,
    full_name: row.full_name?.trim() || fallback.full_name,
    email: row.email?.trim() || fallback.email,
    whatsapp: row.whatsapp ?? '',
    cpf: row.cpf ?? '',
    cep: row.cep ?? '',
    street: row.street ?? '',
    number: row.number ?? '',
    complement: row.complement ?? '',
    neighborhood: row.neighborhood ?? '',
    city: row.city ?? '',
    state: row.state ?? '',
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function saveMyCustomerProfile(
  profile: Omit<CustomerProfile, 'created_at' | 'updated_at'>,
): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase não configurado neste ambiente.');
  }

  const payload = {
    user_id: profile.user_id,
    full_name: profile.full_name.trim(),
    email: profile.email.trim(),
    whatsapp: profile.whatsapp.trim(),
    cpf: profile.cpf.trim(),
    cep: profile.cep.trim(),
    street: profile.street.trim(),
    number: profile.number.trim(),
    complement: profile.complement.trim(),
    neighborhood: profile.neighborhood.trim(),
    city: profile.city.trim(),
    state: profile.state.trim().toUpperCase(),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('customer_profiles')
    .upsert(payload, { onConflict: 'user_id' });

  if (error) {
    throw new Error(error.message || 'Não foi possível salvar seus dados.');
  }
}

function normalizeOrderItem(raw: Record<string, unknown>): CustomerOrderItemSummary {
  return {
    product_id: raw.product_id ? String(raw.product_id) : null,
    variant_id: raw.variant_id ? String(raw.variant_id) : null,
    product_name: String(raw.product_name ?? ''),
    variant_name: String(raw.variant_name ?? ''),
    quantity: Number(raw.quantity ?? 0) || 0,
    unit_price: Number(raw.unit_price ?? 0) || 0,
    line_total: Number(raw.line_total ?? 0) || 0,
  };
}

export async function fetchMyCustomerOrders(): Promise<CustomerOrderSummary[]> {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase.rpc('get_my_customer_orders');
  if (error) {
    throw new Error(error.message || 'Não foi possível carregar seu histórico de pedidos.');
  }

  if (!Array.isArray(data)) return [];

  return data.map((entry) => {
    const row = entry as Record<string, unknown>;
    const rawItems = Array.isArray(row.items) ? row.items : [];
    return {
      id: String(row.id ?? ''),
      order_number: Number(row.order_number ?? 0) || 0,
      public_access_token: String(row.public_access_token ?? ''),
      status: (row.status as OrderStatus) ?? 'pending_payment',
      payment_method: (row.payment_method as PaymentMethod) ?? 'pix_mp',
      payment_status: (row.payment_status as PaymentStatus) ?? 'pending',
      fulfillment_type: (row.fulfillment_type as FulfillmentType) ?? 'delivery',
      shipping_street: String(row.shipping_street ?? ''),
      shipping_number: String(row.shipping_number ?? ''),
      shipping_neighborhood: String(row.shipping_neighborhood ?? ''),
      shipping_city: String(row.shipping_city ?? ''),
      shipping_state: String(row.shipping_state ?? ''),
      subtotal: Number(row.subtotal ?? 0) || 0,
      discount_amount: Number(row.discount_amount ?? 0) || 0,
      shipping_fee: Number(row.shipping_fee ?? 0) || 0,
      total: Number(row.total ?? 0) || 0,
      created_at: String(row.created_at ?? ''),
      items: rawItems.map((item) => normalizeOrderItem(item as Record<string, unknown>)),
    };
  });
}
