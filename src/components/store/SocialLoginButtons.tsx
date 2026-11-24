import { useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useStoreSettings } from '../../contexts/StoreSettingsContext';
import { isSupabaseConfigured } from '../../lib/supabase';

interface SocialLoginButtonsProps {
  redirectHashRoute?: string;
  compact?: boolean;
  onlyGoogle?: boolean;
  googleLabel?: string;
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h6.44a5.5 5.5 0 0 1-2.39 3.61v3h3.87c2.26-2.08 3.57-5.15 3.57-8.64Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.87-3a7.17 7.17 0 0 1-10.67-3.77H1.39v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.39 14.32A7.2 7.2 0 0 1 5.01 12c0-.81.14-1.59.38-2.32V6.59H1.39a12 12 0 0 0 0 10.82l4-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.34.61 4.58 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.39 6.59l4 3.09A7.17 7.17 0 0 1 12 4.75Z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg className="h-5 w-5 shrink-0 fill-current" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M16.365 1.43c0 1.14-.465 2.235-1.26 3.045-.825.84-2.175 1.485-3.315 1.395-.15-1.11.405-2.295 1.185-3.105.84-.87 2.25-1.5 3.39-1.335ZM20.52 17.16c-.57 1.305-.84 1.89-1.575 3.045-1.02 1.59-2.46 3.57-4.245 3.585-1.59.015-2.01-1.035-4.185-1.02-2.175.015-2.64 1.035-4.23 1.02-1.785-.015-3.15-1.8-4.17-3.39-2.865-4.44-3.165-9.645-1.395-12.39 1.245-1.935 3.21-3.06 5.055-3.06 1.89 0 3.075 1.035 4.635 1.035 1.515 0 2.43-1.035 4.62-1.035 1.65 0 3.39.9 4.635 2.46-4.08 2.235-3.42 8.055.855 9.75Z" />
    </svg>
  );
}

export default function SocialLoginButtons({
  redirectHashRoute = '/minha-conta',
  compact = false,
  onlyGoogle = false,
  googleLabel = 'Continuar com Google',
}: SocialLoginButtonsProps) {
  const { settings } = useStoreSettings();
  const { signInWithSocial } = useAuth();
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'apple' | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const showGoogle = onlyGoogle ? true : Boolean(settings.google_auth_enabled);
  const showApple = onlyGoogle ? false : Boolean(settings.apple_auth_enabled);

  if (!showGoogle && !showApple) return null;

  const handleClick = async (provider: 'google' | 'apple') => {
    setErrorMsg(null);
    setLoadingProvider(provider);
    const { error } = await signInWithSocial(provider, redirectHashRoute);
    if (error) {
      setErrorMsg(error);
      setLoadingProvider(null);
    }
  };

  return (
    <div className={compact ? 'space-y-2' : 'space-y-2.5'}>
      <div className={compact && showGoogle && showApple ? 'grid grid-cols-1 gap-2 sm:grid-cols-2' : 'space-y-2.5'}>
        {showGoogle && (
          <button
            type="button"
            disabled={!isSupabaseConfigured || loadingProvider !== null}
            onClick={() => void handleClick('google')}
            className="flex min-h-[48px] w-full items-center justify-center gap-2.5 rounded-2xl border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-800 shadow-sm transition hover:bg-stone-50 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingProvider === 'google' ? (
              <Loader2 className="h-5 w-5 animate-spin text-brand" />
            ) : (
              <GoogleIcon />
            )}
            <span>{loadingProvider === 'google' ? 'Conectando...' : googleLabel}</span>
          </button>
        )}

        {showApple && (
          <button
            type="button"
            disabled={!isSupabaseConfigured || loadingProvider !== null}
            onClick={() => void handleClick('apple')}
            className="flex min-h-[48px] w-full items-center justify-center gap-2.5 rounded-2xl bg-black px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-stone-900 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingProvider === 'apple' ? (
              <Loader2 className="h-5 w-5 animate-spin text-white" />
            ) : (
              <AppleIcon />
            )}
            <span>{loadingProvider === 'apple' ? 'Conectando...' : 'Continuar com Apple'}</span>
          </button>
        )}
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
}
