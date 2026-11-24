import { useState, type FormEvent } from 'react';
import { AlertCircle, Check, CheckCircle2, Copy, KeyRound, Loader2, MessageCircle, RefreshCw, X } from 'lucide-react';
import { useStoreSettings } from '../../../contexts/StoreSettingsContext';
import { formatCpfBR } from '../../../services/customerAuthService';
import {
  resetCustomerPasswordAdmin,
  type AdminCustomerRecord,
} from '../../../services/customersAdminService';
import { buildStoreToCustomerWaUrl } from '../../../services/whatsappService';

interface CustomerResetPasswordModalProps {
  customer: AdminCustomerRecord;
  onClose: () => void;
}

function generateQuickPassword(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `veluna${num}`;
}

export default function CustomerResetPasswordModal({
  customer,
  onClose,
}: CustomerResetPasswordModalProps) {
  const { settings } = useStoreSettings();
  const [newPassword, setNewPassword] = useState(generateQuickPassword);
  const [saving, setSaving] = useState(false);
  const [savedPassword, setSavedPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (newPassword.trim().length < 6) {
      setErrorMsg('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    try {
      await resetCustomerPasswordAdmin(customer.user_id, newPassword.trim());
      setSavedPassword(newPassword.trim());
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao redefinir a senha.');
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async () => {
    if (!savedPassword) return;
    try {
      await navigator.clipboard.writeText(savedPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignora
    }
  };

  const cpfText = customer.cpf ? formatCpfBR(customer.cpf) : 'seu CPF cadastrado';
  const waUrl =
    savedPassword && customer.whatsapp
      ? buildStoreToCustomerWaUrl(
          customer.whatsapp,
          `✨ *${settings.store_name}*\nOlá, ${customer.full_name || 'cliente'}!\n\nSua nova senha de acesso foi definida:\n🔑 *Senha:* ${savedPassword}\n🪪 *Login:* ${cpfText}\n\nAcesse sua conta em: https://veluna.nexusistemas.app.br/#/minha-conta`,
        )
      : '';

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-950/60 p-0 sm:p-4">
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between gap-2 border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-brand" />
            <div>
              <h2 className="text-base font-extrabold text-stone-900">Redefinir Senha da Cliente</h2>
              <p className="text-xs text-stone-500">{customer.full_name || 'Cliente'}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="flex h-10 w-10 items-center justify-center rounded-xl text-stone-500 hover:bg-stone-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="rounded-2xl border border-stone-200 bg-stone-50 p-3 text-xs text-stone-600 leading-relaxed">
          Por segurança e LGPD, as senhas ficam criptografadas e não podem ser visualizadas. Defina uma nova senha abaixo e envie para a cliente pelo WhatsApp.
        </p>

        {errorMsg && (
          <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {savedPassword ? (
          <div className="space-y-3">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 space-y-2 text-center">
              <CheckCircle2 className="mx-auto h-7 w-7 text-emerald-600" />
              <p className="text-xs font-bold text-emerald-900">Nova senha salva com sucesso!</p>
              <p className="rounded-xl bg-white px-3 py-2 font-mono text-base font-extrabold text-stone-900 border border-emerald-200">
                {savedPassword}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 text-xs font-bold text-stone-700 hover:bg-stone-50"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Senha copiada!' : 'Copiar nova senha'}
            </button>
            {waUrl && (
              <a
                href={waUrl}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 text-sm font-bold text-white shadow-sm hover:bg-emerald-700"
              >
                <MessageCircle className="h-4 w-4" />
                Enviar nova senha no WhatsApp
              </a>
            )}
            <button type="button" onClick={onClose} className="min-h-[44px] w-full rounded-xl bg-stone-100 text-xs font-bold text-stone-700">
              Concluir
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700">Nova Senha (mín. 6 caracteres)</label>
              <div className="mt-1 flex gap-2">
                <input
                  type="text"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-11 flex-1 rounded-xl border border-stone-200 bg-stone-50 px-3 font-mono text-sm focus:border-brand focus:bg-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setNewPassword(generateQuickPassword())}
                  aria-label="Gerar outra senha"
                  className="inline-flex h-11 items-center gap-1 rounded-xl border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-700 hover:border-brand hover:text-brand"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Gerar
                </button>
              </div>
            </div>
            <button type="submit" disabled={saving} className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-brand px-4 text-sm font-bold text-white shadow-sm hover:bg-brand-700 disabled:opacity-60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              {saving ? 'Atualizando senha...' : 'Salvar Nova Senha'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
