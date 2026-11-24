import { Link } from 'react-router-dom';
import { ArrowLeft, Clock } from 'lucide-react';
import { ADMIN_MODULE_META, type AdminModuleKey } from '../../components/admin/AdminNavConfig';

interface AdminModulePlaceholderProps {
  moduleKey: AdminModuleKey;
}

export default function AdminModulePlaceholder({ moduleKey }: AdminModulePlaceholderProps) {
  const meta = ADMIN_MODULE_META[moduleKey];
  const Icon = meta.icon;

  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-6 sm:p-8 shadow-sm">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand">
          <Icon className="h-7 w-7" aria-hidden="true" />
        </div>
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            Disponível na {meta.stageLabel}
          </span>
          <h1 className="mt-2 text-xl font-bold text-stone-900">{meta.title}</h1>
          <p className="mt-1 text-sm text-stone-600">{meta.description}</p>
        </div>
      </div>

      <div className="mt-6 border-t border-stone-100 pt-5">
        <Link
          to="/painel"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-4 text-sm font-semibold text-stone-700 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar para o Início
        </Link>
      </div>
    </section>
  );
}
