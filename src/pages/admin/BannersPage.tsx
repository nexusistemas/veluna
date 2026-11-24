import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Image as ImageIcon, ImagePlus, Link2, Loader2, Pencil, Plus, Smartphone, Trash2, X } from 'lucide-react';
import { uploadCatalogImage } from '../../lib/imageWebp';
import { deleteBanner, listBannersAdmin, saveBanner } from '../../services/marketingAdminService';
import type { Banner } from '../../types/database';

interface BannerFormState {
  id?: string;
  title: string;
  subtitle: string;
  image_url: string;
  mobile_image_url: string;
  link_url: string;
  sort_order: number;
  is_active: boolean;
}

const EMPTY_FORM: BannerFormState = {
  title: '',
  subtitle: '',
  image_url: '',
  mobile_image_url: '',
  link_url: '',
  sort_order: 0,
  is_active: true,
};

export default function BannersPage() {
  const [items, setItems] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<BannerFormState>(EMPTY_FORM);
  const [uploadingSlot, setUploadingSlot] = useState<'desktop' | 'mobile' | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await listBannersAdmin());
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Erro ao carregar banners.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, sort_order: items.length });
    setModalOpen(true);
  };

  const openEdit = (b: Banner) => {
    setForm({
      id: b.id,
      title: b.title,
      subtitle: b.subtitle ?? '',
      image_url: b.image_url,
      mobile_image_url: b.mobile_image_url ?? '',
      link_url: b.link_url ?? '',
      sort_order: b.sort_order,
      is_active: b.is_active,
    });
    setModalOpen(true);
  };

  const handleUpload = (slot: 'desktop' | 'mobile') => async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploadingSlot(slot);
    try {
      const url = await uploadCatalogImage(file, 'banners', slot === 'desktop' ? 1600 : 1080);
      setForm((p) => (slot === 'desktop' ? { ...p, image_url: url } : { ...p, mobile_image_url: url }));
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Erro ao enviar imagem.' });
    } finally {
      setUploadingSlot(null);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.title.trim() || !form.image_url.trim()) {
      setFeedback({ type: 'err', text: 'Informe o título e envie a imagem Desktop do banner.' });
      return;
    }
    setSaving(true);
    setFeedback(null);
    try {
      await saveBanner({
        id: form.id,
        title: form.title,
        subtitle: form.subtitle || null,
        image_url: form.image_url,
        mobile_image_url: form.mobile_image_url || null,
        link_url: form.link_url || null,
        sort_order: form.sort_order,
        is_active: form.is_active,
      });
      setModalOpen(false);
      setFeedback({ type: 'ok', text: form.id ? 'Banner atualizado!' : 'Banner criado!' });
      await loadData();
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Erro ao salvar banner.' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (b: Banner) => {
    try {
      await saveBanner({ ...b, is_active: !b.is_active });
      await loadData();
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Erro ao alterar banner.' });
    }
  };

  const handleDelete = async (b: Banner) => {
    if (!window.confirm(`Excluir o banner "${b.title}"?`)) return;
    try {
      await deleteBanner(b.id);
      setFeedback({ type: 'ok', text: 'Banner excluído.' });
      await loadData();
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Erro ao excluir banner.' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-stone-900">Banners da Capa</h1>
          <p className="text-xs text-stone-500">Carrossel promocional do topo da loja</p>
        </div>
        <button type="button" onClick={openCreate} className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-brand px-4 text-sm font-semibold text-white shadow-sm hover:bg-brand-700">
          <Plus className="h-4 w-4" /> Novo Banner
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
          <ImageIcon className="mx-auto h-8 w-8 text-stone-300" />
          <p className="mt-2 text-sm font-semibold text-stone-700">Nenhum banner cadastrado</p>
          <p className="mt-1 text-xs text-stone-500">Destaque promoções, kits e lançamentos no topo da vitrine.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((b) => (
            <article key={b.id} className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
              <div className="relative h-36 sm:h-44 w-full bg-stone-100">
                <img src={b.image_url} alt={b.title} className="h-full w-full object-cover" />
                <span className="absolute left-3 top-3 rounded-full bg-stone-900/70 px-2.5 py-1 text-[11px] font-semibold text-white">Ordem {b.sort_order}</span>
                {b.mobile_image_url && (
                  <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-brand/90 px-2.5 py-1 text-[11px] font-semibold text-white">
                    <Smartphone className="h-3 w-3" /> Celular
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-bold text-stone-900 truncate">{b.title}</h2>
                  {b.subtitle && <p className="text-xs text-stone-500 truncate">{b.subtitle}</p>}
                  {b.link_url && <p className="mt-1 flex items-center gap-1 text-[11px] text-brand truncate"><Link2 className="h-3 w-3 shrink-0" /> {b.link_url}</p>}
                </div>
                <div className="flex items-center gap-1.5">
                  <button type="button" onClick={() => void handleToggle(b)} className={`min-h-[36px] rounded-full px-3 text-xs font-semibold ${b.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'}`}>{b.is_active ? 'Ativo' : 'Inativo'}</button>
                  <button type="button" onClick={() => openEdit(b)} aria-label="Editar banner" className="flex h-11 w-11 items-center justify-center rounded-xl text-stone-600 hover:bg-stone-100"><Pencil className="h-4 w-4" /></button>
                  <button type="button" onClick={() => void handleDelete(b)} aria-label="Excluir banner" className="flex h-11 w-11 items-center justify-center rounded-xl text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-900/50 p-0 sm:p-4">
          <form onSubmit={handleSubmit} className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-white p-5 space-y-3.5 shadow-xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-stone-900">{form.id ? 'Editar Banner' : 'Novo Banner'}</h2>
              <button type="button" onClick={() => setModalOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-xl bg-stone-100 text-stone-600"><X className="h-5 w-5" /></button>
            </div>
            <input type="text" required value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Título do Banner *" className="h-11 w-full rounded-xl border border-stone-200 px-3 text-sm focus:border-brand focus:outline-none" />
            <input type="text" value={form.subtitle} onChange={(e) => setForm((p) => ({ ...p, subtitle: e.target.value }))} placeholder="Subtítulo (opcional)" className="h-11 w-full rounded-xl border border-stone-200 px-3 text-sm focus:border-brand focus:outline-none" />
            <input type="text" value={form.link_url} onChange={(e) => setForm((p) => ({ ...p, link_url: e.target.value }))} placeholder="Link de destino (ex: /#/categoria/maquiagem)" className="h-11 w-full rounded-xl border border-stone-200 px-3 text-sm focus:border-brand focus:outline-none" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-2xl border border-stone-200 p-3 space-y-2">
                <p className="text-xs font-semibold text-stone-700">Desktop / Horizontal *</p>
                {form.image_url && <img src={form.image_url} alt="Desktop" className="h-24 w-full rounded-xl object-cover" />}
                <label className="flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-brand-300 bg-brand-50 px-3 text-xs font-semibold text-brand">
                  {uploadingSlot === 'desktop' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                  {uploadingSlot === 'desktop' ? 'Otimizando...' : 'Enviar Desktop'}
                  <input type="file" accept="image/*" onChange={handleUpload('desktop')} className="hidden" disabled={uploadingSlot !== null} />
                </label>
              </div>
              <div className="rounded-2xl border border-stone-200 p-3 space-y-2">
                <p className="text-xs font-semibold text-stone-700">Celular / Vertical (opcional)</p>
                {form.mobile_image_url && <img src={form.mobile_image_url} alt="Celular" className="h-24 w-full rounded-xl object-cover" />}
                <div className="flex items-center gap-2">
                  <label className="flex flex-1 min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 text-xs font-semibold text-stone-700">
                    {uploadingSlot === 'mobile' ? <Loader2 className="h-4 w-4 animate-spin text-brand" /> : <Smartphone className="h-4 w-4 text-brand" />}
                    {uploadingSlot === 'mobile' ? 'Otimizando...' : 'Enviar Celular'}
                    <input type="file" accept="image/*" onChange={handleUpload('mobile')} className="hidden" disabled={uploadingSlot !== null} />
                  </label>
                  {form.mobile_image_url && <button type="button" onClick={() => setForm((p) => ({ ...p, mobile_image_url: '' }))} className="text-xs font-semibold text-rose-600 px-2">X</button>}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700">Ordem</label>
                <input type="number" value={form.sort_order} onChange={(e) => setForm((p) => ({ ...p, sort_order: Number(e.target.value) || 0 }))} className="mt-1 h-11 w-full rounded-xl border border-stone-200 px-3 text-sm focus:border-brand focus:outline-none" />
              </div>
              <label className="flex items-end pb-2 gap-2 text-sm font-medium text-stone-700 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))} className="h-5 w-5 rounded accent-brand" />
                Banner ativo
              </label>
            </div>
            <button type="submit" disabled={saving || uploadingSlot !== null} className="min-h-[48px] w-full rounded-2xl bg-brand text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
              {saving ? 'Salvando...' : 'Salvar Banner'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
