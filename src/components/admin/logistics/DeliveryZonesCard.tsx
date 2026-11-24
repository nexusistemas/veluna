import { useState, type FormEvent } from 'react';
import { Clock, Loader2, MapPin, Pencil, Plus, Trash2, X } from 'lucide-react';
import { formatBRL } from '../../../lib/formatters';
import { deleteDeliveryZone, saveDeliveryZone } from '../../../services/logisticsAdminService';
import type { DeliveryZone } from '../../../types/database';

interface DeliveryZonesCardProps {
  zones: DeliveryZone[];
  loading: boolean;
  onChanged: () => Promise<void>;
}

interface ZoneFormState {
  id?: string;
  city: string;
  state: string;
  neighborhood: string;
  delivery_fee: string;
  estimated_time: string;
  is_active: boolean;
}

const EMPTY_ZONE: ZoneFormState = {
  city: '',
  state: 'SP',
  neighborhood: '',
  delivery_fee: '10',
  estimated_time: '40 a 60 min',
  is_active: true,
};

export default function DeliveryZonesCard({ zones, loading, onChanged }: DeliveryZonesCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<ZoneFormState>(EMPTY_ZONE);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const openCreate = () => {
    setForm(EMPTY_ZONE);
    setModalOpen(true);
  };

  const openEdit = (zone: DeliveryZone) => {
    setForm({
      id: zone.id,
      city: zone.city,
      state: zone.state,
      neighborhood: zone.neighborhood ?? '',
      delivery_fee: String(Number(zone.delivery_fee) || 0),
      estimated_time: zone.estimated_time ?? '',
      is_active: zone.is_active,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      await saveDeliveryZone({
        id: form.id,
        city: form.city,
        state: form.state,
        neighborhood: form.neighborhood.trim() ? form.neighborhood : null,
        delivery_fee: Number(form.delivery_fee) || 0,
        estimated_time: form.estimated_time || null,
        is_active: form.is_active,
      });
      setModalOpen(false);
      setFeedback({ type: 'ok', text: form.id ? 'Zona atualizada!' : 'Zona de entrega cadastrada!' });
      await onChanged();
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Erro ao salvar zona.' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (zone: DeliveryZone) => {
    try {
      await saveDeliveryZone({ ...zone, is_active: !zone.is_active });
      await onChanged();
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Erro ao alterar status.' });
    }
  };

  const handleDelete = async (zone: DeliveryZone) => {
    const label = zone.neighborhood ? `${zone.neighborhood} (${zone.city})` : `${zone.city} (Cidade Inteira)`;
    if (!window.confirm(`Excluir a zona de entrega "${label}"?`)) return;
    try {
      await deleteDeliveryZone(zone.id);
      setFeedback({ type: 'ok', text: 'Zona removida.' });
      await onChanged();
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Erro ao excluir zona.' });
    }
  };

  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-4 sm:p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-stone-900">Zonas por Cidade e Bairro</h2>
          <p className="text-xs text-stone-500">Taxas fixas prioritárias por bairro ou cidade inteira</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-2xl border border-brand-200 bg-brand-50 px-3.5 text-xs font-semibold text-brand hover:bg-brand-100"
        >
          <Plus className="h-4 w-4" /> Adicionar Zona
        </button>
      </div>

      {feedback && (
        <div className={`rounded-2xl border px-3.5 py-2.5 text-xs font-medium ${feedback.type === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
          {feedback.text}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8 text-stone-400"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : zones.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-6 text-center text-xs text-stone-500">
          Nenhuma zona cadastrada. Adicione bairros específicos ou uma taxa geral por cidade.
        </div>
      ) : (
        <div className="space-y-2.5">
          {zones.map((zone) => (
            <article key={zone.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-stone-200 bg-stone-50/70 p-3.5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-brand shrink-0" />
                  <span className="text-sm font-bold text-stone-900">
                    {zone.city} - {zone.state}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${zone.neighborhood ? 'bg-brand-50 text-brand' : 'bg-stone-200 text-stone-700'}`}>
                    {zone.neighborhood || 'Cidade Inteira'}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-stone-600">
                  <strong className="text-stone-900">{formatBRL(Number(zone.delivery_fee) || 0)}</strong>
                  {zone.estimated_time && (
                    <span className="inline-flex items-center gap-1 text-stone-500">
                      <Clock className="h-3 w-3" /> {zone.estimated_time}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => void handleToggle(zone)} className={`min-h-[34px] rounded-full px-2.5 text-[11px] font-semibold ${zone.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'}`}>
                  {zone.is_active ? 'Ativa' : 'Inativa'}
                </button>
                <button type="button" onClick={() => openEdit(zone)} aria-label="Editar zona" className="flex h-11 w-11 items-center justify-center rounded-xl text-stone-600 hover:bg-stone-200/70"><Pencil className="h-4 w-4" /></button>
                <button type="button" onClick={() => void handleDelete(zone)} aria-label="Excluir zona" className="flex h-11 w-11 items-center justify-center rounded-xl text-rose-600 hover:bg-rose-100"><Trash2 className="h-4 w-4" /></button>
              </div>
            </article>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-900/50 p-0 sm:p-4">
          <form onSubmit={handleSubmit} className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white p-5 space-y-3.5 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-stone-900">{form.id ? 'Editar Zona' : 'Nova Zona de Entrega'}</h3>
              <button type="button" onClick={() => setModalOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-xl bg-stone-100 text-stone-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-stone-700">Cidade *</label>
                <input type="text" required value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} placeholder="Ex: Campinas" className="mt-1 h-11 w-full rounded-xl border border-stone-200 px-3 text-sm focus:border-brand focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700">UF *</label>
                <input type="text" required maxLength={2} value={form.state} onChange={(e) => setForm((p) => ({ ...p, state: e.target.value.toUpperCase() }))} placeholder="SP" className="mt-1 h-11 w-full rounded-xl border border-stone-200 px-3 text-sm uppercase focus:border-brand focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700">Bairro (opcional)</label>
              <input type="text" value={form.neighborhood} onChange={(e) => setForm((p) => ({ ...p, neighborhood: e.target.value }))} placeholder="Ex: Centro" className="mt-1 h-11 w-full rounded-xl border border-stone-200 px-3 text-sm focus:border-brand focus:outline-none" />
              <p className="mt-1 text-[11px] text-stone-500">Deixe em branco para valer para a cidade inteira.</p>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-stone-700">Taxa (R$) *</label>
                <input type="number" step="0.01" min="0" required value={form.delivery_fee} onChange={(e) => setForm((p) => ({ ...p, delivery_fee: e.target.value }))} className="mt-1 h-11 w-full rounded-xl border border-stone-200 px-3 text-sm focus:border-brand focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700">Prazo estimado</label>
                <input type="text" value={form.estimated_time} onChange={(e) => setForm((p) => ({ ...p, estimated_time: e.target.value }))} placeholder="Ex: 40 a 60 min" className="mt-1 h-11 w-full rounded-xl border border-stone-200 px-3 text-sm focus:border-brand focus:outline-none" />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium text-stone-700 cursor-pointer">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))} className="h-5 w-5 rounded accent-brand" />
              Zona ativa
            </label>
            <button type="submit" disabled={saving} className="min-h-[48px] w-full rounded-2xl bg-brand text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
              {saving ? 'Salvando...' : 'Salvar Zona'}
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
