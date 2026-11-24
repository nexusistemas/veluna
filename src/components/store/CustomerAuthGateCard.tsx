import { useState, type FormEvent } from 'react';
import {
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  MessageCircle,
  Sparkles,
  UserPlus,
  UserRound,
} from 'lucide-react';
import { useStoreSettings } from '../../contexts/StoreSettingsContext';
import { formatPhoneBR } from '../../lib/formatters';
import {
  buildForgotPasswordWhatsappUrl,
  formatCpfBR,
  loginCustomerWithCpf,
  registerCustomerWithCpf,
} from '../../services/customerAuthService';
import SocialLoginButtons from './SocialLoginButtons';

interface CustomerAuthGateCardProps {
  redirectHashRoute?: string;
  title?: string;
  subtitle?: string;
}

const INPUT_CLS =
  'mt-1 h-11 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 text-sm text-stone-900 focus:border-brand focus:bg-white focus:outline-none';

export default function CustomerAuthGateCard({
  redirectHashRoute = '/minha-conta',
  title = 'Acesse sua Conta Veluna',
  subtitle = 'Entre com Google ou crie seu cadastro rápido com Nome, CPF e Senha para comprar e acompanhar seus pedidos.',
}: CustomerAuthGateCardProps) {
  const { settings } = useStoreSettings();
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [fullName, setFullName] = useState('');
  const [cpf, setCpf] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const hasSocial = Boolean(settings.google_auth_enabled || settings.apple_auth_enabled);
  const forgotWaUrl = buildForgotPasswordWhatsappUrl({
    storeWhatsapp: settings.whatsapp_number,
    storeName: settings.store_name,
    cpf,
    fullName,
  });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const res =
        mode === 'register'
          ? await registerCustomerWithCpf({ fullName, cpf, whatsapp, password })
          : await loginCustomerWithCpf(cpf, password);
      if (res.error) setErrorMsg(res.error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mx-auto max-w-md rounded-3xl border border-brand-100 bg-white p-5 sm:p-7 shadow-sm space-y-5">
      <div className="text-center space-y-1.5">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-white shadow-sm">
          <Sparkles className="h-6 w-6" aria-hidden="true" />
        </div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-brand">{settings.store_name}</p>
        <h1 className="text-xl font-extrabold text-stone-900">{title}</h1>
        <p className="text-xs text-stone-500 leading-relaxed">{subtitle}</p>
      </div>

      {hasSocial && (
        <div className="space-y-3">
          <SocialLoginButtons redirectHashRoute={redirectHashRoute} />
          <div className="flex items-center gap-3 text-[11px] font-medium text-stone-400">
            <span className="h-px flex-1 bg-stone-200" />
            <span>ou use seu CPF e Senha</span>
            <span className="h-px flex-1 bg-stone-200" />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-1.5 rounded-2xl border border-stone-200 bg-stone-50 p-1">
        <button
          type="button"
          onClick={() => { setMode('register'); setErrorMsg(null); }}
          className={`flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl text-xs font-bold transition ${
            mode === 'register' ? 'bg-brand text-white shadow-sm' : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <UserPlus className="h-3.5 w-3.5" /> Criar Conta
        </button>
        <button
          type="button"
          onClick={() => { setMode('login'); setErrorMsg(null); }}
          className={`flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl text-xs font-bold transition ${
            mode === 'login' ? 'bg-brand text-white shadow-sm' : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <UserRound className="h-3.5 w-3.5" /> Já tenho conta
        </button>
      </div>

      {errorMsg && (
        <div role="alert" className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === 'register' && (
          <div>
            <label className="block text-xs font-semibold text-stone-700">Nome Completo *</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Seu nome completo"
              className={INPUT_CLS}
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-stone-700">CPF *</label>
          <input
            type="text"
            inputMode="numeric"
            required
            value={cpf}
            onChange={(e) => setCpf(formatCpfBR(e.target.value))}
            placeholder="000.000.000-00"
            className={INPUT_CLS}
          />
        </div>

        {mode === 'register' && (
          <div>
            <label className="block text-xs font-semibold text-stone-700">WhatsApp *</label>
            <input
              type="tel"
              inputMode="tel"
              required
              value={whatsapp}
              onChange={(e) => setWhatsapp(formatPhoneBR(e.target.value))}
              placeholder="(00) 00000-0000"
              className={INPUT_CLS}
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-stone-700">
            {mode === 'register' ? 'Crie uma Senha (mín. 6 dígitos) *' : 'Sua Senha *'}
          </label>
          <div className="relative mt-1">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              type={showPass ? 'text' : 'password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'register' ? 'Ex: 6 caracteres ou mais' : 'Digite sua senha'}
              className="h-11 w-full rounded-xl border border-stone-200 bg-stone-50 pl-9 pr-11 text-sm focus:border-brand focus:bg-white focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'}
              className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100"
            >
              {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-brand px-4 text-sm font-bold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitting
            ? mode === 'register' ? 'Criando sua conta...' : 'Entrando...'
            : mode === 'register' ? 'Criar Conta e Continuar' : 'Entrar com CPF e Senha'}
        </button>
      </form>

      {mode === 'login' && forgotWaUrl && (
        <div className="border-t border-stone-100 pt-3 text-center space-y-1.5">
          <p className="text-[11px] text-stone-500">Perdeu ou esqueceu sua senha?</p>
          <a
            href={forgotWaUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100"
          >
            <MessageCircle className="h-4 w-4 shrink-0" />
            Pedir nova senha pelo WhatsApp
          </a>
        </div>
      )}
    </section>
  );
}
