import { Loader2, MessageCircle, Trash2 } from 'lucide-react';
import { formatBRL, onlyDigits } from '../../../lib/formatters';
import type { AdminOrderWithItems } from '../../../services/ordersAdminService';
import {
  buildOrderReceiptText,
  buildStoreToCustomerWaUrl,
} from '../../../services/whatsappService';
import type { OrderStatus } from '../../../types/database';

interface OrderListCardProps {
  order: AdminOrderWithItems;
  storeName: string;
  pickupAddress: string | null;
  onManage: (orderId: string) => void;
  onDelete: (order: AdminOrderWithItems) => void;
  deleting?: boolean;
}

const STATUS_BADGE: Record<OrderStatus, { label: string; cls: string }> = {
  pending: { label: 'Pendente', cls: 'bg-amber-100 text-amber-800' },
  pending_payment: { label: 'Aguard. Pgto', cls: 'bg-amber-100 text-amber-800' },
  paid: { label: 'Pago', cls: 'bg-emerald-100 text-emerald-800' },
  confirmed: { label: 'Confirmado', cls: 'bg-emerald-100 text-emerald-800' },
  preparing: { label: 'Separando', cls: 'bg-sky-100 text-sky-800' },
  ready: { label: 'Pronto Retirada', cls: 'bg-indigo-100 text-indigo-800' },
  ready_for_pickup: { label: 'Pronto Retirada', cls: 'bg-indigo-100 text-indigo-800' },
  out_for_delivery: { label: 'Em Entrega', cls: 'bg-violet-100 text-violet-800' },
  delivered: { label: 'Entregue', cls: 'bg-stone-200 text-stone-800' },
  completed: { label: 'Concluído', cls: 'bg-stone-200 text-stone-800' },
  cancelled: { label: 'Cancelado', cls: 'bg-rose-100 text-rose-800' },
};

export default function OrderListCard({
  order,
  storeName,
  pickupAddress,
  onManage,
  onDelete,
  deleting = false,
}: OrderListCardProps) {
  const badge = STATUS_BADGE[order.status] ?? {
    label: order.status,
    cls: 'bg-stone-100 text-stone-700',
  };
  const isPos = order.channel === 'pos' || order.channel === 'pdv';
  const totalUnits = order.order_items.reduce((acc, item) => acc + item.quantity, 0);

  const waUrl =
    onlyDigits(order.customer_phone ?? '').length >= 10
      ? buildStoreToCustomerWaUrl(
          order.customer_phone ?? '',
          buildOrderReceiptText({
            storeName,
            orderNumber: order.order_number,
            customerName: order.customer_name,
            items: order.order_items,
            subtotal: order.subtotal,
            discountAmount: order.discount_amount,
            shippingFee: order.shipping_fee,
            total: order.total,
            fulfillmentType: order.fulfillment_type,
            shippingAddress: order.shipping_address,
            pickupAddress,
            paymentMethod: order.payment_method,
            paymentStatus: order.payment_status,
            notes: order.notes,
          }),
        )
      : '';

  return (
    <article className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-extrabold text-brand">#{order.order_number}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${badge.cls}`}>
              {badge.label}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                isPos ? 'bg-violet-100 text-violet-800' : 'bg-sky-100 text-sky-800'
              }`}
            >
              {isPos ? 'PDV' : 'Site'}
            </span>
          </div>
          <p className="mt-1 truncate text-sm font-bold text-stone-900">{order.customer_name}</p>
          <p className="text-[11px] text-stone-500">
            {totalUnits} {totalUnits === 1 ? 'item' : 'itens'} •{' '}
            {new Date(order.created_at).toLocaleString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
        <p className="shrink-0 text-base font-extrabold text-stone-900">
          {formatBRL(order.total)}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {waUrl && (
          <a
            href={waUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700"
          >
            <MessageCircle className="h-4 w-4" />
            Comprovante WhatsApp
          </a>
        )}
        <button
          type="button"
          onClick={() => onManage(order.id)}
          className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 px-3 text-xs font-bold text-stone-800 hover:border-brand-200 hover:text-brand"
        >
          Gerenciar
        </button>
        <button
          type="button"
          disabled={deleting}
          onClick={() => onDelete(order)}
          aria-label={`Excluir pedido #${order.order_number} definitivamente`}
          className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
        >
          {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          <span>Excluir</span>
        </button>
      </div>
    </article>
  );
}
