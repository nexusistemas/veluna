import { onlyDigits } from '../lib/formatters';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { PrivateSecrets, StoreSettings } from '../types/database';

const EMPTY_SECRETS: PrivateSecrets = {
  id: 1,
  mp_access_token: null,
  mp_webhook_secret: null,
  mp_point_device_id: null,
  whatsapp_webhook_url: null,
  whatsapp_webhook_token: null,
  updated_at: '',
};

function normalizeSecretsRow(raw: Partial<PrivateSecrets> | null): PrivateSecrets {
  if (!raw) return EMPTY_SECRETS;
  return {
    id: raw.id ?? 1,
    mp_access_token: raw.mp_access_token ?? null,
    mp_webhook_secret: raw.mp_webhook_secret ?? null,
    mp_point_device_id: raw.mp_point_device_id ?? null,
    whatsapp_webhook_url: raw.whatsapp_webhook_url ?? null,
    whatsapp_webhook_token: raw.whatsapp_webhook_token ?? null,
    updated_at: raw.updated_at ?? '',
  };
}

export async function fetchPrivateSecretsAdmin(): Promise<PrivateSecrets> {
  if (!isSupabaseConfigured) return EMPTY_SECRETS;

  const { data, error } = await supabase
    .from('private_secrets')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (error) throw new Error(error.message);

  if (!data) {
    const { data: inserted, error: upsertError } = await supabase
      .from('private_secrets')
      .upsert({ id: 1, updated_at: new Date().toISOString() }, { onConflict: 'id' })
      .select('*')
      .single();

    if (upsertError) throw new Error(upsertError.message);
    return normalizeSecretsRow(inserted as Partial<PrivateSecrets>);
  }

  return normalizeSecretsRow(data as Partial<PrivateSecrets>);
}

export async function saveGeneralStoreSettings(payload: Partial<StoreSettings>): Promise<void> {
  const updateBody: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (payload.store_name !== undefined) {
    const cleanName = payload.store_name.trim();
    if (!cleanName) throw new Error('Informe o nome da loja.');
    updateBody.store_name = cleanName;
  }
  if (payload.logo_url !== undefined) updateBody.logo_url = payload.logo_url?.trim() || null;
  if (payload.primary_color !== undefined) {
    updateBody.primary_color = payload.primary_color.trim() || '#db2777';
  }
  if (payload.whatsapp_number !== undefined) {
    const digits = onlyDigits(payload.whatsapp_number ?? '');
    updateBody.whatsapp_number = digits || null;
  }
  if (payload.instagram_handle !== undefined) {
    const cleanHandle = (payload.instagram_handle ?? '').trim().replace(/^@+/, '');
    updateBody.instagram_handle = cleanHandle || null;
  }
  if (payload.mp_public_key !== undefined) {
    updateBody.mp_public_key = payload.mp_public_key?.trim() || null;
  }
  if (payload.whatsapp_auto_enabled !== undefined) {
    updateBody.whatsapp_auto_enabled = Boolean(payload.whatsapp_auto_enabled);
  }

  const { error } = await supabase.from('store_settings').update(updateBody).eq('id', 1);
  if (error) throw new Error(error.message);
}

export async function savePrivateSecretsAdmin(payload: Partial<PrivateSecrets>): Promise<void> {
  const upsertBody: Record<string, unknown> = {
    id: 1,
    updated_at: new Date().toISOString(),
  };

  if (payload.mp_access_token !== undefined) {
    upsertBody.mp_access_token = payload.mp_access_token?.trim() || null;
  }
  if (payload.mp_webhook_secret !== undefined) {
    upsertBody.mp_webhook_secret = payload.mp_webhook_secret?.trim() || null;
  }
  if (payload.mp_point_device_id !== undefined) {
    upsertBody.mp_point_device_id = payload.mp_point_device_id?.trim() || null;
  }
  if (payload.whatsapp_webhook_url !== undefined) {
    upsertBody.whatsapp_webhook_url = payload.whatsapp_webhook_url?.trim() || null;
  }
  if (payload.whatsapp_webhook_token !== undefined) {
    upsertBody.whatsapp_webhook_token = payload.whatsapp_webhook_token?.trim() || null;
  }

  const { error } = await supabase
    .from('private_secrets')
    .upsert(upsertBody, { onConflict: 'id' });
  if (error) throw new Error(error.message);
}

export async function sendTestWhatsappWebhook(
  testPhone: string,
): Promise<{ ok: boolean; message: string }> {
  const digits = onlyDigits(testPhone);
  if (digits.length < 10) {
    return { ok: false, message: 'Informe um número de WhatsApp válido com DDD para o teste.' };
  }

  if (!isSupabaseConfigured) {
    return { ok: false, message: 'Supabase não está configurado neste ambiente.' };
  }

  try {
    const { data, error } = await supabase.functions.invoke('notify-order-whatsapp', {
      body: { event: 'test', test_phone: digits },
    });

    if (error) {
      let detail = error.message;
      const ctx = (error as { context?: { json?: () => Promise<unknown> } }).context;
      if (ctx && typeof ctx.json === 'function') {
        try {
          const errBody = (await ctx.json()) as { error?: string; message?: string } | null;
          detail = errBody?.error || errBody?.message || detail;
        } catch {
          // Mantém mensagem original
        }
      }
      return {
        ok: false,
        message:
          detail.includes('Failed to send a request') || detail.includes('404')
            ? 'Edge Function notify-order-whatsapp ainda não publicada no Supabase.'
            : detail,
      };
    }

    const res = data as { ok?: boolean; message?: string; error?: string } | null;
    if (res?.ok) {
      return { ok: true, message: res.message || 'Mensagem de teste disparada com sucesso!' };
    }
    return { ok: false, message: res?.error || res?.message || 'Não foi possível enviar o teste.' };
  } catch {
    return {
      ok: false,
      message: 'Não foi possível alcançar a Edge Function notify-order-whatsapp. Verifique o deploy.',
    };
  }
}
