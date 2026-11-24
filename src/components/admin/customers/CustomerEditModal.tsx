import { useState, type FormEvent } from 'react';
import { AlertCircle, Loader2, Save, X } from 'lucide-react';
import { formatPhoneBR, onlyDigits } from '../../../lib/formatters';
import { cleanCep, formatCep } from '../../../lib/geoCep';
import { formatCpfBR } from '../../../services/customerAuthService';
import {
  updateCustomerAdmin,
  type AdminCustomerRecord,
} from '../../../services/customersAdminService';

interface CustomerEditModalProps {
  customer: AdminCustomerRecord;
  onClose: () => void;
  onSaved: () => Promise<void>;
}

const INPUT_CLS =
  'mt-1 h-11 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 text-sm text-stone-900 focus:border-brand focus:bg-white focus:outline-none';

export default function CustomerEditModal({ customer, onClose, onSaved }: CustomerEditModalProps) {
  const [fullName, setFullName] = useState(customer.full_name);
  const [cpf, setCpf] = useState(formatCpfBR(customer.cpf));
  const [whatsapp, setWhatsapp] = useState(formatPhoneBR(customer.whatsapp));
  const [email, setEmail] = useState(customer.email);
  const [cep, setCep] = useState(formatCep(customer.cep));
  const [street, setStreet] = useState(customer.street);
  const [number, setNumber] = useState(customer.number);
  const [complement, setComplement] = useState(customer.complement);
  const [neighborhood, setNeighborhood] = useState(customer.neighborhood);
  const [city, setCity] = useState(customer.city);
  const [state, setState] = useState(customer.state);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    try {
      await updateCustomerAdmin(customer.user_id, {
        full_name: fullName.trim(),
        cpf: onlyDigits(cpf),
        whatsapp: onlyDigits(whatsapp),
        email: email.trim(),
        cep: cleanCep(cep),
        street: street.trim(),
        number: number.trim(),
        complement: complement.trim(),
        neighborhood: neighborhood.trim(),
        city: city.trim(),
        state: state.trim().toUpperCase(),
      });
      await onSaved();
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao atualizar cliente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-950/60 p-0 sm:p-4">
      <form onSubmit={handleSubmit} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between gap-2 border-b border-stone-100 pb-3">
          <div>
            <h2 className="text-base font-extrabold text-stone-900">Editar Cliente</h2>
            <p className="text-xs text-stone-500">Atualize cadastro e endereço de entrega</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="flex h-10 w-10 items-center justify-center rounded-xl text-stone-500 hover:bg-stone-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-xs font-semibold text-stone-700">Nome Completo *</span>
            <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className={INPUT_CLS} />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-stone-700">CPF</span>
            <input type="text" inputMode="numeric" value={cpf} onChange={(e) => setCpf(formatCpfBR(e.target.value))} className={INPUT_CLS} />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-stone-700">WhatsApp</span>
            <input type="tel" value={whatsapp} onChange={(e) => setWhatsapp(formatPhoneBR(e.target.value))} className={INPUT_CLS} />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs font-semibold text-stone-700">E-mail</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT_CLS} />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-stone-700">CEP</span>
            <input type="text" inputMode="numeric" value={cep} onChange={(e) => setCep(formatCep(e.target.value))} className={INPUT_CLS} />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-stone-700">Bairro</span>
            <input type="text" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} className={INPUT_CLS} />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs font-semibold text-stone-700">Rua / Logradouro</span>
            <input type="text" value={street} onChange={(e) => setStreet(e.target.value)} className={INPUT_CLS} />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-stone-700">Número</span>
            <input type="text" value={number} onChange={(e) => setNumber(e.target.value)} className={INPUT_CLS} />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-stone-700">Complemento</span>
            <input type="text" value={complement} onChange={(e) => setComplement(e.target.value)} className={INPUT_CLS} />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-stone-700">Cidade</span>
            <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className={INPUT_CLS} />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-stone-700">UF</span>
            <input type="text" maxLength={2} value={state} onChange={(e) => setState(e.target.value.toUpperCase())} className={`${INPUT_CLS} uppercase`} />
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="min-h-[44px] rounded-xl border border-stone-200 px-4 text-xs font-semibold text-stone-600">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-brand px-5 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </form>
    </div>
  );
}
