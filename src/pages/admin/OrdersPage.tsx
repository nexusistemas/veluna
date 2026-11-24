import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Loader2,
  RefreshCw,
  Search,
  ShoppingBag,
  Volume2,
  VolumeX,
} from 'lucide-react';
import OrderDetailsModal from '../../components/admin/orders/OrderDetailsModal';
import OrderListCard from '../../components/admin/orders/OrderListCard';
import { useStoreSettings } from '../../contexts/StoreSettingsContext';
import { onlyDigits } from '../../lib/formatters';
import { isSoundMuted, playNewOrderChime, setSoundMuted } from '../../lib/soundAlert';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import { listOrdersAdmin, type AdminOrderWithItems } from '../../services/ordersAdminService';
import type { OrderStatus } from '../../types/database';

type ChannelFilter = 'all' | 'online' | 'pos';
type StatusTab = 'all' | 'pending' | 'paid_prep' | 'logistics' | 'completed' | 'cancelled';

const STATUS_TABS: Array<{ id: StatusTab; label: string }> = [
  { id: 'all', label: 'Todos' },
  { id: 'pending', label: 'Pendentes' },
  { id: 'paid_prep', label: 'Pagos / Separar' },
  { id: 'logistics', label: 'Entrega / Retirada' },
  { id: 'completed', label: 'Concluídos' },
  { id: 'cancelled', label: 'Cancelados' },
];

function matchesStatusTab(status: OrderStatus, tab: StatusTab): boolean {
  if (tab === 'all') return true;
  if (tab === 'pending') return status === 'pending' || status === 'pending_payment';
  if (tab === 'paid_prep') return status === 'paid' || status === 'confirmed' || status === 'preparing';
  if (tab === 'logistics') return status === 'ready_for_pickup' || status === 'ready' || status === 'out_for_delivery';
  if (tab === 'completed') return status === 'completed' || status === 'delivered';
  return status === 'cancelled';
}

export default function OrdersPage() {
  const { settings } = useStoreSettings();
  const [orders, setOrders] = useState<AdminOrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all');
  const [statusTab, setStatusTab] = useState<StatusTab>('all');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [muted, setMuted] = useState<boolean>(() => isSoundMuted());
  const [newOrderNotice, setNewOrderNotice] = useState(false);

  const loadOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      setOrders(await listOrdersAdmin(150));
    } catch {
      // Mantém última lista em caso de oscilação de rede
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders(false);
    if (!isSupabaseConfigured) return;

    const channel = supabase
      .channel('veluna-orders-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const incoming = payload.new as { channel?: string } | null;
          if (incoming?.channel === 'online') {
            playNewOrderChime();
            setNewOrderNotice(true);
          }
        }
        void loadOrders(true);
      })
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadOrders(true);
    }, 25000);

    return () => {
      window.clearInterval(intervalId);
      void supabase.removeChannel(channel);
    };
  }, [loadOrders]);

  const toggleSound = () => {
    const next = !muted;
    setMuted(next);
    setSoundMuted(next);
    if (!next) playNewOrderChime();
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const qDigits = onlyDigits(q);
    return orders.filter((order) => {
      if (channelFilter === 'online' && order.channel !== 'online') return false;
      if (channelFilter === 'pos' && order.channel !== 'pos' && order.channel !== 'pdv') return false;
      if (!matchesStatusTab(order.status, statusTab)) return false;
      if (!q) return true;
      const numMatch = String(order.order_number).toLowerCase().includes(q.replace('#', ''));
      const nameMatch = order.customer_name.toLowerCase().includes(q);
      const phoneMatch = qDigits.length >= 3 && onlyDigits(order.customer_phone ?? '').includes(qDigits);
      return numMatch || nameMatch || phoneMatch;
    });
  }, [orders, search, channelFilter, statusTab]);

  const selectedOrder = useMemo(
    () => orders.find((o) => o.id === selectedOrderId) ?? null,
    [orders, selectedOrderId],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand">Tempo Real</p>
          <h1 className="text-xl font-extrabold text-stone-900 flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-brand" />
            Central de Pedidos
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleSound}
            className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition ${
              muted
                ? 'border-stone-200 bg-stone-100 text-stone-600'
                : 'border-brand-200 bg-brand-50 text-brand'
            }`}
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            <span>{muted ? 'Som Silenciado' : 'Alerta Sonoro'}</span>
          </button>
          <button
            type="button"
            onClick={() => void loadOrders(false)}
            aria-label="Atualizar pedidos"
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-stone-200 bg-white px-3 text-stone-700 hover:border-brand-200 hover:text-brand"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {newOrderNotice && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-xs font-bold text-brand">
          <span className="flex items-center gap-2">
            <Bell className="h-4 w-4 animate-bounce" />
            Novo pedido recebido na loja online!
          </span>
          <button type="button" onClick={() => setNewOrderNotice(false)} className="underline">
            Dispensar
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2.5 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por #número, cliente ou WhatsApp..."
            className="h-11 w-full rounded-2xl border border-stone-200 bg-white pl-10 pr-3 text-sm focus:border-brand focus:outline-none"
          />
        </div>
        <div className="flex rounded-2xl border border-stone-200 bg-white p-1">
          {([['all', 'Todos'], ['online', 'Site'], ['pos', 'PDV']] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setChannelFilter(id)}
              className={`min-h-[36px] flex-1 rounded-xl px-3 text-xs font-bold transition ${
                channelFilter === id ? 'bg-brand text-white' : 'text-stone-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setStatusTab(tab.id)}
            className={`min-h-[40px] shrink-0 rounded-full px-3.5 text-xs font-bold transition ${
              statusTab === tab.id
                ? 'bg-stone-900 text-white'
                : 'border border-stone-200 bg-white text-stone-600 hover:border-brand-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-brand">
          <Loader2 className="h-7 w-7 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-stone-200 bg-white p-8 text-center space-y-1">
          <p className="text-sm font-bold text-stone-800">Nenhum pedido encontrado</p>
          <p className="text-xs text-stone-500">Ajuste os filtros ou aguarde novas vendas.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((order) => (
            <OrderListCard
              key={order.id}
              order={order}
              storeName={settings.store_name}
              pickupAddress={settings.pickup_address}
              onManage={setSelectedOrderId}
            />
          ))}
        </div>
      )}

      <OrderDetailsModal
        order={selectedOrder}
        storeName={settings.store_name}
        pickupAddress={settings.pickup_address}
        onClose={() => setSelectedOrderId(null)}
        onOrderUpdated={() => void loadOrders(true)}
      />
    </div>
  );
}
