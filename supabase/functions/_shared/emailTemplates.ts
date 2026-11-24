export type OrderEmailEvent = 'order_created' | 'payment_approved' | 'status_updated';

export interface EmailOrderRow {
  id: string;
  order_number: string | number;
  public_access_token: string;
  channel: string;
  status: string;
  fulfillment_type: string;
  payment_method: string;
  payment_status: string;
  customer_name: string;
  customer_phone?: string | null;
  customer_whatsapp?: string | null;
  customer_email?: string | null;
  customer_user_id?: string | null;
  shipping_address?: string | null;
  shipping_street?: string | null;
  shipping_number?: string | null;
  shipping_neighborhood?: string | null;
  shipping_city?: string | null;
  shipping_state?: string | null;
  coupon_code?: string | null;
  subtotal: number;
  discount_amount: number;
  shipping_fee: number;
  total: number;
  notes?: string | null;
}

export interface EmailOrderItemRow {
  product_name?: string | null;
  product_name_snapshot?: string | null;
  variant_name?: string | null;
  variant_name_snapshot?: string | null;
  quantity: number;
  line_total: number;
}

export interface EmailStoreSettingsRow {
  store_name?: string | null;
  pickup_address?: string | null;
  pickup_instructions?: string | null;
}

function esc(raw: unknown): string {
  return String(raw ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    Number.isFinite(Number(value)) ? Number(value) : 0,
  );
}

function normalizeWaPhone(raw: string): string {
  const digits = (raw ?? '').replace(/\D/g, '');
  if (!digits) return '';
  return (digits.length === 10 || digits.length === 11) && !digits.startsWith('55') ? `55${digits}` : digits;
}

function resolveAddressText(order: EmailOrderRow): string {
  if (order.shipping_address?.trim()) return order.shipping_address.trim();
  const parts = [
    order.shipping_street ? `${order.shipping_street}${order.shipping_number ? `, ${order.shipping_number}` : ''}` : '',
    order.shipping_neighborhood ?? '',
    order.shipping_city ? `${order.shipping_city}${order.shipping_state ? ` - ${order.shipping_state}` : ''}` : '',
  ].filter(Boolean);
  return parts.join(', ') || 'Endereço cadastrado no pedido';
}

function buildItemsTable(items: EmailOrderItemRow[]): string {
  const rows = items
    .map((item) => {
      const prod = esc(item.product_name ?? item.product_name_snapshot ?? 'Cosmético');
      const variant = (item.variant_name ?? item.variant_name_snapshot ?? '').trim();
      const variantHtml = variant ? `<div style="font-size:12px;color:#78716c;">${esc(variant)}</div>` : '';
      return `<tr>
        <td style="padding:10px 8px;border-bottom:1px solid #f5f5f4;font-size:13px;color:#1c1917;"><strong>${Number(item.quantity) || 1}x</strong> ${prod}${variantHtml}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #f5f5f4;font-size:13px;font-weight:700;color:#1c1917;text-align:right;white-space:nowrap;">${formatBRL(Number(item.line_total))}</td>
      </tr>`;
    })
    .join('');

  return `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:14px 0;">
    <thead><tr>
      <th align="left" style="padding:8px;background:#fff1f2;color:#9d174d;font-size:12px;border-radius:8px 0 0 8px;">Produto / Opção</th>
      <th align="right" style="padding:8px;background:#fff1f2;color:#9d174d;font-size:12px;border-radius:0 8px 8px 0;">Subtotal</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function buildTotalsBlock(order: EmailOrderRow): string {
  const discountRow =
    Number(order.discount_amount) > 0
      ? `<tr><td style="padding:3px 0;font-size:13px;color:#047857;">Desconto${order.coupon_code ? ` (${esc(order.coupon_code)})` : ''}</td><td align="right" style="padding:3px 0;font-size:13px;font-weight:700;color:#047857;">-${formatBRL(Number(order.discount_amount))}</td></tr>`
      : '';
  const feeText = Number(order.shipping_fee) === 0 ? 'Grátis' : formatBRL(Number(order.shipping_fee));
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
    <tr><td style="padding:3px 0;font-size:13px;color:#57534e;">Subtotal</td><td align="right" style="padding:3px 0;font-size:13px;color:#1c1917;">${formatBRL(Number(order.subtotal))}</td></tr>
    ${discountRow}
    <tr><td style="padding:3px 0;font-size:13px;color:#57534e;">Frete</td><td align="right" style="padding:3px 0;font-size:13px;color:#1c1917;">${feeText}</td></tr>
    <tr><td style="padding:10px 0 0;font-size:16px;font-weight:800;color:#1c1917;border-top:1px solid #e7e5e4;">Total</td><td align="right" style="padding:10px 0 0;font-size:16px;font-weight:800;color:#db2777;border-top:1px solid #e7e5e4;">${formatBRL(Number(order.total))}</td></tr>
  </table>`;
}

