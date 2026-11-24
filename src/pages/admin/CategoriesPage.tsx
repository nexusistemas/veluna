import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { FolderTree, ImagePlus, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { slugify } from '../../lib/formatters';
import { uploadCatalogImage } from '../../lib/imageWebp';
import { deleteCategory, listCategoriesAdmin, saveCategory } from '../../services/marketingAdminService';
import type { Category } from '../../types/database';

interface CategoryFormState {
  id?: string;
  name: string;
  image_url: string;
  sort_order: number;
  is_active: boolean;
}

const EMPTY_FORM: CategoryFormState = { name: '', image_url: '', sort_order: 0, is_active: true };

export default function CategoriesPage() {
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<CategoryFormState>(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await listCategoriesAdmin());
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Erro ao carregar categorias.' });
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

  const openEdit = (cat: Category) => {
    setForm({ id: cat.id, name: cat.name, image_url: cat.image_url ?? '', sort_order: cat.sort_order, is_active: cat.is_active });
    setModalOpen(true);
  };

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const publicUrl = await uploadCatalogImage(file, 'categories', 800);
      setForm((prev) => ({ ...prev, image_url: publicUrl }));
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Erro ao enviar imagem.' });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    setFeedback(null);
    try {
      await saveCategory({
        id: form.id,
        name: form.name,
        slug: slugify(form.name),
        image_url: form.image_url || null,
        sort_order: form.sort_order,
        is_active: form.is_active,
      });
      setModalOpen(false);
      setFeedback({ type: 'ok', text: form.id ? 'Categoria atualizada!' : 'Categoria criada!' });
      await loadData();
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Erro ao salvar categoria.' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (cat: Category) => {
    try {
      await saveCategory({ ...cat, is_active: !cat.is_active });
      await loadData();
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Erro ao alterar status.' });
    }
  };

  const handleDelete = async (cat: Category) => {
    if (!window.confirm(`Excluir a categoria "${cat.name}"?`)) return;
    try {
      await deleteCategory(cat.id);
      setFeedback({ type: 'ok', text: 'Categoria removida.' });
      await loadData();
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Erro ao excluir categoria.' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-stone-900">Categorias</h1>
          <p className="text-xs text-stone-500">Organize as seções do catálogo da loja</p>
        </div>
        <button type="button" onClick={openCreate} className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-brand px-4 text-sm font-semibold text-white shadow-sm hover:bg-brand-700">
          <Plus className="h-4 w-4" /> Nova Categoria
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
          <FolderTree className="mx-auto h-8 w-8 text-stone-300" />
          <p className="mt-2 text-sm font-semibold text-stone-700">Nenhuma categoria cadastrada</p>
          <p className="mt-1 text-xs text-stone-500">Crie categorias como Skincare, Maquiagem ou Perfumes.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {items.map((cat) => (
            <article key={cat.id} className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-3.5 shadow-sm">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-brand-50 flex items-center justify-center">
                {cat.image_url ? <img src={cat.image_url} alt={cat.name} className="h-full w-full object-cover" /> : <FolderTree className="h-5 w-5 text-brand" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-stone-900 truncate">{cat.name}</p>
                <p className="text-xs text-stone-500 truncate">/{cat.slug} • Ordem {cat.sort_order}</p>
                <button type="button" onClick={() => void handleToggle(cat)} className={`mt-1.5 inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cat.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'}`}>
                  {cat.is_active ? 'Ativa' : 'Inativa'}
                </button>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => openEdit(cat)} aria-label="Editar categoria" className="flex h-11 w-11 items-center justify-center rounded-xl text-stone-600 hover:bg-stone-100"><Pencil className="h-4 w-4" /></button>
                <button type="button" onClick={() => void handleDelete(cat)} aria-label="Excluir categoria" className="flex h-11 w-11 items-center justify-center rounded-xl text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
              </div>
            </article>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-900/50 p-0 sm:p-4">
          <form onSubmit={handleSubmit} className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white p-5 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-stone-900">{form.id ? 'Editar Categoria' : 'Nova Categoria'}</h2>
              <button type="button" onClick={() => setModalOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-xl bg-stone-100 text-stone-600"><X className="h-5 w-5" /></button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700">Nome *</label>
              <input type="text" required value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Ex: Maquiagem" className="mt-1 h-11 w-full rounded-xl border border-stone-200 px-3 text-sm focus:border-brand focus:outline-none" />
              {form.name && <p className="mt-1 text-[11px] text-stone-400">Slug: /{slugify(form.name)}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700">Ordem</label>
                <input type="number" value={form.sort_order} onChange={(e) => setForm((p) => ({ ...p, sort_order: Number(e.target.value) || 0 }))} className="mt-1 h-11 w-full rounded-xl border border-stone-200 px-3 text-sm focus:border-brand focus:outline-none" />
              </div>
              <label className="flex items-end pb-2 gap-2 text-sm font-medium text-stone-700 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))} className="h-5 w-5 rounded accent-brand" />
                Ativa na loja
              </label>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">Imagem da Categoria (opcional)</label>
              <div className="flex items-center gap-3">
                {form.image_url && <img src={form.image_url} alt="Prévia" className="h-14 w-14 rounded-xl object-cover border border-stone-200" />}
                <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3.5 text-xs font-semibold text-stone-700 hover:border-brand">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin text-brand" /> : <ImagePlus className="h-4 w-4 text-brand" />}
                  {uploading ? 'Otimizando...' : 'Escolher Foto'}
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
                </label>
                {form.image_url && <button type="button" onClick={() => setForm((p) => ({ ...p, image_url: '' }))} className="text-xs font-medium text-rose-600 px-2 py-2">Remover</button>}
              </div>
            </div>
            <button type="submit" disabled={saving || uploading} className="min-h-[48px] w-full rounded-2xl bg-brand text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
              {saving ? 'Salvando...' : 'Salvar Categoria'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
