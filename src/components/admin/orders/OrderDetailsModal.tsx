import { useState } from 'react';
import { Check, Copy, MapPin, Store, TrendingUp, X } from 'lucide-react';
import { formatBRL, formatPhoneBR } from '../../../lib/formatters';
import type { AdminOrderWithItems } from '../../../services/ordersAdminService';
import OrderActionsPanel from './OrderActionsPanel';

interface OrderDetailsModalProps {
  order: AdminOrderWithItems | null;
  storeName: string;
  pickupAddress: string | null;
  onClose: () => void;
  onOrderUpdated: () => void;
  onOrderDeleted: () => void;
}

export default function OrderDetailsModal({
  order,
  storeName,
  pickupAddress,
  onClose,
  onOrderUpdated,
  onOrderDeleted,
}: OrderDetailsModalProps) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedAddr, setCopiedAddr] = useState(false);

  if (!order) return null;

  const isPos = order.channel === 'pos' || order.channel === 'pdv';
  const orderCost =
    order.total_cost !== undefined && order.total_cost !== null
      ? Number(order.total_cost)
      : order.order_items.reduce(
          (acc, item) => acc + (Number(item.unit_cost) || 0) * (Number(item.quantity) || 0),
          0,
        );
  const netProfit = Math.max(0, order.subtotal - order.discount_amount) - orderCost;

  const handleCopyAddress = async () => {
    if (!order.shipping_address) return;
    try {
      await navigator.clipboard.writeText(order.shipping_address);
      setCopiedAddr(true);
      setTimeout(() => setCopiedAddr(false), 2000);
    } catch {
      // Ignora erro de clipboard
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-950/60 p-0 sm:p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Detalhes do pedido #${order.order_number}`}
    >
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white p-5 shadow-2xl space-y-4">
        <div className="flex items-start justify-between gap-3 border-b border-stone-100 pb-3">
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-extrabold uppercase tracking-wider text-brand">
                Pedido #{order.order_number}
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                  isPos ? 'bg-violet-100 text-violet-800' : 'bg-sky-100 text-sky-800'
                }`}
              >
                {isPos ? 'PDV Balcão' : 'Site Online'}
              </span>
            </div>
            <h2 className="mt-1 text-lg font-extrabold text-stone-900">{order.customer_name}</h2>
            <p className="text-xs text-stone-500">
              {order.customer_phone ? formatPhoneBR(order.customer_phone) : 'Sem WhatsApp'} •{' '}
              {new Date(order.created_at).toLocaleString('pt-BR')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar detalhes"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-stone-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-800">
            {errorMsg}
          </div>
        )}

        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3.5 space-y-2">
          <div className="flex items-center justify-between gap-2 text-xs font-bold text-stone-800">
            <span className="flex items-center gap-1.5">
              {order.fulfillment_type === 'delivery' ? (
                <MapPin className="h-4 w-4 text-brand" />
              ) : (
                <Store className="h-4 w-4 text-brand" />
              )}
              {order.fulfillment_type === 'delivery'
                ? 'Entrega no Endereço'
                : order.fulfillment_type === 'in_store'
                  ? 'Venda Presencial no Balcão'
                  : 'Retirada na Loja'}
            </span>
            {order.fulfillment_type === 'delivery' && order.shipping_address && (
              <button
                type="button"
                onClick={() => void handleCopyAddress()}
                className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-stone-200 bg-white px-2.5 text-[11px] font-semibold text-stone-700"
              >
                {copiedAddr ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedAddr ? 'Copiado' : 'Copiar'}
              </button>
            )}
          </div>
          <p className="text-xs text-stone-600">
            {order.fulfillment_type === 'delivery'
              ? order.shipping_address || 'Endereço não informado'
              : order.fulfillment_type === 'in_store'
                ? 'Cliente retirou os produtos na hora no balcão.'
                : pickupAddress || 'Cliente retirará no endereço da loja.'}
          </p>
          {order.notes && <p className="text-xs italic text-stone-600">Obs: {order.notes}</p>}
        </div>

        <div className="rounded-2xl border border-stone-200 p-3.5 space-y-2 text-xs">
          <p className="font-bold text-stone-800">Itens Comprados</p>
          {order.order_items.map((item) => (
            <div key={item.id} className="flex justify-between gap-2 border-b border-stone-100 pb-1.5">
              <span className="text-stone-700">
                <strong>{item.quantity}x</strong> {item.product_name}
                {item.variant_name ? ` (${item.variant_name})` : ''}
              </span>
              <span className="shrink-0 font-semibold text-stone-900">{formatBRL(item.line_total)}</span>
            </div>
          ))}
          <div className="space-y-1 pt-1 text-stone-600">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatBRL(order.subtotal)}</span></div>
            {order.discount_amount > 0 && (
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Desconto</span><span>-{formatBRL(order.discount_amount)}</span>
              </div>
            )}
            {order.shipping_fee > 0 && (
              <div className="flex justify-between"><span>Frete</span><span>{formatBRL(order.shipping_fee)}</span></div>
            )}
            <div className="flex justify-between pt-1 text-sm font-extrabold text-stone-900">
              <span>Total ({order.payment_method} • {order.payment_status})</span>
              <span className="text-brand">{formatBRL(order.total)}</span>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2 text-emerald-900">
            <span className="flex items-center gap-1.5 font-bold">
              <TrendingUp className="h-4 w-4 text-emerald-600" /> Lucro Líquido (Admin)
            </span>
            <span className="font-extrabold">{formatBRL(netProfit)}</span>
          </div>
        </div>

        <OrderActionsPanel
          order={order}
          storeName={storeName}
          pickupAddress={pickupAddress}
          onOrderUpdated={onOrderUpdated}
          onOrderDeleted={onOrderDeleted}
          onError={setErrorMsg}
        />
      </div>
    </div>
  );
}
