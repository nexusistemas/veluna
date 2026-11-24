import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';

export type WhatsappNotifyEvent = 'order_created' | 'payment_approved' | 'test';

export interface NotifyOrderWhatsappParams {
  serviceClient: SupabaseClient;
  orderId?: string;
  event: WhatsappNotifyEvent;
  forceTest?: boolean;
  testPhone?: string;
}

export interface NotifyOrderWhatsappResult {
  ok: boolean;
  skipped?: boolean;
  message: string;
}

const METHOD_LABELS: Record<string, string> = {
  pix_mp: 'Pix (Mercado Pago)',
  card_mp: 'Cartão de Crédito (Online)',
  whatsapp_combine: 'Combinar pelo WhatsApp',
  pix: 'Pix',
  credit_card: 'Cartão de Crédito',
  debit_card: 'Cartão de Débito',
  cash: 'Dinheiro',
};

function normalizePhoneBR(raw: string): string {
  const digits = (raw ?? '').replace(/\D/g, '');
  if (!digits) return '';
  if ((digits.length === 10 || digits.length === 11) && !digits.startsWith('55')) {
    return `55${digits}`;
  }
  return digits;
}

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    Number.isFinite(value) ? value : 0,
  );
}

async function dispatchWebhookMessage(params: {
  webhookUrl: string;
  webhookToken: string | null;
  number: string;
  text: string;
  event: WhatsappNotifyEvent;
  orderNumber?: string;
  total?: number;
}): Promise<{ ok: boolean; detail: string }> {
  const { webhookUrl, webhookToken, number, text, event, orderNumber, total } = params;
  const isEvolution = webhookUrl.toLowerCase().includes('/message/sendtext');

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (webhookToken) {
    if (isEvolution) {
      headers.apikey = webhookToken;
    } else {
      headers.Authorization = `Bearer ${webhookToken}`;
      headers['x-webhook-token'] = webhookToken;
    }
  }

  const body = isEvolution
    ? { number, text }
    : {
        number,
        phone: number,
        text,
        message: text,
        event,
        order_number: orderNumber ?? null,
        total: total ?? null,
      };

  const resp = await fetch(webhookUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    return { ok: false, detail: `Webhook respondeu HTTP ${resp.status}: ${errText.slice(0, 180)}` };
  }
  return { ok: true, detail: 'Mensagem enviada com sucesso!' };
}

export async function notifyOrderWhatsapp(
  params: NotifyOrderWhatsappParams,
): Promise<NotifyOrderWhatsappResult> {
  const { serviceClient, orderId, event, forceTest = false, testPhone } = params;

  const [settingsRes, secretsRes] = await Promise.all([
    serviceClient.from('store_settings').select('store_name, whatsapp_number, whatsapp_auto_enabled, pickup_address').eq('id', 1).maybeSingle(),
    serviceClient.from('private_secrets').select('whatsapp_webhook_url, whatsapp_webhook_token').eq('id', 1).maybeSingle(),
  ]);

  const settings = settingsRes.data as {
    store_name?: string;
    whatsapp_number?: string | null;
    whatsapp_auto_enabled?: boolean;
    pickup_address?: string | null;
  } | null;
  const secrets = secretsRes.data as {
    whatsapp_webhook_url?: string | null;
    whatsapp_webhook_token?: string | null;
  } | null;

  const webhookUrl = secrets?.whatsapp_webhook_url?.trim() ?? '';
  const webhookToken = secrets?.whatsapp_webhook_token?.trim() || null;
  const storeName = settings?.store_name || 'Veluna Cosméticos';

  if (!forceTest && (!settings?.whatsapp_auto_enabled || !webhookUrl)) {
    return { ok: true, skipped: true, message: 'Automação desligada ou webhook não configurado.' };
  }

  if (!webhookUrl) {
    return { ok: false, message: 'Salve a URL do Webhook do WhatsApp antes de testar.' };
  }

  if (event === 'test') {
    const target = normalizePhoneBR(testPhone ?? settings?.whatsapp_number ?? '');
    if (!target) {
      return { ok: false, message: 'Número de destino inválido para teste.' };
    }
    const text = `✨ *${storeName}*\n✅ Teste de automação de WhatsApp funcionando perfeitamente!\nEnviado em: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`;
    const sent = await dispatchWebhookMessage({
      webhookUrl,
      webhookToken,
      number: target,
      text,
      event: 'test',
    });
    return { ok: sent.ok, message: sent.detail };
  }

  if (!orderId) return { ok: false, message: 'order_id ausente.' };

  const [orderRes, itemsRes] = await Promise.all([
    serviceClient.from('orders').select('*').eq('id', orderId).maybeSingle(),
    serviceClient.from('order_items').select('*').eq('order_id', orderId),
  ]);

  const order = orderRes.data as Record<string, unknown> | null;
  if (!order) return { ok: false, message: 'Pedido não encontrado.' };

  const items = (itemsRes.data ?? []) as Array<Record<string, unknown>>;
  const headerTitle =
    event === 'payment_approved' ? '✅ *Pagamento Aprovado!*' : '🛍️ *Pedido Recebido!*';

  const itemLines = items.map((i) => {
    const variant = i.variant_name ? ` (${String(i.variant_name)})` : '';
    return `• ${Number(i.quantity)}x ${String(i.product_name)}${variant} — ${formatBRL(Number(i.line_total))}`;
  });

  const fulfillmentLine =
    order.fulfillment_type === 'pickup'
      ? `Retirada na Loja${settings?.pickup_address ? ` (${settings.pickup_address})` : ''}`
      : `Entrega: ${String(order.shipping_address || 'Endereço cadastrado')}`;

  const text = [
    `✨ *${storeName}*`,
    headerTitle,
    `📦 *Pedido #${String(order.order_number)}*`,
    `👤 *Cliente:* ${String(order.customer_name)}`,
    `🚚 *Modalidade:* ${fulfillmentLine}`,
    '',
    '*Itens:*',
    ...itemLines,
    '',
    `Subtotal: ${formatBRL(Number(order.subtotal))}`,
    Number(order.discount_amount) > 0 ? `Desconto: -${formatBRL(Number(order.discount_amount))}` : null,
    `Frete: ${Number(order.shipping_fee) === 0 ? 'Grátis' : formatBRL(Number(order.shipping_fee))}`,
    `💖 *Total: ${formatBRL(Number(order.total))}*`,
    `💳 *Pagamento:* ${METHOD_LABELS[String(order.payment_method)] ?? String(order.payment_method)}`,
  ]
    .filter((line): line is string => line !== null)
    .join('\n');

  const recipients = Array.from(
    new Set(
      [
        normalizePhoneBR(String(order.customer_phone ?? '')),
        normalizePhoneBR(String(settings?.whatsapp_number ?? '')),
      ].filter(Boolean),
    ),
  );

  if (recipients.length === 0) {
    return { ok: true, skipped: true, message: 'Nenhum telefone de destino encontrado.' };
  }

  let anySent = false;
  let lastDetail = 'Falha ao enviar mensagem.';
  for (const number of recipients) {
    const res = await dispatchWebhookMessage({
      webhookUrl,
      webhookToken,
      number,
      text,
      event,
      orderNumber: String(order.order_number),
      total: Number(order.total),
    });
    if (res.ok) anySent = true;
    lastDetail = res.detail;
  }

  if (anySent) {
    await serviceClient
      .from('orders')
      .update({ whatsapp_notified: true })
      .eq('id', orderId)
      .then(() => {})
      .catch(() => {});
  }

  return { ok: anySent, message: anySent ? 'Notificação WhatsApp enviada.' : lastDetail };
}
