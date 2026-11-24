import { formatBRL, onlyDigits } from '../lib/formatters';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { FulfillmentType, OrderStatus, PaymentMethod, PaymentStatus } from '../types/database';

export interface OrderReceiptTextItem {
  product_name: string;
  variant_name?: string | null;
  quantity: number;
  line_total: number;
}

export interface OrderReceiptTextParams {
  storeName: string;
  orderNumber: string | number;
  customerName: string;
  items: OrderReceiptTextItem[];
  subtotal: number;
  discountAmount?: number;
  shippingFee: number;
  total: number;
  fulfillmentType: FulfillmentType;
  shippingAddress?: string | null;
  pickupAddress?: string | null;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  notes?: string | null;
}

export interface OrderStatusUpdateTextParams {
  storeName: string;
  orderNumber: string | number;
  customerName: string;
  status: OrderStatus;
  fulfillmentType: FulfillmentType;
  pickupAddress?: string | null;
}

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  pix_mp: 'Pix (Mercado Pago)',
  card_mp: 'Cartão de Crédito (Online)',
  whatsapp_combine: 'Combinar pelo WhatsApp',
  pos_pix_mp: 'Pix QR no Balcão (Mercado Pago)',
  pos_card_presential: 'Cartão Presencial / Point Tap',
  pos_cash: 'Dinheiro',
  pix: 'Pix',
  credit_card: 'Cartão de Crédito',
  debit_card: 'Cartão de Débito',
  cash: 'Dinheiro',
};

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Pendente',
  approved: 'Aprovado ✅',
  rejected: 'Recusado',
  refunded: 'Estornado',
  cancelled: 'Cancelado',
};

export function normalizeWhatsappBR(rawPhone: string): string {
  const digits = onlyDigits(rawPhone);
  if (!digits) return '';
  if ((digits.length === 10 || digits.length === 11) && !digits.startsWith('55')) {
    return `55${digits}`;
  }
  return digits;
}

export function buildOrderReceiptText(params: OrderReceiptTextParams): string {
  const {
    storeName,
    orderNumber,
    customerName,
    items,
    subtotal,
    discountAmount = 0,
    shippingFee,
    total,
    fulfillmentType,
    shippingAddress,
    pickupAddress,
    paymentMethod,
    paymentStatus,
    notes,
  } = params;

  const itemLines = items.map((item) => {
    const variantSuffix = item.variant_name ? ` (${item.variant_name})` : '';
    return `• ${item.quantity}x ${item.product_name}${variantSuffix} — ${formatBRL(item.line_total)}`;
  });

  const fulfillmentLabel =
    fulfillmentType === 'in_store'
      ? 'Compra Presencial no Balcão'
      : fulfillmentType === 'pickup'
        ? `Retirada na Loja${pickupAddress ? ` (${pickupAddress})` : ''}`
        : `Entrega: ${shippingAddress || 'Endereço cadastrado no pedido'}`;

  const fulfillmentHeading =
    fulfillmentType === 'in_store'
      ? 'Atendimento'
      : fulfillmentType === 'pickup'
        ? 'Retirada'
        : 'Entrega';

  const methodLabel = PAYMENT_METHOD_LABELS[paymentMethod] ?? paymentMethod;
  const statusLabel = PAYMENT_STATUS_LABELS[paymentStatus] ?? paymentStatus;

  const lines: Array<string | null> = [
    `✨ *${storeName}*`,
    `🛍️ *Pedido #${orderNumber}*`,
    '',
    `👤 *Cliente:* ${customerName}`,
    `📦 *${fulfillmentHeading}:* ${fulfillmentLabel}`,
    '',
    '*Itens do pedido:*',
    ...itemLines,
    '',
    `Subtotal: ${formatBRL(subtotal)}`,
    discountAmount > 0 ? `Desconto: -${formatBRL(discountAmount)}` : null,
    fulfillmentType === 'in_store'
      ? null
      : `Frete: ${shippingFee === 0 ? 'Grátis' : formatBRL(shippingFee)}`,
    `💖 *Total: ${formatBRL(total)}*`,
    '',
    `💳 *Pagamento:* ${methodLabel}`,
    `📌 *Status do pagamento:* ${statusLabel}`,
    notes?.trim() ? `📝 *Obs:* ${notes.trim()}` : null,
  ];

  return lines.filter((line): line is string => line !== null).join('\n');
}

export function buildOrderStatusUpdateText(params: OrderStatusUpdateTextParams): string {
  const { storeName, orderNumber, customerName, status, fulfillmentType, pickupAddress } = params;
  const firstName = customerName.trim().split(/\s+/)[0] || 'cliente';
  const addressSuffix = pickupAddress?.trim() ? `\n📍 *Endereço:* ${pickupAddress.trim()}` : '';

  let body = `Seu pedido *#${orderNumber}* foi atualizado.`;

  switch (status) {
    case 'paid':
    case 'confirmed':
      body = `✅ Recebemos a confirmação do seu pagamento do pedido *#${orderNumber}*! Ele já está indo para a separação.`;
      break;
    case 'preparing':
      body = `💖 Estamos separando os seus cosméticos do pedido *#${orderNumber}* com todo carinho! Em breve te avisamos assim que ficar pronto.`;
      break;
    case 'ready_for_pickup':
    case 'ready':
      body = `🛍️ Ótima notícia! Seu pedido *#${orderNumber}* já está *pronto para retirada* na loja.${addressSuffix}`;
      break;
    case 'out_for_delivery':
      body = `🛵 Seu pedido *#${orderNumber}* acabou de *sair para entrega*! Fique de olho que logo chega até você.`;
      break;
    case 'completed':
    case 'delivered':
      body =
        fulfillmentType === 'in_store'
          ? `✨ Muito obrigada pela sua compra na *${storeName}* (Pedido *#${orderNumber}*)! Esperamos que você ame os seus cosméticos. Qualquer dúvida, estamos por aqui! 💖`
          : `✨ Pedido *#${orderNumber}* finalizado! Muito obrigada por escolher a *${storeName}*. Esperamos que você ame cada produto! 💖`;
      break;
    case 'pending_payment':
    case 'pending':
      body = `⏳ Seu pedido *#${orderNumber}* está reservado e aguardando a confirmação do pagamento. Se precisar de ajuda ou do código Pix novamente, é só me chamar aqui!`;
      break;
    case 'cancelled':
      body = `ℹ️ Passando para avisar que o pedido *#${orderNumber}* foi cancelado. Se quiser refazer ou tirar alguma dúvida, estou à disposição!`;
      break;
  }

  return [`✨ *${storeName}*`, `Olá, ${firstName}!`, '', body].join('\n');
}

export function buildCustomerToStoreWaUrl(storePhone: string, text: string): string {
  const normalized = normalizeWhatsappBR(storePhone);
  if (!normalized) return '';
  return `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`;
}

export function buildStoreToCustomerWaUrl(customerPhone: string, text: string): string {
  const normalized = normalizeWhatsappBR(customerPhone);
  if (!normalized) return '';
  return `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`;
}

export function triggerAutoWhatsappNotification(
  orderId: string,
  publicToken: string,
  event: 'order_created',
): void {
  if (!isSupabaseConfigured || !orderId || !publicToken) return;
  void supabase.functions
    .invoke('notify-order-whatsapp', {
      body: {
        order_id: orderId,
        public_access_token: publicToken,
        event,
      },
    })
    .catch(() => {});
}
