import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ExternalLink, LogOut, Menu, Sparkles, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useStoreSettings } from '../../contexts/StoreSettingsContext';
import { ADMIN_NAV_ITEMS, MOBILE_MORE_NAV, MOBILE_PRIMARY_NAV } from './AdminNavConfig';

export default function AdminLayout() {
  const { adminProfile, signOut } = useAuth();
  const { settings } = useStoreSettings();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const adminName = adminProfile?.full_name || 'Thacilla';
  const isMoreRouteActive = MOBILE_MORE_NAV.some((item) => location.pathname.startsWith(item.to));

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col md:flex-row">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-stone-200 bg-white">
        <div className="flex h-16 items-center gap-3 border-b border-stone-100 px-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white shadow-sm">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-stone-900 truncate">{settings.store_name}</p>
            <p className="text-xs text-stone-500 truncate">Painel da {adminName}</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label="Menu administrativo">
          {ADMIN_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.id}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex min-h-[44px] items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? 'bg-brand-50 text-brand font-semibold'
                      : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                  }`
                }
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-stone-100 p-3 space-y-1.5">
          <Link
            to="/"
            className="flex min-h-[44px] items-center gap-2.5 rounded-xl px-3.5 py-2 text-sm font-medium text-stone-600 transition hover:bg-stone-100 hover:text-stone-900"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            Ver Loja
          </Link>
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex min-h-[44px] w-full items-center gap-2.5 rounded-xl px-3.5 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex-1 flex flex-col md:pl-64 min-h-screen">
        {/* Compact Top Header */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-stone-200 bg-white/95 px-4 backdrop-blur md:px-6">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-white md:hidden">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-stone-900 truncate">{settings.store_name}</p>
              <p className="text-xs text-stone-500 truncate">Olá, {adminName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-700 transition hover:border-brand-200 hover:text-brand"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Ver Loja</span>
            </Link>
            <button
              type="button"
              onClick={() => void signOut()}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </header>

        <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-5 pb-24 md:px-6 md:py-7 md:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Navegação rápida do painel"
        className="fixed bottom-0 inset-x-0 z-30 border-t border-stone-200 bg-white/95 backdrop-blur md:hidden"
      >
        <div className="grid grid-cols-5">
          {MOBILE_PRIMARY_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.id}
                to={item.to}
                end={item.end}
                onClick={() => setDrawerOpen(false)}
                className={({ isActive }) =>
                  `flex min-h-[60px] flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium transition ${
                    isActive ? 'text-brand font-semibold' : 'text-stone-500'
                  }`
                }
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}

          <button
            type="button"
            onClick={() => setDrawerOpen((prev) => !prev)}
            aria-expanded={drawerOpen}
            aria-label="Abrir mais módulos"
            className={`flex min-h-[60px] flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium transition ${
              drawerOpen || isMoreRouteActive ? 'text-brand font-semibold' : 'text-stone-500'
            }`}
          >
            {drawerOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            <span>Mais</span>
          </button>
        </div>
      </nav>

      {/* Mobile Bottom Drawer ("Mais") */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Mais módulos">
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-stone-900/40 backdrop-blur-[1px]"
          />
          <div className="absolute bottom-0 inset-x-0 rounded-t-3xl bg-white p-5 pb-8 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-brand">Mais Módulos</p>
                <h2 className="text-base font-bold text-stone-900">Gestão da Loja</h2>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Fechar gaveta"
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-stone-100 text-stone-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {MOBILE_MORE_NAV.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.id}
                    to={item.to}
                    onClick={() => setDrawerOpen(false)}
                    className={({ isActive }) =>
                      `flex min-h-[52px] items-center gap-3 rounded-2xl border px-3.5 py-3 text-sm font-medium transition ${
                        isActive
                          ? 'border-brand-200 bg-brand-50 text-brand font-semibold'
                          : 'border-stone-200 bg-stone-50 text-stone-700'
                      }`
                    }
                  >
                    <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
