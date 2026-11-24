import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { OrderStatus, PaymentStatus } from '../types/database';

export interface PixPaymentResponse {
  ok: boolean;
  mp_payment_id: string | null;
  qr_code: string | null;
  qr_code_base64: string | null;
  status: string;
  payment_status?: PaymentStatus;
}

export interface CardPaymentResponse {
  ok: boolean;
  mp_payment_id: string | null;
  status: string;
  status_detail?: string | null;
  payment_status: PaymentStatus;
}

export interface CheckoutPreferenceResponse {
  ok: boolean;
  init_point: string;
  preference_id?: string | null;
}

export interface SyncPaymentStatusResponse {
  ok: boolean;
  payment_status: PaymentStatus;
  order_status?: OrderStatus;
  mp_status?: string | null;
}

async function extractFunctionErrorMessage(error: unknown): Promise<string> {
  if (error && typeof error === 'object' && 'context' in error) {
    const context = (error as { context?: { json?: () => Promise<unknown> } }).context;
    if (context && typeof context.json === 'function') {
      try {
        const body = (await context.json()) as { error?: string; message?: string } | null;
        if (body?.error) return body.error;
        if (body?.message) return body.message;
      } catch {
        // Ignora falha ao ler corpo JSON
      }
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Não foi possível comunicar com o servidor de pagamentos.';
}

async function invokeMpCreatePayment<T>(body: Record<string, unknown>): Promise<T> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase não configurado neste ambiente.');
  }

  const { data, error } = await supabase.functions.invoke('mp-create-payment', { body });
  if (error) {
    throw new Error(await extractFunctionErrorMessage(error));
  }

  const parsed = data as (T & { error?: string }) | null;
  if (!parsed) {
    throw new Error('Resposta vazia do serviço de pagamentos.');
  }
  if (parsed.error) {
    throw new Error(parsed.error);
  }

  return parsed;
}

export function generatePixPayment(
  orderId: string,
  publicToken?: string,
): Promise<PixPaymentResponse> {
  return invokeMpCreatePayment<PixPaymentResponse>({
    action: 'pix',
    order_id: orderId,
    public_access_token: publicToken,
  });
}

export function processCardPayment(
  orderId: string,
  cardFormData: Record<string, unknown>,
  publicToken?: string,
): Promise<CardPaymentResponse> {
  return invokeMpCreatePayment<CardPaymentResponse>({
    action: 'card',
    order_id: orderId,
    public_access_token: publicToken,
    card_form_data: cardFormData,
  });
}

export function createCheckoutPreferenceLink(
  orderId: string,
  publicToken?: string,
): Promise<CheckoutPreferenceResponse> {
  return invokeMpCreatePayment<CheckoutPreferenceResponse>({
    action: 'preference',
    order_id: orderId,
    public_access_token: publicToken,
  });
}

export function syncOrderPaymentStatus(
  orderId: string,
  publicToken?: string,
): Promise<SyncPaymentStatusResponse> {
  return invokeMpCreatePayment<SyncPaymentStatusResponse>({
    action: 'sync_status',
    order_id: orderId,
    public_access_token: publicToken,
  });
}
