import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  LayoutDashboard,
  Loader2,
  LogOut,
  Package,
  Sparkles,
  UserRound,
} from 'lucide-react';
import CustomerOrdersListCard from '../../components/store/CustomerOrdersListCard';
import CustomerProfileFormCard from '../../components/store/CustomerProfileFormCard';
import SocialLoginButtons from '../../components/store/SocialLoginButtons';
import StoreHeader from '../../components/store/StoreHeader';
import { useAuth } from '../../contexts/AuthContext';
import { useStoreSettings } from '../../contexts/StoreSettingsContext';

export default function CustomerAccountPage() {
  const { user, isAdmin, loading, signOut } = useAuth();
  const { settings } = useStoreSettings();
  const [activeTab, setActiveTab] = useState<'orders' | 'profile'>('orders');

  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const displayName =
    String(meta.full_name ?? meta.name ?? '').trim() ||
    user?.email?.split('@')[0] ||
    'Cliente Veluna';
  const avatarUrl = String(meta.avatar_url ?? meta.picture ?? '').trim();
  const initial = displayName.charAt(0).toUpperCase() || 'V';

  return (
    <div className="min-h-screen bg-stone-50">
      <StoreHeader hideSearch />
      <main className="mx-auto max-w-3xl px-4 py-5 pb-16 space-y-4">
        <Link
          to="/"
          className="inline-flex min-h-[40px] items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-brand"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar para a loja
        </Link>

        {loading ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-stone-200 bg-white py-16 text-stone-400">
            <Loader2 className="h-7 w-7 animate-spin text-brand" />
            <p className="mt-2 text-xs font-medium">Verificando sua conta...</p>
          </div>
        ) : !user ? (
          <section className="mx-auto max-w-md rounded-3xl border border-brand-100 bg-white p-6 sm:p-8 shadow-sm text-center space-y-5">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-white shadow-sm">
              <Sparkles className="h-7 w-7" aria-hidden="true" />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-widest text-brand">
                {settings.store_name}
              </p>
              <h1 className="text-2xl font-extrabold text-stone-900">Sua Conta Veluna</h1>
              <p className="text-sm text-stone-500 leading-relaxed">
                Entre com 1 toque para acompanhar seus pedidos em tempo real, acessar recibos Pix e
                deixar seu endereço salvo para próximas compras.
              </p>
            </div>

            {settings.google_auth_enabled || settings.apple_auth_enabled ? (
              <SocialLoginButtons redirectHashRoute="/minha-conta" />
            ) : (
              <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900">
                O login social está temporariamente desativado pela loja. Você pode continuar comprando normalmente no checkout.
              </p>
            )}
          </section>
        ) : (
          <>
            <section className="rounded-3xl border border-brand-100 bg-white p-4 sm:p-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3.5 min-w-0">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className="h-14 w-14 shrink-0 rounded-2xl object-cover border border-brand-100"
                    />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand text-xl font-extrabold text-white shadow-sm">
                      {initial}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-brand">Olá, bem-vinda!</p>
                    <h1 className="text-lg font-extrabold text-stone-900 truncate">{displayName}</h1>
                    <p className="text-xs text-stone-500 truncate">{user.email}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {isAdmin && (
                    <Link
                      to="/painel"
                      className="inline-flex min-h-[44px] flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-2xl bg-brand px-4 text-xs font-bold text-white shadow-sm hover:bg-brand-700"
                    >
                      <LayoutDashboard className="h-4 w-4" /> Ir para o Painel
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => void signOut()}
                    className="inline-flex min-h-[44px] flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-2xl border border-stone-200 bg-stone-50 px-4 text-xs font-semibold text-stone-700 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                  >
                    <LogOut className="h-4 w-4" /> Sair da Conta
                  </button>
                </div>
              </div>
            </section>

            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-stone-200 bg-white p-1.5 shadow-sm">
              <button
                type="button"
                onClick={() => setActiveTab('orders')}
                className={`flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-3 text-xs sm:text-sm font-bold transition ${
                  activeTab === 'orders'
                    ? 'bg-brand text-white shadow-sm'
                    : 'text-stone-600 hover:bg-stone-50'
                }`}
              >
                <Package className="h-4 w-4" /> Meus Pedidos
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className={`flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-3 text-xs sm:text-sm font-bold transition ${
                  activeTab === 'profile'
                    ? 'bg-brand text-white shadow-sm'
                    : 'text-stone-600 hover:bg-stone-50'
                }`}
              >
                <UserRound className="h-4 w-4" /> Meus Dados e Endereço
              </button>
            </div>

            {activeTab === 'orders' ? (
              <CustomerOrdersListCard />
            ) : (
              <CustomerProfileFormCard
                userId={user.id}
                fallbackName={displayName}
                fallbackEmail={user.email ?? ''}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
