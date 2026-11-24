import { useEffect, useState, type FormEvent } from 'react';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  MessageCircle,
  Save,
  Send,
} from 'lucide-react';
import { formatPhoneBR } from '../../../lib/formatters';
import {
  saveGeneralStoreSettings,
  savePrivateSecretsAdmin,
  sendTestWhatsappWebhook,
} from '../../../services/settingsAdminService';
import type { PrivateSecrets, StoreSettings } from '../../../types/database';

interface WhatsappAutomationCardProps {
  settings: StoreSettings;
  secrets: PrivateSecrets;
  onSaved: () => Promise<void>;
}

export default function WhatsappAutomationCard({
  settings,
  secrets,
  onSaved,
}: WhatsappAutomationCardProps) {
  const [autoEnabled, setAutoEnabled] = useState(Boolean(settings.whatsapp_auto_enabled));
  const [webhookUrl, setWebhookUrl] = useState(secrets.whatsapp_webhook_url ?? '');
  const [webhookToken, setWebhookToken] = useState(secrets.whatsapp_webhook_token ?? '');
  const [showToken, setShowToken] = useState(false);

  const [testPhone, setTestPhone] = useState(formatPhoneBR(settings.whatsapp_number ?? ''));
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    setAutoEnabled(Boolean(settings.whatsapp_auto_enabled));
    if (!testPhone && settings.whatsapp_number) {
      setTestPhone(formatPhoneBR(settings.whatsapp_number));
    }
  }, [settings.whatsapp_auto_enabled, settings.whatsapp_number, testPhone]);

  useEffect(() => {
    setWebhookUrl(secrets.whatsapp_webhook_url ?? '');
    setWebhookToken(secrets.whatsapp_webhook_token ?? '');
  }, [secrets]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      await Promise.all([
        saveGeneralStoreSettings({ whatsapp_auto_enabled: autoEnabled }),
        savePrivateSecretsAdmin({
          whatsapp_webhook_url: webhookUrl,
          whatsapp_webhook_token: webhookToken,
        }),
      ]);
      await onSaved();
      setFeedback({ ok: true, text: 'Configurações de WhatsApp salvas!' });
    } catch (err) {
      setFeedback({
        ok: false,
        text: err instanceof Error ? err.message : 'Erro ao salvar automação do WhatsApp.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestSend = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await sendTestWhatsappWebhook(testPhone);
      setTestResult({ ok: res.ok, text: res.message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm space-y-4"
    >
      <div className="flex items-center gap-2.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <MessageCircle className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-stone-900">Motor Duplo de WhatsApp</h2>
          <p className="text-xs text-stone-500">
            Alterne entre envio manual gratuito em 1 toque ou automação via Webhook
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-stone-900">Disparo Automático via Webhook</p>
            <p className="text-xs text-stone-500">
              {autoEnabled ? 'Modo Automático Ativo' : 'Modo Manual (Sem Servidor)'}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={autoEnabled}
            onClick={() => setAutoEnabled((prev) => !prev)}
            className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition ${
              autoEnabled ? 'bg-emerald-600' : 'bg-stone-300'
            }`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition ${
                autoEnabled ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
          <div
            className={`rounded-xl border p-2.5 ${
              !autoEnabled ? 'border-brand-200 bg-brand-50/70 text-stone-800' : 'border-stone-200 bg-white text-stone-500'
            }`}
          >
            <p className="font-bold">Desligado (100% Sem Servidor)</p>
            <p className="mt-0.5 leading-relaxed">
              Envio de comprovante em 1 toque pelo botão do WhatsApp no celular da Thacilla (wa.me).
            </p>
          </div>
          <div
            className={`rounded-xl border p-2.5 ${
              autoEnabled ? 'border-emerald-200 bg-emerald-50/70 text-stone-800' : 'border-stone-200 bg-white text-stone-500'
            }`}
          >
            <p className="font-bold">Ligado (100% Automático via Webhook)</p>
            <p className="mt-0.5 leading-relaxed">
              Disparo automático em segundo plano assim que o cliente faz o pedido e quando o pagamento é aprovado.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <label className="block space-y-1">
          <span className="text-xs font-semibold text-stone-700">
            URL do Webhook (Evolution API, Z-API ou bot próprio)
          </span>
          <input
            type="url"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://api.seuservidor.com/message/sendText/veluna"
            className="h-11 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 font-mono text-xs focus:border-brand focus:bg-white focus:outline-none"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-semibold text-stone-700">Token / API Key do Webhook</span>
          <div className="flex gap-2">
            <input
              type={showToken ? 'text' : 'password'}
              value={webhookToken}
              onChange={(e) => setWebhookToken(e.target.value)}
              placeholder="Chave secreta do seu provedor de WhatsApp"
              autoComplete="new-password"
              className="h-11 flex-1 rounded-xl border border-stone-200 bg-stone-50 px-3 font-mono text-xs focus:border-brand focus:bg-white focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowToken((prev) => !prev)}
              aria-label="Alternar visibilidade do token WhatsApp"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-600 hover:border-brand hover:text-brand"
            >
              {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </label>
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
        {saving ? 'Salvando...' : 'Salvar Automação WhatsApp'}
      </button>

      <div className="border-t border-stone-100 pt-4 space-y-2.5">
        <p className="text-xs font-bold text-stone-800">Testar Webhook (salve antes de testar)</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="tel"
            value={testPhone}
            onChange={(e) => setTestPhone(formatPhoneBR(e.target.value))}
            placeholder="(11) 99999-9999"
            className="h-11 flex-1 rounded-xl border border-stone-200 bg-stone-50 px-3 text-sm focus:border-brand focus:bg-white focus:outline-none"
          />
          <button
            type="button"
            disabled={testing}
            onClick={() => void handleTestSend()}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {testing ? 'Disparando...' : 'Testar Envio Automático Agora'}
          </button>
        </div>
        {testResult && (
          <p
            className={`rounded-xl px-3 py-2 text-xs font-semibold ${
              testResult.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'
            }`}
          >
            {testResult.text}
          </p>
        )}
      </div>
    </form>
  );
}
