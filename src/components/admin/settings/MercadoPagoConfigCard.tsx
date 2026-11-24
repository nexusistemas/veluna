import { useEffect, useState, type FormEvent } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  Loader2,
  Save,
  ShieldCheck,
} from 'lucide-react';
import {
  saveGeneralStoreSettings,
  savePrivateSecretsAdmin,
} from '../../../services/settingsAdminService';
import type { PrivateSecrets, StoreSettings } from '../../../types/database';

interface MercadoPagoConfigCardProps {
  settings: StoreSettings;
  secrets: PrivateSecrets;
  onSaved: () => Promise<void>;
}

export default function MercadoPagoConfigCard({
  settings,
  secrets,
  onSaved,
}: MercadoPagoConfigCardProps) {
  const [publicKey, setPublicKey] = useState(settings.mp_public_key ?? '');
  const [accessToken, setAccessToken] = useState(secrets.mp_access_token ?? '');
  const [webhookSecret, setWebhookSecret] = useState(secrets.mp_webhook_secret ?? '');
  const [pointDeviceId, setPointDeviceId] = useState(secrets.mp_point_device_id ?? '');

  const [showToken, setShowToken] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [showPointId, setShowPointId] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    setPublicKey(settings.mp_public_key ?? '');
  }, [settings.mp_public_key]);

  useEffect(() => {
    setAccessToken(secrets.mp_access_token ?? '');
    setWebhookSecret(secrets.mp_webhook_secret ?? '');
    setPointDeviceId(secrets.mp_point_device_id ?? '');
  }, [secrets]);

  const supabaseBase = import.meta.env.VITE_SUPABASE_URL?.trim().replace(/\/+$/, '') || '';
  const webhookUrl = supabaseBase
    ? `${supabaseBase}/functions/v1/mp-webhook`
    : 'https://SEU-PROJETO.supabase.co/functions/v1/mp-webhook';

  const handleCopyWebhook = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2500);
    } catch {
      // Ignora erro de clipboard
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      await Promise.all([
        saveGeneralStoreSettings({ mp_public_key: publicKey }),
        savePrivateSecretsAdmin({
          mp_access_token: accessToken,
          mp_webhook_secret: webhookSecret,
          mp_point_device_id: pointDeviceId,
        }),
      ]);
      await onSaved();
      setFeedback({ ok: true, text: 'Credenciais do Mercado Pago salvas com segurança!' });
    } catch (err) {
      setFeedback({
        ok: false,
        text: err instanceof Error ? err.message : 'Erro ao salvar credenciais do Mercado Pago.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm space-y-4"
    >
      <div className="flex items-center gap-2.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
          <CreditCard className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-stone-900">Mercado Pago (Pix e Cartão)</h2>
          <p className="text-xs text-stone-500">
            Tokens sensíveis são gravados no cofre privado, nunca expostos na loja pública
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <label className="block space-y-1">
          <span className="text-xs font-semibold text-stone-700">Public Key (Chave Pública)</span>
          <input
            type="text"
            value={publicKey}
            onChange={(e) => setPublicKey(e.target.value)}
            placeholder="APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            className="h-11 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 font-mono text-xs focus:border-brand focus:bg-white focus:outline-none"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-semibold text-stone-700">Access Token (Segredo Privado)</span>
          <div className="flex gap-2">
            <input
              type={showToken ? 'text' : 'password'}
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="APP_USR-0000000000000000-..."
              autoComplete="new-password"
              className="h-11 flex-1 rounded-xl border border-stone-200 bg-stone-50 px-3 font-mono text-xs focus:border-brand focus:bg-white focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowToken((prev) => !prev)}
              aria-label={showToken ? 'Ocultar Access Token' : 'Mostrar Access Token'}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-600 hover:border-brand hover:text-brand"
            >
              {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </label>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-stone-700">Webhook Secret (Opcional)</span>
            <div className="flex gap-2">
              <input
                type={showWebhookSecret ? 'text' : 'password'}
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                placeholder="Assinatura secreta"
                autoComplete="new-password"
                className="h-11 flex-1 rounded-xl border border-stone-200 bg-stone-50 px-3 font-mono text-xs focus:border-brand focus:bg-white focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowWebhookSecret((prev) => !prev)}
                aria-label="Alternar visibilidade do Webhook Secret"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-600 hover:border-brand hover:text-brand"
              >
                {showWebhookSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-semibold text-stone-700">
              ID Maquininha Point (Opcional)
            </span>
            <div className="flex gap-2">
              <input
                type={showPointId ? 'text' : 'password'}
                value={pointDeviceId}
                onChange={(e) => setPointDeviceId(e.target.value)}
                placeholder="PAX_A910__SMARTPOS..."
                className="h-11 flex-1 rounded-xl border border-stone-200 bg-stone-50 px-3 font-mono text-xs focus:border-brand focus:bg-white focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPointId((prev) => !prev)}
                aria-label="Alternar visibilidade do ID Point"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-600 hover:border-brand hover:text-brand"
              >
                {showPointId ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>
        </div>

        <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-3.5 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-sky-900">
            <ShieldCheck className="h-4 w-4 text-sky-600" />
            URL do Webhook para cadastrar no painel do Mercado Pago
          </div>
          <p className="break-all rounded-xl border border-sky-200/80 bg-white px-3 py-2 font-mono text-[11px] text-stone-700">
            {webhookUrl}
          </p>
          <button
            type="button"
            onClick={() => void handleCopyWebhook()}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-sky-300 bg-white px-3.5 text-xs font-bold text-sky-800 hover:bg-sky-100"
          >
            {copiedWebhook ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            {copiedWebhook ? 'URL copiada!' : 'Copiar URL do Webhook'}
          </button>
        </div>
      </div>

      {feedback && (
        <p
          className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold ${
            feedback.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
          }`}
        >
          {feedback.ok && <CheckCircle2 className="h-4 w-4 shrink-0" />}
          <span>{feedback.text}</span>
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="inline-flex min-h-[48px] w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-brand px-5 text-sm font-bold text-white shadow-sm hover:bg-brand-700 disabled:opacity-60"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {saving ? 'Salvando...' : 'Salvar Mercado Pago'}
      </button>
    </form>
  );
}
