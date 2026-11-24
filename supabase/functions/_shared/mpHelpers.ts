import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';

export function getEnv(name: string): string {
  return Deno.env.get(name)?.trim() ?? '';
}

export function createServiceClient(): SupabaseClient {
  const supabaseUrl = getEnv('SUPABASE_URL');
  const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Variáveis SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes.');
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function isRequestAdmin(
  req: Request,
  serviceClient: SupabaseClient,
): Promise<boolean> {
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) return false;

  const supabaseUrl = getEnv('SUPABASE_URL');
  const anonKey = getEnv('SUPABASE_ANON_KEY');
  if (supabaseUrl && anonKey) {
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await userClient.rpc('is_admin');
    if (!error && data === true) return true;
  }

  const jwt = authHeader.slice(7).trim();
  if (!jwt) return false;
  const { data: userData, error: userErr } = await serviceClient.auth.getUser(jwt);
  if (userErr || !userData?.user?.id) return false;

  const { data: adminRow } = await serviceClient
    .from('admin_users')
    .select('id')
    .eq('user_id', userData.user.id)
    .eq('is_active', true)
    .maybeSingle();

  return Boolean(adminRow?.id);
}

export function mapMpStatusToPaymentStatus(
  mpStatus: string | undefined | null,
): 'pending' | 'approved' | 'rejected' | 'refunded' | 'cancelled' {
  switch ((mpStatus ?? '').toLowerCase()) {
    case 'approved':
      return 'approved';
    case 'rejected':
      return 'rejected';
    case 'refunded':
    case 'charged_back':
      return 'refunded';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'pending';
  }
}

export async function updateOrderPaymentSafe(
  serviceClient: SupabaseClient,
  order: { id: string; status: string },
  paymentStatus: 'pending' | 'approved' | 'rejected' | 'refunded' | 'cancelled',
  extraFields: Record<string, unknown> = {},
): Promise<string> {
  const now = new Date().toISOString();
  const baseUpdate: Record<string, unknown> = {
    ...extraFields,
    payment_status: paymentStatus,
    updated_at: now,
  };

  const canPromoteStatus =
    paymentStatus === 'approved' &&
    (order.status === 'pending_payment' || order.status === 'pending');

  if (!canPromoteStatus) {
    await serviceClient.from('orders').update(baseUpdate).eq('id', order.id);
    return order.status;
  }

  const { error: paidErr } = await serviceClient
    .from('orders')
    .update({ ...baseUpdate, status: 'paid' })
    .eq('id', order.id);

  if (!paidErr) return 'paid';

  const { error: confirmedErr } = await serviceClient
    .from('orders')
    .update({ ...baseUpdate, status: 'confirmed' })
    .eq('id', order.id);

  if (!confirmedErr) return 'confirmed';

  await serviceClient.from('orders').update(baseUpdate).eq('id', order.id);
  return order.status;
}
