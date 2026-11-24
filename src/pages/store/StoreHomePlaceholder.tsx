import { Link } from 'react-router-dom';
import { Lock, Sparkles } from 'lucide-react';
import { useStoreSettings } from '../../contexts/StoreSettingsContext';

export default function StoreHomePlaceholder() {
  const { settings } = useStoreSettings();

  return (
    <main className="min-h-screen bg-gradient-to-b from-brand-50 via-white to-stone-50 px-4 py-10 flex flex-col justify-between">
      <div className="flex-1 flex items-center justify-center">
        <section className="w-full max-w-md rounded-3xl border border-brand-100 bg-white p-7 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-brand text-white shadow-sm">
            <Sparkles className="h-8 w-8" aria-hidden="true" />
          </div>

          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-brand">
            Em Breve
          </p>
          <h1 className="mt-2 text-2xl font-bold text-stone-900">{settings.store_name}</h1>
          <p className="mt-2 text-sm leading-relaxed text-stone-600">
            {settings.tagline || 'Beleza, cuidado e autoestima no seu tempo.'}
          </p>

          <div className="mt-6 rounded-2xl border border-brand-100 bg-brand-50/70 px-4 py-3.5 text-xs leading-relaxed text-stone-700">
            Nosso catálogo online de cosméticos está sendo preparado com todo carinho e será
            lançado na <strong>Etapa 5</strong>.
          </div>

          <p className="mt-5 text-xs text-stone-400">veluna.nexusistemas.com.app</p>
        </section>
      </div>

      <footer className="mt-8 flex items-center justify-center gap-2 text-xs text-stone-400">
        <span>© {new Date().getFullYear()} {settings.store_name}</span>
        <span>•</span>
        <Link
          to="/painel"
          aria-label="Acessar painel administrativo"
          title="Painel Administrativo"
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-stone-400 transition hover:bg-brand-50 hover:text-brand"
        >
          <Lock className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </footer>
    </main>
  );
}
