import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { CustomerProfile } from '../types/customer';

export interface AdminCustomerRecord extends CustomerProfile {
  auth_provider: string;
  last_sign_in_at: string | null;
  orders_count: number;
  total_spent: number;
  last_order_at: string | null;
}

async function invokeAdminCustomers<T>(body: Record<string, unknown>): Promise<T> {
  if (!isSupabaseConfigured) throw new Error('Supabase não configurado.');
  const { data, error } = await supabase.functions.invoke('admin-customers', { body });

  if (error) {
    let msg = error.message;
    const ctx = (error as { context?: { json?: () => Promise<unknown> } }).context;
    if (ctx && typeof ctx.json === 'function') {
      try {
        const errBody = (await ctx.json()) as { error?: string; message?: string } | null;
        msg = errBody?.error || errBody?.message || msg;
      } catch {
        // Ignora parse
      }
    }
    throw new Error(msg);
  }

  const parsed = data as (T & { ok?: boolean; error?: string }) | null;
  if (!parsed || parsed.ok === false) {
    throw new Error(parsed?.error || 'Não foi possível concluir a operação.');
  }
  return parsed;
}

export async function listCustomersAdmin(): Promise<AdminCustomerRecord[]> {
  const res = await invokeAdminCustomers<{ customers: AdminCustomerRecord[] }>({ action: 'list' });
  return res.customers ?? [];
}

export async function updateCustomerAdmin(
  userId: string,
  profile: Omit<CustomerProfile, 'user_id' | 'created_at' | 'updated_at'>,
): Promise<void> {
  await invokeAdminCustomers({ action: 'update', user_id: userId, profile });
}

export async function resetCustomerPasswordAdmin(
  userId: string,
  newPassword: string,
): Promise<void> {
  await invokeAdminCustomers({
    action: 'reset_password',
    user_id: userId,
    new_password: newPassword,
  });
}

export async function deleteCustomerAdmin(userId: string): Promise<void> {
  await invokeAdminCustomers({ action: 'delete', user_id: userId });
}
