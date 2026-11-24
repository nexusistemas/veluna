import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useStoreSettings } from '../../contexts/StoreSettingsContext';
import { getMyCustomerProfile } from '../../services/customerAccountService';
import type { CustomerProfile } from '../../types/customer';
import SocialLoginButtons from './SocialLoginButtons';

interface CheckoutCustomerBannerProps {
  onProfileLoaded: (profile: CustomerProfile) => void;
}

export default function CheckoutCustomerBanner({ onProfileLoaded }: CheckoutCustomerBannerProps) {
  const { user, loading } = useAuth();
  const { settings } = useStoreSettings();
  const fetchedUserRef = useRef<string | null>(null);
  const onLoadedRef = useRef(onProfileLoaded);
  onLoadedRef.current = onProfileLoaded;

  useEffect(() => {
    if (loading || !user || fetchedUserRef.current === user.id) return;
    fetchedUserRef.current = user.id;

    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const fallbackName = String(meta.full_name ?? meta.name ?? '').trim();

    getMyCustomerProfile(user.id, { name: fallbackName, email: user.email ?? '' })
      .then((profile) => onLoadedRef.current(profile))
      .catch(() => {
        // Falha silenciosa — cliente continua preenchendo manualmente
      });
  }, [user, loading]);

  if (loading) return null;

  if (user) {
    return (
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-900">
        <div className="flex items-center gap-2 min-w-0">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
          <p className="font-medium leading-snug">
            Conectado como <span className="font-bold">{user.email ?? 'sua conta'}</span> • Seus
            dados serão salvos automaticamente
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

  if (!settings.google_auth_enabled && !settings.apple_auth_enabled) {
    return null;
  }

  return (
    <section className="mb-4 rounded-3xl border border-brand-100 bg-white p-4 shadow-sm space-y-3">
      <div className="flex items-start gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm font-bold text-stone-900">
            Já tem conta ou quer salvar seu pedido? Entre com 1 toque
          </p>
          <p className="text-xs text-stone-500">
            Autopreenche seu endereço e salva o histórico. Opcional — você também pode finalizar
            direto sem login abaixo.
          </p>
        </div>
      </div>
      <SocialLoginButtons redirectHashRoute="/checkout" compact />
    </section>
  );
}
