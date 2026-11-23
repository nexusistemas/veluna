import { HashRouter, Route, Routes } from 'react-router-dom';
import { CheckCircle2, Database, Globe, Sparkles } from 'lucide-react';
import { isSupabaseConfigured } from './lib/supabase';

function FoundationStatusPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-brand-50 via-white to-stone-50 px-4 py-10 flex items-center justify-center">
      <section className="w-full max-w-md rounded-3xl border border-brand-100 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-white shadow-sm">
            <Sparkles className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand">
              Fundação — Etapa 1
            </p>
            <h1 className="text-xl font-bold text-stone-900">Veluna Cosméticos</h1>
          </div>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-stone-600">
          Base técnica mobile-first preparada para o e-commerce e PDV da Veluna Cosméticos.
        </p>

        <ul className="mt-6 space-y-3">
          <li className="flex items-center justify-between rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
            <span className="flex items-center gap-2.5 text-sm font-medium text-stone-700">
              <Globe className="h-4 w-4 text-brand" aria-hidden="true" />
              Domínio
            </span>
            <span className="text-xs font-semibold text-stone-900">
              veluna.nexusistemas.com.app
            </span>
          </li>

          <li className="flex items-center justify-between rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
            <span className="flex items-center gap-2.5 text-sm font-medium text-stone-700">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
              Build Vite + React + TS
            </span>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
              OK
            </span>
          </li>

          <li className="flex items-center justify-between rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
            <span className="flex items-center gap-2.5 text-sm font-medium text-stone-700">
              <Database className="h-4 w-4 text-brand" aria-hidden="true" />
              Supabase
            </span>
            {isSupabaseConfigured ? (
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                Configurado
              </span>
            ) : (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                Aguardando .env
              </span>
            )}
          </li>
        </ul>

        <footer className="mt-6 border-t border-stone-100 pt-4 text-center text-xs text-stone-400">
          Roteamento HashRouter ativo • Tailwind CSS v3
        </footer>
      </section>
    </main>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="*" element={<FoundationStatusPage />} />
      </Routes>
    </HashRouter>
  );
}
