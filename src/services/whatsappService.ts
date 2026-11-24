import { formatBRL, onlyDigits } from '../lib/formatters';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { FulfillmentType, PaymentMethod, PaymentStatus } from '../types/database';

export interface OrderReceiptTextItem {
  product_name: string;
  variant_name?: string | null;
  quantity: number;
  line_total: number;
}

export interface OrderReceiptTextParams {
  storeName: string;
  orderNumber: string;
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

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  pix_mp: 'Pix (Mercado Pago)',
  card_mp: 'Cartão de Crédito (Online)',
  whatsapp_combine: 'Combinar pelo WhatsApp',
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
    fulfillmentType === 'pickup'
      ? `Retirada na Loja${pickupAddress ? ` (${pickupAddress})` : ''}`
      : `Entrega: ${shippingAddress || 'Endereço cadastrado no pedido'}`;

  const methodLabel = PAYMENT_METHOD_LABELS[paymentMethod] ?? paymentMethod;
  const statusLabel = PAYMENT_STATUS_LABELS[paymentStatus] ?? paymentStatus;

  const lines: Array<string | null> = [
    `✨ *${storeName}*`,
    `🛍️ *Pedido #${orderNumber}*`,
    '',
    `👤 *Cliente:* ${customerName}`,
    `📦 *${fulfillmentType === 'pickup' ? 'Retirada' : 'Entrega'}:* ${fulfillmentLabel}`,
    '',
    '*Itens do pedido:*',
    ...itemLines,
    '',
    `Subtotal: ${formatBRL(subtotal)}`,
    discountAmount > 0 ? `Desconto: -${formatBRL(discountAmount)}` : null,
    `Frete: ${shippingFee === 0 ? 'Grátis' : formatBRL(shippingFee)}`,
    `💖 *Total: ${formatBRL(total)}*`,
    '',
    `💳 *Pagamento:* ${methodLabel}`,
    `📌 *Status do pagamento:* ${statusLabel}`,
    notes?.trim() ? `📝 *Obs:* ${notes.trim()}` : null,
  ];

  return lines.filter((line): line is string => line !== null).join('\n');
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
