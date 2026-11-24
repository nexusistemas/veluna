import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff, Lock, Mail, Sparkles } from 'lucide-react';
import AdminCustomerSessionBanner from '../../components/admin/AdminCustomerSessionBanner';
import SocialLoginButtons from '../../components/store/SocialLoginButtons';
import { useAuth } from '../../contexts/AuthContext';
import { useStoreSettings } from '../../contexts/StoreSettingsContext';
import { isSupabaseConfigured } from '../../lib/supabase';

export default function LoginPage() {
  const { user, isAdmin, loading, signIn, signOut, sendPasswordReset } = useAuth();
  const { settings } = useStoreSettings();

  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!loading && user && isAdmin) {
    return <Navigate to="/painel" replace />;
  }

  const isLoggedAsCustomer = Boolean(!loading && user && !isAdmin);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim()) {
      setErrorMsg('Informe seu usuário ou e-mail de acesso.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'login') {
        if (!password) {
          setErrorMsg('Informe sua senha.');
          return;
        }
        const { error } = await signIn(email, password);
        if (error) setErrorMsg(error);
      } else {
        const { error } = await sendPasswordReset(email);
        if (error) {
          setErrorMsg(error);
        } else {
          setSuccessMsg(
            'Link de redefinição enviado! Verifique sua caixa de entrada e spam para criar uma nova senha.',
          );
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const toggleMode = (nextMode: 'login' | 'forgot') => {
    setMode(nextMode);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-brand-50 via-white to-stone-50 px-4 py-8 flex flex-col items-center justify-center">
      <section className="w-full max-w-md rounded-3xl border border-brand-100 bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-white shadow-sm">
            <Sparkles className="h-7 w-7" aria-hidden="true" />
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-brand">
            Painel Administrativo
          </p>
          <h1 className="mt-1 text-2xl font-bold text-stone-900">{settings.store_name}</h1>
          <p className="mt-1 text-sm text-stone-500">
            {mode === 'login'
              ? 'Acesse sua loja, estoque e vendas no celular'
              : 'Recupere o acesso enviando um link para seu e-mail'}
          </p>
        </div>

        {!isSupabaseConfigured && (
          <div role="alert" className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
            <p>
              Supabase ainda não conectado. Preencha <code className="font-semibold">VITE_SUPABASE_URL</code> e{' '}
              <code className="font-semibold">VITE_SUPABASE_ANON_KEY</code> no <code className="font-semibold">.env</code>.
            </p>
          </div>
        )}

        {isLoggedAsCustomer && (
          <AdminCustomerSessionBanner email={user?.email ?? 'conta conectada'} onSignOut={signOut} />
        )}

        {errorMsg && (
          <div role="alert" className="mt-5 flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div role="status" className="mt-5 flex items-start gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
            <span>{successMsg}</span>
          </div>
        )}

        {!isLoggedAsCustomer && (
          <>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="admin-email" className="block text-sm font-medium text-stone-700">
                  {mode === 'login' ? 'Usuário ou E-mail' : 'E-mail cadastrado'}
                </label>
                <div className="relative mt-1.5">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden="true" />
                  <input
                    id="admin-email"
                    name="username"
                    type={mode === 'login' ? 'text' : 'email'}
                    required
                    autoComplete={mode === 'login' ? 'username' : 'email'}
                    autoCapitalize="none"
                    autoCorrect="off"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={mode === 'login' ? 'thacilla ou seu@email.com' : 'voce@veluna.com.br'}
                    className="h-12 w-full rounded-2xl border border-stone-200 bg-stone-50 pl-10 pr-4 text-sm text-stone-900 outline-none transition focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20"
                  />
                </div>
              </div>

              {mode === 'login' && (
                <div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="admin-password" className="block text-sm font-medium text-stone-700">
                      Senha
                    </label>
                    <button type="button" onClick={() => toggleMode('forgot')} className="text-xs font-medium text-brand hover:text-brand-700 py-1">
                      Esqueci minha senha
                    </button>
                  </div>
                  <div className="relative mt-1.5">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden="true" />
                    <input
                      id="admin-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Digite sua senha"
                      className="h-12 w-full rounded-2xl border border-stone-200 bg-stone-50 pl-10 pr-12 text-sm text-stone-900 outline-none transition focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      className="absolute right-1.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-stone-500 hover:bg-stone-100 hover:text-stone-700"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !isSupabaseConfigured}
                className="min-h-[48px] w-full rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting
                  ? mode === 'login' ? 'Entrando...' : 'Enviando link...'
                  : mode === 'login' ? 'Entrar no Painel' : 'Enviar link de recuperação'}
              </button>

              {mode === 'forgot' && (
                <button
                  type="button"
                  onClick={() => toggleMode('login')}
                  className="min-h-[48px] w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
                >
                  Voltar para o login
                </button>
              )}
            </form>

            {mode === 'login' && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-3 text-[11px] font-medium text-stone-400">
                  <span className="h-px flex-1 bg-stone-200" />
                  <span>ou acesse com sua conta Google autorizada</span>
                  <span className="h-px flex-1 bg-stone-200" />
                </div>
                <SocialLoginButtons
                  onlyGoogle
                  redirectHashRoute="/painel"
                  googleLabel="Entrar com Google (Administradora)"
                />
              </div>
            )}
          </>
        )}

        <div className="mt-6 border-t border-stone-100 pt-4 text-center">
          <Link to="/" className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-medium text-stone-500 transition hover:text-brand">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Voltar para a loja
          </Link>
        </div>
      </section>
    </main>
  );
}
