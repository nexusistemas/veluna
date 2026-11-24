import { Link } from 'react-router-dom';
import { LogOut, UserCheck } from 'lucide-react';

interface AdminCustomerSessionBannerProps {
  email: string;
  onSignOut: () => Promise<void>;
}

export default function AdminCustomerSessionBanner({
  email,
  onSignOut,
}: AdminCustomerSessionBannerProps) {
  return (
    <div
      role="status"
      className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-3 text-left"
    >
      <div className="flex items-start gap-2.5">
        <UserCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
        <p className="text-xs leading-relaxed text-amber-950">
          Você está conectada com uma conta de cliente (
          <span className="font-bold">{email}</span>). Esta conta não possui permissão de
          administradora.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Link
          to="/minha-conta"
          className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-brand px-4 text-xs font-bold text-white transition hover:bg-brand-700"
        >
          Voltar para Minha Conta na Loja
        </Link>
        <button
          type="button"
          onClick={() => void onSignOut()}
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border border-amber-300 bg-white px-4 text-xs font-semibold text-amber-950 transition hover:bg-amber-100"
        >
          <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
          Sair para entrar como Administradora
        </button>
      </div>
    </div>
  );
}