function wrapLayout(storeName: string, badge: string, title: string, bodyHtml: string): string {
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;padding:24px 12px;background:#fff1f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1c1917;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:20px;border:1px solid #fbcfe8;overflow:hidden;">
    <tr><td style="background:#db2777;padding:22px 24px;text-align:center;">
      <div style="font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:#fce7f3;">${esc(badge)}</div>
      <div style="font-size:21px;font-weight:800;color:#ffffff;margin-top:4px;">${esc(storeName)}</div>
    </td></tr>
    <tr><td style="padding:24px;">
      <h1 style="margin:0 0 12px;font-size:19px;font-weight:800;color:#1c1917;">${esc(title)}</h1>
      ${bodyHtml}
    </td></tr>
    <tr><td style="padding:16px 24px;background:#fafaf9;text-align:center;font-size:11px;color:#78716c;border-top:1px solid #f5f5f4;">
      ${esc(storeName)} • Enviado automaticamente pelo sistema de pedidos
    </td></tr>
  </table></body></html>`;
}

export function buildAdminOrderEmailHtml(
  order: EmailOrderRow,
  items: EmailOrderItemRow[],
  storeName: string,
  event: OrderEmailEvent,
  siteOrigin: string,
): { subject: string; html: string } {
  const totalLabel = formatBRL(Number(order.total));
  const isPaid = event === 'payment_approved';
  const subject = isPaid
    ? `✅ PAGO — Separar Pedido #${order.order_number} (${order.customer_name})`
    : `🛍️ Novo Pedido #${order.order_number} no Site — ${totalLabel}`;

  const phone = order.customer_phone || order.customer_whatsapp || '';
  const waDigits = normalizeWaPhone(phone);
  const waBtn = waDigits
    ? `<a href="https://wa.me/${waDigits}" style="display:inline-block;margin:6px 8px 6px 0;padding:11px 18px;border-radius:12px;background:#059669;color:#ffffff;font-size:13px;font-weight:700;text-decoration:none;">Chamar Cliente no WhatsApp</a>`
    : '';
  const fulfillment =
    order.fulfillment_type === 'pickup' ? 'Retirada na Loja' : `Entrega: ${resolveAddressText(order)}`;
  const panelUrl = `${siteOrigin.replace(/\/+$/, '')}/#/painel/pedidos`;

  const body = `
    <p style="margin:0 0 14px;font-size:14px;color:#44403c;line-height:1.5;">
      ${isPaid ? 'Pagamento confirmado! Você já pode separar os cosméticos deste pedido.' : 'Um novo pedido acabou de chegar na sua loja online.'}
    </p>
    <div style="background:#fafaf9;border:1px solid #e7e5e4;border-radius:14px;padding:14px;font-size:13px;line-height:1.6;color:#292524;">
      <div><strong>Pedido:</strong> #${esc(order.order_number)}</div>
      <div><strong>Cliente:</strong> ${esc(order.customer_name)}</div>
      ${phone ? `<div><strong>WhatsApp:</strong> ${esc(phone)}</div>` : ''}
      <div><strong>Modalidade:</strong> ${esc(fulfillment)}</div>
      ${order.notes ? `<div><strong>Obs:</strong> ${esc(order.notes)}</div>` : ''}
    </div>
    ${buildItemsTable(items)}
    ${buildTotalsBlock(order)}
    <div style="margin-top:20px;text-align:center;">
      ${waBtn}
      <a href="${esc(panelUrl)}" style="display:inline-block;margin:6px 0;padding:11px 18px;border-radius:12px;background:#db2777;color:#ffffff;font-size:13px;font-weight:700;text-decoration:none;">Abrir Painel de Pedidos</a>
    </div>`;

  return {
    subject,
    html: wrapLayout(storeName, isPaid ? 'Pagamento Aprovado' : 'Nova Venda Online', `Pedido #${order.order_number}`, body),
  };
}

