import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ChevronRight, Loader2, Package, RefreshCw, ShoppingBag } from 'lucide-react';
import { formatBRL } from '../../lib/formatters';
import { fetchMyCustomerOrders } from '../../services/customerAccountService';
import type { CustomerOrderSummary } from '../../types/customer';
import type { OrderStatus } from '../../types/database';

const STATUS_BADGE: Record<OrderStatus, { label: string; cls: string }> = {
  pending: { label: 'Aguardando Pagamento', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
  pending_payment: { label: 'Aguardando Pagamento', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
  paid: { label: 'Pago', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  confirmed: { label: 'Pago', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  preparing: { label: 'Em Separação', cls: 'bg-sky-50 text-sky-800 border-sky-200' },
  out_for_delivery: { label: 'Saiu para Entrega', cls: 'bg-violet-50 text-violet-800 border-violet-200' },
  ready: { label: 'Pronto para Retirada', cls: 'bg-teal-50 text-teal-800 border-teal-200' },
  ready_for_pickup: { label: 'Pronto para Retirada', cls: 'bg-teal-50 text-teal-800 border-teal-200' },
  delivered: { label: 'Concluído', cls: 'bg-emerald-100 text-emerald-900 border-emerald-200' },
  completed: { label: 'Concluído', cls: 'bg-emerald-100 text-emerald-900 border-emerald-200' },
  cancelled: { label: 'Cancelado', cls: 'bg-rose-50 text-rose-800 border-rose-200' },
};

function formatOrderDate(iso: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default function CustomerOrdersListCard() {
  const [orders, setOrders] = useState<CustomerOrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const list = await fetchMyCustomerOrders();
      setOrders(list);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao carregar seus pedidos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-stone-200 bg-white py-12 text-stone-400">
        <Loader2 className="h-6 w-6 animate-spin text-brand" />
        <p className="mt-2 text-xs font-medium">Carregando seus pedidos...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-center space-y-3">
        <AlertCircle className="mx-auto h-6 w-6 text-rose-600" />
        <p className="text-sm font-medium text-rose-800">{errorMsg}</p>
        <button
          type="button"
          onClick={() => void loadOrders()}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-2xl bg-white px-4 text-xs font-bold text-rose-700 border border-rose-200"
        >
          <RefreshCw className="h-4 w-4" /> Tentar novamente
        </button>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-3xl border border-stone-200 bg-white p-8 text-center space-y-3 shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand">
          <ShoppingBag className="h-6 w-6" />
        </div>
        <h2 className="text-base font-bold text-stone-900">Você ainda não fez pedidos</h2>
        <p className="text-xs text-stone-500">
          Quando você finalizar uma compra conectada à sua conta, todos os recibos e atualizações aparecerão aqui.
        </p>
        <Link
          to="/"
          className="inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-brand px-6 text-sm font-bold text-white shadow-sm hover:bg-brand-700"
        >
          Explorar Catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between px-1">
        <p className="text-xs font-semibold text-stone-500">
          {orders.length} {orders.length === 1 ? 'pedido encontrado' : 'pedidos encontrados'}
        </p>
        <button
          type="button"
          onClick={() => void loadOrders()}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold text-brand hover:bg-brand-50"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Atualizar
        </button>
      </div>

      {orders.map((order) => {
        const badge = STATUS_BADGE[order.status] ?? {
          label: 'Em andamento',
          cls: 'bg-stone-100 text-stone-700 border-stone-200',
        };
        const isPendingPix =
          (order.status === 'pending' || order.status === 'pending_payment') &&
          order.payment_status === 'pending';

        return (
          <article
            key={order.id}
            className="rounded-3xl border border-stone-200 bg-white p-4 sm:p-5 shadow-sm space-y-3.5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-brand" />
                <div>
                  <p className="text-sm font-extrabold text-stone-900">Pedido #{order.order_number}</p>
                  <p className="text-[11px] text-stone-500">{formatOrderDate(order.created_at)}</p>
                </div>
              </div>
              <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${badge.cls}`}>
                {badge.label}
              </span>
            </div>

            <ul className="space-y-1.5">
              {order.items.map((item, idx) => (
                <li
                  key={`${order.id}-${item.variant_id ?? idx}`}
                  className="flex items-center justify-between gap-2 text-xs text-stone-700"
                >
                  <span className="min-w-0 truncate">
                    <span className="font-bold text-stone-900">{item.quantity}x</span> {item.product_name}
                    {item.variant_name ? ` (${item.variant_name})` : ''}
                  </span>
                  <span className="shrink-0 font-semibold text-stone-900">
                    {formatBRL(item.line_total)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-3">
              <div>
                <p className="text-[11px] text-stone-500">Total do pedido</p>
                <p className="text-base font-extrabold text-stone-900">{formatBRL(order.total)}</p>
              </div>
              <Link
                to={`/pedido/${order.id}?token=${encodeURIComponent(order.public_access_token)}`}
                className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-2xl px-4 text-xs font-bold transition ${
                  isPendingPix
                    ? 'bg-brand text-white shadow-sm hover:bg-brand-700'
                    : 'border border-brand-200 bg-brand-50 text-brand hover:bg-brand-100'
                }`}
              >
                <span>Ver Recibo / Pagar Pix</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </article>
        );
      })}
    </div>
  );
}
