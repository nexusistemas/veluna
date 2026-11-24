import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  PackageOpen,
  ShoppingBag,
  Trophy,
} from 'lucide-react';
import { formatBRL } from '../../../lib/formatters';
import type { DashboardSummary } from '../../../services/dashboardStatsService';

interface DashboardAlertsAndTopCardProps {
  summary: DashboardSummary;
}

export default function DashboardAlertsAndTopCard({ summary }: DashboardAlertsAndTopCardProps) {
  return (
    <section className="grid grid-cols-1 gap-3 lg:grid-cols-2" aria-label="Alertas e ranking">
      <div className="rounded-3xl border border-stone-200 bg-white p-4 sm:p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-bold text-stone-800">Alertas Operacionais</h2>

        <Link
          to="/painel/pedidos"
          className={`flex min-h-[56px] items-center justify-between gap-3 rounded-2xl border p-3 transition ${
            summary.awaitingActionCount > 0
              ? 'border-brand-200 bg-brand-50 text-brand'
              : 'border-emerald-200 bg-emerald-50/70 text-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {summary.awaitingActionCount > 0 ? (
              <ShoppingBag className="h-5 w-5 shrink-0" />
            ) : (
              <CheckCircle2 className="h-5 w-5 shrink-0" />
            )}
            <div>
              <p className="text-xs font-extrabold">
                {summary.awaitingActionCount > 0
                  ? `${summary.awaitingActionCount} pedido${summary.awaitingActionCount === 1 ? '' : 's'} aguardando separação`
                  : 'Nenhum pedido atrasado na fila'}
              </p>
              <p className="text-[11px] opacity-80">Ver pedidos pagos e em preparação</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0" />
        </Link>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
              <PackageOpen className="h-4 w-4 text-amber-600" />
              Estoque Baixo (&le; 3 un.) • {summary.lowStockTotal}
            </p>
            <Link to="/painel/produtos" className="text-[11px] font-bold text-brand hover:underline">
              Ver catálogo
            </Link>
          </div>
          {summary.lowStockItems.length === 0 ? (
            <p className="text-[11px] text-amber-900/75">Todos os cosméticos ativos com estoque saudável.</p>
          ) : (
            <div className="space-y-1.5">
              {summary.lowStockItems.map((item) => (
                <Link
                  key={item.variantId}
                  to={`/painel/produtos/${item.productId}`}
                  className="flex items-center justify-between gap-2 rounded-xl bg-white/85 px-2.5 py-1.5 text-xs hover:bg-white"
                >
                  <span className="truncate font-medium text-stone-800">
                    {item.productName} <span className="text-stone-500">({item.variantName})</span>
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                      item.stockQty <= 0 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-900'
                    }`}
                  >
                    {item.stockQty <= 0 ? 'Zerado' : `${item.stockQty} un.`}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-xs font-bold text-rose-950">
              <CalendarClock className="h-4 w-4 text-rose-600" />
              Lotes Vencendo (&le; 60 dias) • {summary.expiringTotal}
            </p>
            <Link to="/painel/produtos" className="text-[11px] font-bold text-brand hover:underline">
              Gerenciar
            </Link>
          </div>
          {summary.expiringItems.length === 0 ? (
            <p className="text-[11px] text-rose-900/75">Nenhum lote próximo do vencimento nos próximos 60 dias.</p>
          ) : (
            <div className="space-y-1.5">
              {summary.expiringItems.map((item) => (
                <Link
                  key={item.variantId}
                  to={`/painel/produtos/${item.productId}`}
                  className="flex items-center justify-between gap-2 rounded-xl bg-white/85 px-2.5 py-1.5 text-xs hover:bg-white"
                >
                  <span className="truncate font-medium text-stone-800">
                    {item.productName} <span className="text-stone-500">({item.variantName})</span>
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-extrabold text-rose-800">
                    <AlertTriangle className="h-3 w-3" />
                    {item.daysLeft < 0 ? 'Vencido' : `${item.daysLeft}d`}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-stone-200 bg-white p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-sm font-bold text-stone-800">
            <Trophy className="h-4 w-4 text-brand" />
            Top 5 Cosméticos Mais Vendidos
          </h2>
          <span className="text-[11px] text-stone-500">No período</span>
        </div>

        {summary.topProducts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-200 p-8 text-center">
            <p className="text-xs font-semibold text-stone-600">
              Ainda não há vendas confirmadas neste período.
            </p>
            <p className="mt-1 text-[11px] text-stone-400">
              Assim que os pedidos forem pagos ou fechados no PDV, o ranking aparece aqui.
            </p>
          </div>
        ) : (
          <ol className="space-y-2">
            {summary.topProducts.map((prod, idx) => (
              <li
                key={`${prod.productId}-${idx}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-stone-100 bg-stone-50 p-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${
                      idx === 0
                        ? 'bg-brand text-white'
                        : 'bg-white border border-stone-200 text-stone-700'
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-stone-900">{prod.productName}</p>
                    <p className="text-[11px] text-stone-500">
                      {prod.quantity} {prod.quantity === 1 ? 'unidade vendida' : 'unidades vendidas'}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 text-xs font-extrabold text-brand">
                  {formatBRL(prod.revenue)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
