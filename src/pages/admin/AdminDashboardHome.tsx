import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ExternalLink,
  PackagePlus,
  RefreshCw,
  ScanBarcode,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import PwaInstallBanner from '../../components/admin/PwaInstallBanner';
import DashboardAlertsAndTopCard from '../../components/admin/dashboard/DashboardAlertsAndTopCard';
import DashboardKpiCards from '../../components/admin/dashboard/DashboardKpiCards';
import { useAuth } from '../../contexts/AuthContext';
import { useStoreSettings } from '../../contexts/StoreSettingsContext';
import {
  fetchDashboardSummary,
  type DashboardPeriod,
  type DashboardSummary,
} from '../../services/dashboardStatsService';

const INITIAL_SUMMARY: DashboardSummary = {
  grossRevenue: 0,
  pendingRevenue: 0,
  pendingCount: 0,
  netProfit: 0,
  profitMarginPercent: 0,
  ordersCount: 0,
  averageTicket: 0,
  onlineRevenue: 0,
  onlineCount: 0,
  posRevenue: 0,
  posCount: 0,
  byPaymentMethod: { pix: 0, card: 0, cash: 0, whatsapp: 0 },
  topProducts: [],
  awaitingActionCount: 0,
  lowStockItems: [],
  lowStockTotal: 0,
  expiringItems: [],
  expiringTotal: 0,
};

const QUICK_SHORTCUTS = [
  { label: 'Nova Venda PDV', to: '/painel/pdv', icon: ScanBarcode, primary: true },
  { label: 'Novo Produto', to: '/painel/produtos/novo', icon: PackagePlus, primary: false },
  { label: 'Pedidos', to: '/painel/pedidos', icon: ShoppingBag, primary: false },
  { label: 'Abrir Vitrine', to: '/', icon: ExternalLink, primary: false },
];

export default function AdminDashboardHome() {
  const { adminProfile } = useAuth();
  const { settings } = useStoreSettings();
  const firstName = adminProfile?.full_name?.trim().split(/\s+/)[0] || 'Thacilla';

  const [period, setPeriod] = useState<DashboardPeriod>('month');
  const [summary, setSummary] = useState<DashboardSummary>(INITIAL_SUMMARY);
  const [loading, setLoading] = useState(true);

  const loadSummary = useCallback(async (targetPeriod: DashboardPeriod) => {
    setLoading(true);
    try {
      const data = await fetchDashboardSummary(targetPeriod);
      setSummary(data);
    } catch {
      // Mantém último resumo em caso de falha de rede
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSummary(period);
  }, [period, loadSummary]);

  return (
    <div className="space-y-5">
      <PwaInstallBanner />

      <section className="rounded-3xl border border-brand-100 bg-gradient-to-br from-brand-50 via-white to-white p-5 shadow-sm space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand">
              {settings.store_name}
            </p>
            <h1 className="mt-1 text-2xl font-extrabold text-stone-900">
              Olá, {firstName}!
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm text-stone-600">
              Acompanhe vendas online, caixa PDV e lucro líquido em tempo real.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadSummary(period)}
            aria-label="Atualizar painel"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-brand-200 bg-white text-brand shadow-sm hover:bg-brand-50"
          >
            {loading ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {QUICK_SHORTCUTS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex min-h-[46px] items-center justify-center gap-2 rounded-2xl px-3 text-xs font-bold shadow-sm transition active:scale-[0.98] ${
                  item.primary
                    ? 'bg-brand text-white hover:bg-brand-700'
                    : 'border border-stone-200 bg-white text-stone-800 hover:border-brand-200 hover:text-brand'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <DashboardKpiCards
        period={period}
        onPeriodChange={setPeriod}
        summary={summary}
        loading={loading}
      />

      <DashboardAlertsAndTopCard summary={summary} />
    </div>
  );
}
