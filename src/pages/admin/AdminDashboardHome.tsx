import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Database,
  PackagePlus,
  ScanBarcode,
  Settings,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import PwaInstallBanner from '../../components/admin/PwaInstallBanner';
import { useAuth } from '../../contexts/AuthContext';
import { useStoreSettings } from '../../contexts/StoreSettingsContext';
import { isSupabaseConfigured } from '../../lib/supabase';

const QUICK_ACTIONS = [
  {
    title: 'Nova Venda (PDV)',
    subtitle: 'Venda presencial rápida no celular',
    to: '/painel/pdv',
    icon: ScanBarcode,
    accent: 'bg-brand text-white',
  },
  {
    title: 'Cadastrar Produto',
    subtitle: 'Fotos, tons, estoque e validade',
    to: '/painel/produtos',
    icon: PackagePlus,
    accent: 'bg-brand-50 text-brand',
  },
  {
    title: 'Pedidos',
    subtitle: 'Acompanhar entregas e retiradas',
    to: '/painel/pedidos',
    icon: ShoppingBag,
    accent: 'bg-brand-50 text-brand',
  },
  {
    title: 'Configurações',
    subtitle: 'Loja, WhatsApp, Pix e entregas',
    to: '/painel/configuracoes',
    icon: Settings,
    accent: 'bg-brand-50 text-brand',
  },
];

export default function AdminDashboardHome() {
  const { adminProfile } = useAuth();
  const { settings } = useStoreSettings();
  const firstName = adminProfile?.full_name?.trim().split(/\s+/)[0] || 'Thacilla';

  return (
    <div className="space-y-5">
      <PwaInstallBanner />

      <section className="rounded-3xl border border-brand-100 bg-gradient-to-br from-brand-50 via-white to-white p-5 sm:p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand">
              {settings.store_name}
            </p>
            <h1 className="mt-1 text-2xl font-bold text-stone-900">
              Bem-vinda de volta, {firstName}!
            </h1>
            <p className="mt-1 text-sm text-stone-600">
              Gerencie catálogo, pedidos online e vendas no PDV com uma mão só.
            </p>
          </div>
          <div className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand text-white shadow-sm">
            <Sparkles className="h-6 w-6" aria-hidden="true" />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
              isSupabaseConfigured
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            <Database className="h-3.5 w-3.5" aria-hidden="true" />
            {isSupabaseConfigured ? 'Supabase conectado' : 'Supabase aguardando .env'}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700">
            <CheckCircle2 className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
            Shell PWA ativo
          </span>
        </div>
      </section>

      <section aria-label="Acesso rápido">
        <h2 className="mb-3 text-sm font-semibold text-stone-700">Acesso Rápido</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.to}
                to={action.to}
                className="group flex min-h-[84px] items-center gap-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition hover:border-brand-200 hover:shadow active:scale-[0.99]"
              >
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${action.accent}`}
                >
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-stone-900 group-hover:text-brand transition">
                    {action.title}
                  </p>
                  <p className="mt-0.5 text-xs text-stone-500">{action.subtitle}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
