import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Package, Plus, Search } from 'lucide-react';
import ProductListCard, { summarizeProduct } from '../../components/admin/products/ProductListCard';
import {
  deleteProductAdmin,
  listProductsAdmin,
  toggleProductActive,
  type ProductWithRelations,
} from '../../services/productAdminService';

type FilterChip = 'all' | 'low_stock' | 'expiring' | 'promo';

const FILTER_CHIPS: Array<{ id: FilterChip; label: string }> = [
  { id: 'all', label: 'Todos' },
  { id: 'low_stock', label: 'Estoque Baixo' },
  { id: 'expiring', label: 'Vencendo (60d)' },
  { id: 'promo', label: 'Em Oferta' },
];

export default function ProductsListPage() {
  const [products, setProducts] = useState<ProductWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterChip>('all');
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      setProducts(await listProductsAdmin());
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Erro ao carregar produtos.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredProducts = useMemo(() => {
    const term = query.trim().toLowerCase();
    return products.filter((product) => {
      const stats = summarizeProduct(product);
      if (filter === 'low_stock' && !stats.hasLowStock) return false;
      if (filter === 'expiring' && (stats.minExpiryDays === null || stats.minExpiryDays > 60)) return false;
      if (filter === 'promo' && !stats.hasPromo) return false;

      if (!term) return true;
      if (product.name.toLowerCase().includes(term)) return true;
      if (product.brand?.toLowerCase().includes(term)) return true;
      return product.product_variants.some(
        (v) =>
          (v.ean_barcode?.toLowerCase().includes(term) ?? false) ||
          (v.sku?.toLowerCase().includes(term) ?? false),
      );
    });
  }, [products, query, filter]);

  const handleToggle = async (product: ProductWithRelations) => {
    try {
      await toggleProductActive(product.id, !product.is_active);
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, is_active: !p.is_active } : p)),
      );
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Erro ao alterar status.' });
    }
  };

  const handleDelete = async (product: ProductWithRelations) => {
    if (!window.confirm(`Excluir o produto "${product.name}" e suas variantes?`)) return;
    try {
      await deleteProductAdmin(product.id);
      setFeedback({ type: 'ok', text: 'Produto excluído.' });
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Erro ao excluir produto.' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-stone-900">Produtos</h1>
          <p className="text-xs text-stone-500">{products.length} item(ns) no catálogo</p>
        </div>
        <Link
          to="/painel/produtos/novo"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-brand px-4 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" /> + Novo Produto
        </Link>
      </div>

      <div className="space-y-2.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome, marca ou código de barras..."
            className="h-12 w-full rounded-2xl border border-stone-200 bg-white pl-10 pr-4 text-sm shadow-sm focus:border-brand focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {FILTER_CHIPS.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setFilter(chip.id)}
              className={`min-h-[38px] shrink-0 rounded-full px-3.5 text-xs font-semibold transition ${
                filter === chip.id
                  ? 'bg-brand text-white shadow-sm'
                  : 'border border-stone-200 bg-white text-stone-600 hover:border-brand-200'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {feedback && (
        <div className={`rounded-2xl border px-4 py-3 text-sm ${feedback.type === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
          {feedback.text}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12 text-stone-400"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : filteredProducts.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-stone-300 bg-white p-8 text-center">
          <Package className="mx-auto h-8 w-8 text-stone-300" />
          <p className="mt-2 text-sm font-semibold text-stone-700">Nenhum produto encontrado</p>
          <p className="mt-1 text-xs text-stone-500">Cadastre seu primeiro cosmético ou limpe os filtros.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProducts.map((product) => (
            <ProductListCard
              key={product.id}
              product={product}
              onToggleActive={(p) => void handleToggle(p)}
              onDelete={(p) => void handleDelete(p)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
