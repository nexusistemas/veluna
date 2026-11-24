import { useEffect, useState, type FormEvent } from 'react';
import { AlertCircle, CheckCircle2, Loader2, LocateFixed, MapPin, Save, Search } from 'lucide-react';
import { formatPhoneBR, onlyDigits } from '../../lib/formatters';
import { cleanCep, formatCep, resolveCepWithCoords } from '../../lib/geoCep';
import type { ResolvedGpsLocation } from '../../lib/geoMaps';
import { getMyCustomerProfile, saveMyCustomerProfile } from '../../services/customerAccountService';
import type { CustomerProfile } from '../../types/customer';
import GpsLocationPickerModal from './GpsLocationPickerModal';

interface CustomerProfileFormCardProps {
  userId: string;
  fallbackName: string;
  fallbackEmail: string;
}

const INPUT_CLS =
  'mt-1 h-11 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 text-sm text-stone-900 focus:border-brand focus:bg-white focus:outline-none';

function formatCpf(raw: string): string {
  const d = onlyDigits(raw).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export default function CustomerProfileFormCard({
  userId,
  fallbackName,
  fallbackEmail,
}: CustomerProfileFormCardProps) {
  const [form, setForm] = useState<CustomerProfile>({
    user_id: userId, full_name: fallbackName, email: fallbackEmail,
    whatsapp: '', cpf: '', cep: '', street: '', number: '',
    complement: '', neighborhood: '', city: '', state: '',
  });
  const [loading, setLoading] = useState(true);
  const [lookingUpCep, setLookingUpCep] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [gpsOpen, setGpsOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getMyCustomerProfile(userId, { name: fallbackName, email: fallbackEmail })
      .then((profile) => {
        if (!active) return;
        setForm({ ...profile, whatsapp: formatPhoneBR(profile.whatsapp), cpf: formatCpf(profile.cpf), cep: formatCep(profile.cep) });
      })
      .catch((err) => {
        if (active) setFeedback({ ok: false, text: err instanceof Error ? err.message : 'Erro ao carregar dados.' });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [userId, fallbackName, fallbackEmail]);

  const patch = (next: Partial<CustomerProfile>) => setForm((prev) => ({ ...prev, ...next }));

  const handleLookupCep = async (overrideCep?: string) => {
    const raw = overrideCep ?? form.cep;
    if (cleanCep(raw).length !== 8) {
      setCepError('Digite um CEP válido com 8 números.');
      return;
    }
    setCepError(null);
    setLookingUpCep(true);
    try {
      const resolved = await resolveCepWithCoords(raw);
      setForm((prev) => ({
        ...prev,
        cep: formatCep(resolved.cep),
        street: resolved.street || prev.street,
        neighborhood: resolved.neighborhood || prev.neighborhood,
        city: resolved.city || prev.city,
        state: resolved.state || prev.state,
      }));
    } catch (err) {
      setCepError(err instanceof Error ? err.message : 'Não foi possível consultar este CEP.');
    } finally {
      setLookingUpCep(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      await saveMyCustomerProfile({
        user_id: userId, full_name: form.full_name, email: form.email || fallbackEmail,
        whatsapp: onlyDigits(form.whatsapp), cpf: onlyDigits(form.cpf), cep: cleanCep(form.cep),
        street: form.street, number: form.number, complement: form.complement,
        neighborhood: form.neighborhood, city: form.city, state: form.state,
      });
      setFeedback({ ok: true, text: 'Seus dados e endereço padrão foram salvos com sucesso!' });
    } catch (err) {
      setFeedback({ ok: false, text: err instanceof Error ? err.message : 'Erro ao salvar seus dados.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-stone-200 bg-white py-12 text-stone-400">
        <Loader2 className="h-6 w-6 animate-spin text-brand" />
        <p className="mt-2 text-xs font-medium">Carregando seus dados...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-3xl border border-stone-200 bg-white p-4 sm:p-5 shadow-sm space-y-5">
      <div className="space-y-3">
        <h2 className="text-base font-bold text-stone-900">Dados Pessoais</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-semibold text-stone-700">Nome Completo *</span>
            <input type="text" required value={form.full_name} onChange={(e) => patch({ full_name: e.target.value })} placeholder="Seu nome completo" className={INPUT_CLS} />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-stone-700">WhatsApp *</span>
            <input type="tel" inputMode="tel" value={form.whatsapp} onChange={(e) => patch({ whatsapp: formatPhoneBR(e.target.value) })} placeholder="(00) 00000-0000" className={INPUT_CLS} />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-stone-700">CPF (opcional)</span>
            <input type="text" inputMode="numeric" value={form.cpf} onChange={(e) => patch({ cpf: formatCpf(e.target.value) })} placeholder="000.000.000-00" className={INPUT_CLS} />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-stone-700">E-mail da Conta</span>
            <input type="email" readOnly value={form.email || fallbackEmail} className={`${INPUT_CLS} cursor-not-allowed bg-stone-100 text-stone-500`} />
          </label>
        </div>
      </div>

      <div className="border-t border-stone-100 pt-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-1.5 text-base font-bold text-stone-900">
            <MapPin className="h-4 w-4 text-brand" /> Endereço Padrão de Entrega
          </h3>
          <button
            type="button"
            onClick={() => setGpsOpen(true)}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50 px-3 text-xs font-bold text-brand hover:bg-brand-100"
          >
            <LocateFixed className="h-4 w-4" /> Usar meu GPS no mapa
          </button>
        </div>
        <div>
          <label className="block text-xs font-semibold text-stone-700">CEP</label>
          <div className="mt-1 flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              value={form.cep}
              onChange={(e) => {
                const formatted = formatCep(e.target.value);
                patch({ cep: formatted });
                if (cleanCep(formatted).length === 8) void handleLookupCep(formatted);
              }}
              placeholder="00000-000"
              className="h-11 flex-1 rounded-xl border border-stone-200 bg-stone-50 px-3 text-sm focus:border-brand focus:bg-white focus:outline-none"
            />
            <button
              type="button"
              disabled={lookingUpCep}
              onClick={() => void handleLookupCep()}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-brand px-4 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {lookingUpCep ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Buscar
            </button>
          </div>
          {cepError && (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-rose-700">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {cepError}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <label className="block sm:col-span-2">
            <span className="text-xs font-semibold text-stone-700">Rua / Logradouro</span>
            <input type="text" value={form.street} onChange={(e) => patch({ street: e.target.value })} className={INPUT_CLS} />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-stone-700">Número</span>
            <input type="text" value={form.number} onChange={(e) => patch({ number: e.target.value })} placeholder="Ex: 120" className={INPUT_CLS} />
          </label>
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-semibold text-stone-700">Complemento</span>
            <input type="text" value={form.complement} onChange={(e) => patch({ complement: e.target.value })} placeholder="Apto, bloco, ref." className={INPUT_CLS} />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-stone-700">Bairro</span>
            <input type="text" value={form.neighborhood} onChange={(e) => patch({ neighborhood: e.target.value })} className={INPUT_CLS} />
          </label>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          <label className="block col-span-2">
            <span className="text-xs font-semibold text-stone-700">Cidade</span>
            <input type="text" value={form.city} onChange={(e) => patch({ city: e.target.value })} className={INPUT_CLS} />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-stone-700">UF</span>
            <input type="text" maxLength={2} value={form.state} onChange={(e) => patch({ state: e.target.value.toUpperCase() })} className={`${INPUT_CLS} uppercase`} />
          </label>
        </div>
      </div>

      {feedback && (
        <p className={`flex items-center gap-1.5 rounded-2xl px-3.5 py-2.5 text-xs font-semibold ${feedback.ok ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
          {feedback.ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
          <span>{feedback.text}</span>
        </p>
      )}

      <button type="submit" disabled={saving} className="inline-flex min-h-[48px] w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-brand px-6 text-sm font-bold text-white shadow-sm hover:bg-brand-700 disabled:opacity-60">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {saving ? 'Salvando...' : 'Salvar Meus Dados'}
      </button>

      <GpsLocationPickerModal
        open={gpsOpen}
        onClose={() => setGpsOpen(false)}
        onConfirm={(loc: ResolvedGpsLocation) => {
          setGpsOpen(false);
          setForm((prev) => ({
            ...prev,
            cep: loc.cep ? formatCep(loc.cep) : prev.cep,
            street: loc.street || prev.street,
            number: loc.number || prev.number,
            neighborhood: loc.neighborhood || prev.neighborhood,
            city: loc.city || prev.city,
            state: loc.state || prev.state,
          }));
        }}
      />
    </form>
  );
}
