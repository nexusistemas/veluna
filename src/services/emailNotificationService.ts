import { isSupabaseConfigured, supabase } from '../lib/supabase';

export type EmailOrderEvent = 'order_created' | 'payment_approved' | 'status_updated';

export function triggerOrderEmailNotification(
  orderId: string,
  event: EmailOrderEvent,
  publicToken?: string,
): void {
  if (!isSupabaseConfigured || !orderId) return;
  try {
    void supabase.functions
      .invoke('notify-order-email', {
        body: {
          order_id: orderId,
          public_access_token: publicToken,
          event,
        },
      })
      .catch(() => {});
  } catch {
    // Fire-and-forget: nunca trava checkout ou painel
  }
}

export async function sendTestEmailAdmin(
  targetEmail: string,
): Promise<{ ok: boolean; message: string }> {
  const cleanEmail = targetEmail.trim();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { ok: false, message: 'Informe um e-mail de destino válido para o teste.' };
  }
  if (!isSupabaseConfigured) {
    return { ok: false, message: 'Supabase não está configurado neste ambiente.' };
  }

  try {
    const { data, error } = await supabase.functions.invoke('notify-order-email', {
      body: { event: 'test', test_email: cleanEmail },
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
            ? 'Edge Function notify-order-email ainda não publicada no Supabase.'
            : detail,
      };
    }

    const res = data as { ok?: boolean; message?: string; error?: string } | null;
    if (res?.ok) {
      return { ok: true, message: res.message || 'E-mail de teste enviado com sucesso!' };
    }
    return { ok: false, message: res?.error || res?.message || 'Não foi possível enviar o teste.' };
  } catch {
    return {
      ok: false,
      message: 'Não foi possível alcançar a Edge Function notify-order-email. Verifique o deploy.',
    };
  }
}
