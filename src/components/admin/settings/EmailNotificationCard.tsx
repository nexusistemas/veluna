import { useEffect, useState, type FormEvent } from 'react';
import { CheckCircle2, Eye, EyeOff, Loader2, Mail, Save, Send } from 'lucide-react';
import { sendTestEmailAdmin } from '../../../services/emailNotificationService';
import {
  DEFAULT_RESEND_FROM_EMAIL,
  savePrivateSecretsAdmin,
} from '../../../services/settingsAdminService';
import type { PrivateSecrets } from '../../../types/database';

interface EmailNotificationCardProps {
  secrets: PrivateSecrets;
  onSaved: () => Promise<void>;
}

export default function EmailNotificationCard({ secrets, onSaved }: EmailNotificationCardProps) {
  const [adminEnabled, setAdminEnabled] = useState(Boolean(secrets.email_admin_enabled));
  const [customerEnabled, setCustomerEnabled] = useState(Boolean(secrets.email_customer_enabled));
  const [adminEmail, setAdminEmail] = useState(secrets.admin_notification_email ?? '');
  const [fromEmail, setFromEmail] = useState(secrets.resend_from_email || DEFAULT_RESEND_FROM_EMAIL);
  const [apiKey, setApiKey] = useState(secrets.resend_api_key ?? '');
  const [showKey, setShowKey] = useState(false);

  const [testEmail, setTestEmail] = useState(secrets.admin_notification_email ?? '');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    setAdminEnabled(Boolean(secrets.email_admin_enabled));
    setCustomerEnabled(Boolean(secrets.email_customer_enabled));
    setAdminEmail(secrets.admin_notification_email ?? '');
    setFromEmail(secrets.resend_from_email || DEFAULT_RESEND_FROM_EMAIL);
    setApiKey(secrets.resend_api_key ?? '');
    if (!testEmail && secrets.admin_notification_email) {
      setTestEmail(secrets.admin_notification_email);
    }
  }, [secrets, testEmail]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      await savePrivateSecretsAdmin({
        email_admin_enabled: adminEnabled,
        email_customer_enabled: customerEnabled,
        admin_notification_email: adminEmail,
        resend_from_email: fromEmail,
        resend_api_key: apiKey,
      });
      await onSaved();
      setFeedback({ ok: true, text: 'Configurações de e-mail salvas com sucesso!' });
    } catch (err) {
      setFeedback({
        ok: false,
        text: err instanceof Error ? err.message : 'Erro ao salvar configurações de e-mail.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await sendTestEmailAdmin(testEmail || adminEmail);
      setTestResult({ ok: res.ok, text: res.message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand">
          <Mail className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-stone-900">Notificações por E-mail (Resend)</h2>
          <p className="text-xs text-stone-500">
            Avisos automáticos de novas vendas para a loja e comprovantes para as clientes
          </p>
        </div>
      </div>

      <div className="space-y-2.5">
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3.5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-stone-900">
                Receber aviso de novas vendas no e-mail da Thacilla
              </p>
              <p className="text-xs text-stone-500">
                Envia alerta a cada pedido feito no site e quando o pagamento for aprovado
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={adminEnabled}
              onClick={() => setAdminEnabled((v) => !v)}
              className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition ${
                adminEnabled ? 'bg-brand' : 'bg-stone-300'
              }`}
            >
              <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition ${adminEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
          </div>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-stone-700">E-mail da Thacilla para receber avisos</span>
            <input
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="thacilla@seuemail.com"
              className="h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm focus:border-brand focus:outline-none"
            />
          </label>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-3.5">
          <div>
            <p className="text-sm font-bold text-stone-900">
              Enviar comprovante e atualizações de status para o Cliente
            </p>
            <p className="text-xs text-stone-500">
              Dispara automaticamente quando a cliente informa e-mail ou entra com conta Google/Apple
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={customerEnabled}
            onClick={() => setCustomerEnabled((v) => !v)}
            className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition ${
              customerEnabled ? 'bg-brand' : 'bg-stone-300'
            }`}
          >
            <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition ${customerEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <label className="block space-y-1">
          <span className="text-xs font-semibold text-stone-700">Remetente (Resend From Email)</span>
          <input
            type="text"
            value={fromEmail}
            onChange={(e) => setFromEmail(e.target.value)}
            placeholder={DEFAULT_RESEND_FROM_EMAIL}
            className="h-11 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 font-mono text-xs focus:border-brand focus:bg-white focus:outline-none"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-semibold text-stone-700">Resend API Key (Cofre Privado)</span>
          <div className="flex gap-2">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="re_..."
              autoComplete="new-password"
              className="h-11 flex-1 rounded-xl border border-stone-200 bg-stone-50 px-3 font-mono text-xs focus:border-brand focus:bg-white focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              aria-label={showKey ? 'Ocultar Resend API Key' : 'Mostrar Resend API Key'}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-600 hover:border-brand hover:text-brand"
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </label>
      </div>

      {feedback && (
        <p className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold ${feedback.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
          {feedback.ok && <CheckCircle2 className="h-4 w-4 shrink-0" />}
          <span>{feedback.text}</span>
        </p>
      )}

      <button type="submit" disabled={saving} className="inline-flex min-h-[48px] w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-brand px-5 text-sm font-bold text-white shadow-sm hover:bg-brand-700 disabled:opacity-60">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {saving ? 'Salvando...' : 'Salvar Configurações de E-mail'}
      </button>

      <div className="border-t border-stone-100 pt-4 space-y-2.5">
        <p className="text-xs font-bold text-stone-800">Testar envio de e-mail (salve antes de testar)</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="seu@email.com"
            className="h-11 flex-1 rounded-xl border border-stone-200 bg-stone-50 px-3 text-sm focus:border-brand focus:bg-white focus:outline-none"
          />
          <button
            type="button"
            disabled={testing}
            onClick={() => void handleTest()}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-brand px-4 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {testing ? 'Enviando...' : 'Enviar E-mail de Teste'}
          </button>
        </div>
        {testResult && (
          <p className={`rounded-xl px-3 py-2 text-xs font-semibold ${testResult.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>
            {testResult.text}
          </p>
        )}
      </div>
    </form>
  );
}