export function buildCustomerOrderEmailHtml(
  order: EmailOrderRow,
  items: EmailOrderItemRow[],
  storeSettings: EmailStoreSettingsRow,
  event: OrderEmailEvent,
  siteOrigin: string,
): { subject: string; html: string } {
  const storeName = storeSettings.store_name || 'Veluna Cosméticos';
  let subject = `🛍️ Comprovante do Pedido #${order.order_number} — ${storeName}`;
  let headline = `Recebemos o seu pedido #${order.order_number}!`;
  let intro = `Olá, ${order.customer_name}! Obrigada por comprar na ${storeName}. Abaixo estão os detalhes do seu pedido.`;

  if (event === 'payment_approved') {
    subject = `✅ Pagamento Confirmado — Pedido #${order.order_number} (${storeName})`;
    headline = `Pagamento confirmado! 💖`;
    intro = `Olá, ${order.customer_name}! Recebemos a confirmação do seu pagamento e já estamos cuidando do seu pedido #${order.order_number}.`;
  } else if (event === 'status_updated') {
    const map: Record<string, { s: string; h: string; i: string }> = {
      preparing: { s: `💖 Pedido #${order.order_number} em separação`, h: 'Estamos separando seus cosméticos!', i: 'Seu pedido está sendo separado com todo carinho pela nossa equipe.' },
      ready: { s: `🛍️ Pedido #${order.order_number} pronto para retirada`, h: 'Pronto para retirada na loja!', i: 'Seus produtos já estão embalados e esperando por você.' },
      ready_for_pickup: { s: `🛍️ Pedido #${order.order_number} pronto para retirada`, h: 'Pronto para retirada na loja!', i: 'Seus produtos já estão embalados e esperando por você.' },
      out_for_delivery: { s: `🛵 Pedido #${order.order_number} saiu para entrega`, h: 'Seu pedido saiu para entrega!', i: 'Fique de olho — seu pedido está a caminho do seu endereço.' },
      delivered: { s: `✨ Pedido #${order.order_number} concluído`, h: 'Pedido concluído! ✨', i: `Esperamos que você ame cada produto escolhido na ${storeName}!` },
      completed: { s: `✨ Pedido #${order.order_number} concluído`, h: 'Pedido concluído! ✨', i: `Esperamos que você ame cada produto escolhido na ${storeName}!` },
      cancelled: { s: `ℹ️ Pedido #${order.order_number} cancelado`, h: 'Pedido cancelado', i: 'Passando para confirmar que este pedido foi cancelado. Se precisar de ajuda, fale conosco pelo WhatsApp.' },
    };
    const chosen = map[order.status];
    if (chosen) {
      subject = `${chosen.s} — ${storeName}`;
      headline = chosen.h;
      intro = `Olá, ${order.customer_name}! ${chosen.i}`;
    }
  }

  const locationHtml =
    order.fulfillment_type === 'pickup'
      ? `<strong>Retirada na Loja:</strong> ${esc(storeSettings.pickup_address || 'Combine o local pelo WhatsApp')}${storeSettings.pickup_instructions ? `<div style="margin-top:4px;color:#57534e;">${esc(storeSettings.pickup_instructions)}</div>` : ''}`
      : `<strong>Entrega:</strong> ${esc(resolveAddressText(order))}`;
  const receiptUrl = `${siteOrigin.replace(/\/+$/, '')}/#/pedido/${order.id}?token=${encodeURIComponent(order.public_access_token)}`;

  const body = `
    <p style="margin:0 0 14px;font-size:14px;color:#44403c;line-height:1.6;">${esc(intro)}</p>
    <div style="background:#fff1f2;border:1px solid #fbcfe8;border-radius:14px;padding:13px;font-size:13px;color:#831843;line-height:1.5;">${locationHtml}</div>
    ${buildItemsTable(items)}
    ${buildTotalsBlock(order)}
    <div style="margin-top:22px;text-align:center;">
      <a href="${esc(receiptUrl)}" style="display:inline-block;padding:13px 22px;border-radius:14px;background:#db2777;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;">Acompanhar Pedido / Ver Comprovante</a>
    </div>`;

  return { subject, html: wrapLayout(storeName, `Pedido #${order.order_number}`, headline, body) };
}

export function buildTestEmailHtml(storeName: string, siteOrigin: string): { subject: string; html: string } {
  const body = `
    <p style="margin:0 0 14px;font-size:14px;color:#44403c;line-height:1.6;">
      Parabéns! A integração de e-mails da <strong>${esc(storeName)}</strong> com a API do <strong>Resend</strong> está funcionando perfeitamente.
    </p>
    <div style="margin-top:18px;text-align:center;">
      <a href="${esc(siteOrigin)}" style="display:inline-block;padding:12px 20px;border-radius:12px;background:#db2777;color:#ffffff;font-size:13px;font-weight:700;text-decoration:none;">Abrir Loja Online</a>
    </div>`;
  return {
    subject: `✨ Teste de E-mail — ${storeName}`,
    html: wrapLayout(storeName, 'Teste de Conexão Resend', 'E-mails ativos com sucesso!', body),
  };
}
