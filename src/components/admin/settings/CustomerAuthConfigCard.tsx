import { useEffect, useState, type FormEvent } from 'react';
import { Check, CheckCircle2, Copy, Loader2, Save, ShieldCheck } from 'lucide-react';
import { saveGeneralStoreSettings } from '../../../services/settingsAdminService';
import type { StoreSettings } from '../../../types/database';

interface CustomerAuthConfigCardProps {
  settings: StoreSettings;
  onSaved: () => Promise<void>;
}

export default function CustomerAuthConfigCard({ settings, onSaved }: CustomerAuthConfigCardProps) {
  const [googleEnabled, setGoogleEnabled] = useState(Boolean(settings.google_auth_enabled));
  const [appleEnabled, setAppleEnabled] = useState(Boolean(settings.apple_auth_enabled));
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const redirectUrl = `${window.location.origin}/`;

  useEffect(() => {
    setGoogleEnabled(Boolean(settings.google_auth_enabled));
    setAppleEnabled(Boolean(settings.apple_auth_enabled));
  }, [settings.google_auth_enabled, settings.apple_auth_enabled]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(redirectUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback silencioso
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      await saveGeneralStoreSettings({ google_auth_enabled: googleEnabled, apple_auth_enabled: appleEnabled });
      await onSaved();
      setFeedback({ ok: true, text: 'Opções de login dos clientes salvas!' });
    } catch (err) {
      setFeedback({ ok: false, text: err instanceof Error ? err.message : 'Erro ao salvar configurações.' });
    } finally {
      setSaving(false);
    }
  };

  const switches = [
    { label: 'Login de Clientes com Google', desc: 'Botão "Continuar com Google" na loja e checkout', checked: googleEnabled, toggle: () => setGoogleEnabled((v) => !v) },
    { label: 'Login de Clientes com Apple', desc: 'Botão "Continuar com Apple" para iPhone e Mac', checked: appleEnabled, toggle: () => setAppleEnabled((v) => !v) },
  ];

  return (
    <form onSubmit={handleSubmit} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-stone-900">Login de Clientes (Google e Apple)</h2>
          <p className="text-xs text-stone-500">Login em 1 toque para pedidos e endereço salvo</p>
        </div>
      </div>

      <div className="space-y-2.5">
        {switches.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-3.5">
            <div>
              <p className="text-sm font-bold text-stone-900">{item.label}</p>
              <p className="text-xs text-stone-500">{item.desc}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={item.checked}
              onClick={item.toggle}
              className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition ${item.checked ? 'bg-brand' : 'bg-stone-300'}`}
            >
              <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition ${item.checked ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3.5 space-y-1.5">
        <p className="text-xs font-bold text-stone-800">URL de Redirect para colar no Supabase Auth:</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 truncate rounded-xl border border-stone-200 bg-white px-3 py-2.5 font-mono text-xs text-stone-800">
            {redirectUrl}
          </code>
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-700 hover:border-brand hover:text-brand"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copiado' : 'Copiar'}
          </button>
        </div>
      </div>

      {feedback && (
        <p className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold ${feedback.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
          {feedback.ok && <CheckCircle2 className="h-4 w-4 shrink-0" />}
          <span>{feedback.text}</span>
        </p>
      )}

      <button type="submit" disabled={saving} className="inline-flex min-h-[48px] w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-brand px-5 text-sm font-bold text-white shadow-sm hover:bg-brand-700 disabled:opacity-60">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {saving ? 'Salvando...' : 'Salvar Login de Clientes'}
      </button>
    </form>
  );
}
