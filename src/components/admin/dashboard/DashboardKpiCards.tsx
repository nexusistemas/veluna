import {
  Banknote,
  CreditCard,
  Globe,
  MessageCircle,
  QrCode,
  Receipt,
  Store,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { formatBRL } from '../../../lib/formatters';
import type { DashboardPeriod, DashboardSummary } from '../../../services/dashboardStatsService';

interface DashboardKpiCardsProps {
  period: DashboardPeriod;
  onPeriodChange: (period: DashboardPeriod) => void;
  summary: DashboardSummary;
  loading: boolean;
}

const PERIOD_OPTIONS: Array<{ id: DashboardPeriod; label: string }> = [
  { id: 'today', label: 'Hoje' },
  { id: '7d', label: '7 Dias' },
  { id: 'month', label: 'Este Mês' },
  { id: 'all', label: 'Tudo' },
];

export default function DashboardKpiCards({
  period,
  onPeriodChange,
  summary,
  loading,
}: DashboardKpiCardsProps) {
  const channelTotal = summary.onlineRevenue + summary.posRevenue;
  const onlinePct = channelTotal > 0 ? Math.round((summary.onlineRevenue / channelTotal) * 100) : 0;
  const posPct = channelTotal > 0 ? 100 - onlinePct : 0;

  return (
    <section className="space-y-3" aria-label="Indicadores financeiros">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-stone-800">Desempenho Financeiro</h2>
        <div className="inline-flex rounded-2xl border border-stone-200 bg-white p-1 shadow-sm">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onPeriodChange(opt.id)}
              className={`min-h-[36px] rounded-xl px-3 text-xs font-bold transition ${
                period === opt.id
                  ? 'bg-brand text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className={`grid grid-cols-1 gap-3 sm:grid-cols-3 transition-opacity ${loading ? 'opacity-60' : ''}`}>
        <div className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-500">
            <span>Faturamento Bruto</span>
            <Wallet className="h-4 w-4 text-brand" />
          </div>
          <p className="text-2xl font-extrabold text-stone-900">{formatBRL(summary.grossRevenue)}</p>
          <p className="text-[11px] text-stone-500">
            {summary.pendingRevenue > 0
              ? `+ ${formatBRL(summary.pendingRevenue)} (${summary.pendingCount} pendente${summary.pendingCount === 1 ? '' : 's'})`
              : 'Sem pagamentos pendentes no período'}
          </p>
        </div>

        <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-white p-4 shadow-sm space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-800">
            <span>Lucro Líquido Real</span>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="flex flex-wrap items-baseline gap-2">
            <p className="text-2xl font-extrabold text-emerald-950">{formatBRL(summary.netProfit)}</p>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-extrabold text-emerald-800">
              {summary.profitMarginPercent.toFixed(1)}% margem
            </span>
          </div>
          <p className="text-[11px] text-emerald-800/80">
            Produtos vendidos menos descontos e custo
          </p>
        </div>

        <div className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-500">
            <span>Pedidos &amp; Ticket Médio</span>
            <Receipt className="h-4 w-4 text-brand" />
          </div>
          <p className="text-2xl font-extrabold text-stone-900">
            {summary.ordersCount} <span className="text-sm font-semibold text-stone-500">vendas</span>
          </p>
          <p className="text-[11px] font-medium text-stone-600">
            Ticket médio: <strong>{formatBRL(summary.averageTicket)}</strong>
          </p>
        </div>
      </div>

      <div className={`grid grid-cols-1 gap-3 lg:grid-cols-2 transition-opacity ${loading ? 'opacity-60' : ''}`}>
        <div className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm space-y-3">
          <p className="text-xs font-bold text-stone-800">Loja Online vs. PDV Presencial</p>
          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div className="rounded-2xl bg-sky-50 p-3">
              <p className="flex items-center gap-1.5 font-semibold text-sky-800">
                <Globe className="h-3.5 w-3.5" /> Site Online
              </p>
              <p className="mt-1 text-base font-extrabold text-sky-950">
                {formatBRL(summary.onlineRevenue)}
              </p>
              <p className="text-[11px] text-sky-700">
                {summary.onlineCount} {summary.onlineCount === 1 ? 'pedido' : 'pedidos'} ({onlinePct}%)
              </p>
            </div>
            <div className="rounded-2xl bg-brand-50 p-3">
              <p className="flex items-center gap-1.5 font-semibold text-brand">
                <Store className="h-3.5 w-3.5" /> PDV Balcão
              </p>
              <p className="mt-1 text-base font-extrabold text-stone-900">
                {formatBRL(summary.posRevenue)}
              </p>
              <p className="text-[11px] text-brand-700">
                {summary.posCount} {summary.posCount === 1 ? 'venda' : 'vendas'} ({posPct}%)
              </p>
            </div>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100 flex">
            <div className="h-full bg-sky-500 transition-all" style={{ width: `${onlinePct}%` }} />
            <div className="h-full bg-brand transition-all" style={{ width: `${posPct}%` }} />
          </div>
        </div>

        <div className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm space-y-3">
          <p className="text-xs font-bold text-stone-800">Receita por Forma de Pagamento</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2.5 rounded-2xl border border-stone-100 bg-stone-50 p-2.5">
              <QrCode className="h-4 w-4 shrink-0 text-emerald-600" />
              <div className="min-w-0">
                <p className="text-[11px] text-stone-500">Pix</p>
                <p className="truncate font-extrabold text-stone-900">{formatBRL(summary.byPaymentMethod.pix)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 rounded-2xl border border-stone-100 bg-stone-50 p-2.5">
              <CreditCard className="h-4 w-4 shrink-0 text-sky-600" />
              <div className="min-w-0">
                <p className="text-[11px] text-stone-500">Cartão</p>
                <p className="truncate font-extrabold text-stone-900">{formatBRL(summary.byPaymentMethod.card)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 rounded-2xl border border-stone-100 bg-stone-50 p-2.5">
              <Banknote className="h-4 w-4 shrink-0 text-amber-600" />
              <div className="min-w-0">
                <p className="text-[11px] text-stone-500">Dinheiro</p>
                <p className="truncate font-extrabold text-stone-900">{formatBRL(summary.byPaymentMethod.cash)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 rounded-2xl border border-stone-100 bg-stone-50 p-2.5">
              <MessageCircle className="h-4 w-4 shrink-0 text-emerald-600" />
              <div className="min-w-0">
                <p className="text-[11px] text-stone-500">WhatsApp</p>
                <p className="truncate font-extrabold text-stone-900">{formatBRL(summary.byPaymentMethod.whatsapp)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
