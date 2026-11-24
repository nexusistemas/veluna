import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getMyCustomerProfile } from '../../services/customerAccountService';
import { formatAccountIdentifier, isInternalCpfEmail } from '../../services/customerAuthService';
import type { CustomerProfile } from '../../types/customer';

interface CheckoutCustomerBannerProps {
  onProfileLoaded: (profile: CustomerProfile) => void;
}

export default function CheckoutCustomerBanner({ onProfileLoaded }: CheckoutCustomerBannerProps) {
  const { user, loading } = useAuth();
  const fetchedUserRef = useRef<string | null>(null);
  const onLoadedRef = useRef(onProfileLoaded);
  onLoadedRef.current = onProfileLoaded;

  useEffect(() => {
    if (loading || !user || fetchedUserRef.current === user.id) return;
    fetchedUserRef.current = user.id;

    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const fallbackName = String(meta.full_name ?? meta.name ?? '').trim();
    const safeEmail = isInternalCpfEmail(user.email) ? '' : (user.email ?? '');

    getMyCustomerProfile(user.id, { name: fallbackName, email: safeEmail })
      .then((profile) => onLoadedRef.current(profile))
      .catch(() => {});
  }, [user, loading]);

  if (loading || !user) return null;

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const label = formatAccountIdentifier(user.email, String(meta.cpf ?? ''));

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-900">
      <div className="flex items-center gap-2 min-w-0">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
        <p className="font-medium leading-snug">
          Conectado como <span className="font-bold">{label}</span> • Seus dados e pedido ficam
          salvos na sua conta
        </p>
      </div>
      <Link
        to="/minha-conta"
        className="shrink-0 text-xs font-bold text-emerald-800 underline underline-offset-2 hover:text-emerald-950"
      >
        Minha Conta
      </Link>
    </div>
  );
}
