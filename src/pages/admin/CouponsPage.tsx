import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Calendar, Loader2, Pencil, Plus, TicketPercent, Trash2, X } from 'lucide-react';
import { formatBRL } from '../../lib/formatters';
import { deleteCoupon, listCouponsAdmin, saveCoupon } from '../../services/marketingAdminService';
import type { Coupon, DiscountType } from '../../types/database';

interface CouponFormState {
  id?: string;
  code: string;
  discount_type: DiscountType;
  discount_value: string;
  min_order_value: string;
  max_uses: string;
  expires_at: string;
  is_active: boolean;
}

const EMPTY_FORM: CouponFormState = {
  code: '',
  discount_type: 'percentage',
  discount_value: '10',
  min_order_value: '0',
  max_uses: '',
  expires_at: '',
  is_active: true,
};

function formatCouponBenefit(coupon: Coupon): string {
  if (coupon.discount_type === 'free_shipping') return 'Frete Grátis';
  if (coupon.discount_type === 'percentage') return `${coupon.discount_value}% OFF`;
  return `${formatBRL(coupon.discount_value)} OFF`;
}

export default function CouponsPage() {
  const [items, setItems] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<CouponFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await listCouponsAdmin());
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Erro ao carregar cupons.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (coupon: Coupon) => {
    setForm({
      id: coupon.id,
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: String(coupon.discount_value ?? 0),
      min_order_value: String(coupon.min_order_value ?? 0),
      max_uses: coupon.max_uses ? String(coupon.max_uses) : '',
      expires_at: coupon.expires_at ? coupon.expires_at.slice(0, 10) : '',
      is_active: coupon.is_active,
    });
    setModalOpen(true);
  };

  const handleTypeChange = (nextType: DiscountType) => {
    setForm((prev) => ({
      ...prev,
      discount_type: nextType,
      discount_value: nextType === 'free_shipping' ? '0' : prev.discount_value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      await saveCoupon({
        id: form.id,
        code: form.code,
        discount_type: form.discount_type,
        discount_value: form.discount_type === 'free_shipping' ? 0 : Number(form.discount_value) || 0,
        min_order_value: Number(form.min_order_value) || 0,
        max_uses: form.max_uses ? Number(form.max_uses) : null,
        expires_at: form.expires_at ? `${form.expires_at}T23:59:59` : null,
        is_active: form.is_active,
      });
      setModalOpen(false);
      setFeedback({ type: 'ok', text: form.id ? 'Cupom atualizado!' : 'Cupom criado!' });
      await loadData();
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Erro ao salvar cupom.' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (coupon: Coupon) => {
    try {
      await saveCoupon({ ...coupon, is_active: !coupon.is_active });
      await loadData();
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Erro ao atualizar cupom.' });
    }
  };

  const handleDelete = async (coupon: Coupon) => {
    if (!window.confirm(`Excluir o cupom "${coupon.code}"?`)) return;
    try {
      await deleteCoupon(coupon.id);
      setFeedback({ type: 'ok', text: 'Cupom removido.' });
      await loadData();
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Erro ao excluir cupom.' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-stone-900">Cupons de Desconto</h1>
          <p className="text-xs text-stone-500">Crie códigos promocionais para campanhas e WhatsApp</p>
        </div>
        <button type="button" onClick={openCreate} className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-brand px-4 text-sm font-semibold text-white shadow-sm hover:bg-brand-700">
          <Plus className="h-4 w-4" /> Novo Cupom
        </button>
      </div>

      {feedback && (
        <div className={`rounded-2xl border px-4 py-3 text-sm ${feedback.type === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
          {feedback.text}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12 text-stone-400"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-stone-300 bg-white p-8 text-center">
          <TicketPercent className="mx-auto h-8 w-8 text-stone-300" />
          <p className="mt-2 text-sm font-semibold text-stone-700">Nenhum cupom cadastrado</p>
          <p className="mt-1 text-xs text-stone-500">Crie cupons como VELUNA10 ou FRETEGRATIS.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {items.map((coupon) => (
            <article key={coupon.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="inline-block rounded-xl bg-brand-50 px-3 py-1 font-mono text-sm font-bold tracking-wider text-brand">
                    {coupon.code}
                  </span>
                  <p className="mt-1.5 text-sm font-bold text-stone-900">{formatCouponBenefit(coupon)}</p>
                </div>
                <button type="button" onClick={() => void handleToggle(coupon)} className={`min-h-[34px] rounded-full px-3 text-xs font-semibold ${coupon.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'}`}>
                  {coupon.is_active ? 'Ativo' : 'Inativo'}
                </button>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500">
                <span>Mínimo: <strong>{formatBRL(coupon.min_order_value)}</strong></span>
                <span>Usos: <strong>{coupon.used_count} / {coupon.max_uses ?? '∞'}</strong></span>
                {coupon.expires_at && (
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" /> Até {coupon.expires_at.slice(0, 10).split('-').reverse().join('/')}
                  </span>
                )}
              </div>
              <div className="flex justify-end gap-1 border-t border-stone-100 pt-2">
                <button type="button" onClick={() => openEdit(coupon)} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-stone-600 hover:bg-stone-100"><Pencil className="h-3.5 w-3.5" /> Editar</button>
                <button type="button" onClick={() => void handleDelete(coupon)} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" /> Excluir</button>
              </div>
            </article>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-900/50 p-0 sm:p-4">
          <form onSubmit={handleSubmit} className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white p-5 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-stone-900">{form.id ? 'Editar Cupom' : 'Novo Cupom'}</h2>
              <button type="button" onClick={() => setModalOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-xl bg-stone-100 text-stone-600"><X className="h-5 w-5" /></button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700">Código do Cupom *</label>
              <input type="text" required value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase().replace(/\s+/g, '') }))} placeholder="Ex: VELUNA10" className="mt-1 h-11 w-full rounded-xl border border-stone-200 px-3 font-mono text-sm uppercase focus:border-brand focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700">Tipo de Desconto</label>
              <select value={form.discount_type} onChange={(e) => handleTypeChange(e.target.value as DiscountType)} className="mt-1 h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm focus:border-brand focus:outline-none">
                <option value="percentage">% Porcentagem</option>
                <option value="fixed">R$ Valor Fixo</option>
                <option value="free_shipping">Frete Grátis</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {form.discount_type !== 'free_shipping' && (
                <div>
                  <label className="block text-xs font-semibold text-stone-700">
                    {form.discount_type === 'percentage' ? 'Desconto (%)' : 'Desconto (R$)'}
                  </label>
                  <input type="number" step="0.01" min="0" required value={form.discount_value} onChange={(e) => setForm((p) => ({ ...p, discount_value: e.target.value }))} className="mt-1 h-11 w-full rounded-xl border border-stone-200 px-3 text-sm focus:border-brand focus:outline-none" />
                </div>
              )}
              <div className={form.discount_type === 'free_shipping' ? 'col-span-2' : ''}>
                <label className="block text-xs font-semibold text-stone-700">Pedido Mínimo (R$)</label>
                <input type="number" step="0.01" min="0" value={form.min_order_value} onChange={(e) => setForm((p) => ({ ...p, min_order_value: e.target.value }))} className="mt-1 h-11 w-full rounded-xl border border-stone-200 px-3 text-sm focus:border-brand focus:outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700">Limite de Usos</label>
                <input type="number" min="1" placeholder="Ilimitado" value={form.max_uses} onChange={(e) => setForm((p) => ({ ...p, max_uses: e.target.value }))} className="mt-1 h-11 w-full rounded-xl border border-stone-200 px-3 text-sm focus:border-brand focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700">Validade</label>
                <input type="date" value={form.expires_at} onChange={(e) => setForm((p) => ({ ...p, expires_at: e.target.value }))} className="mt-1 h-11 w-full rounded-xl border border-stone-200 px-3 text-sm focus:border-brand focus:outline-none" />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium text-stone-700 cursor-pointer">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))} className="h-5 w-5 rounded accent-brand" />
              Cupom ativo
            </label>
            <button type="submit" disabled={saving} className="min-h-[48px] w-full rounded-2xl bg-brand text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
              {saving ? 'Salvando...' : 'Salvar Cupom'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
