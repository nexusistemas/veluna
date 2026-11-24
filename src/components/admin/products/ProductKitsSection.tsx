import { useMemo, useState } from 'react';
import { Package, Plus, Search, Sparkles, Trash2 } from 'lucide-react';
import type {
  ProductKitDraft,
  ProductSummaryOption,
} from '../../../services/productAdminService';

interface ProductKitsSectionProps {
  kits: ProductKitDraft[];
  availableProducts: ProductSummaryOption[];
  onChange: (next: ProductKitDraft[]) => void;
}

export default function ProductKitsSection({
  kits,
  availableProducts,
  onChange,
}: ProductKitsSectionProps) {
  const [query, setQuery] = useState('');

  const selectedIds = useMemo(() => new Set(kits.map((k) => k.suggested_product_id)), [kits]);

  const filteredOptions = useMemo(() => {
    const term = query.trim().toLowerCase();
    return availableProducts
      .filter((item) => !selectedIds.has(item.id))
      .filter((item) => {
        if (!term) return true;
        return (
          item.name.toLowerCase().includes(term) ||
          (item.brand?.toLowerCase().includes(term) ?? false)
        );
      })
      .slice(0, 6);
  }, [availableProducts, query, selectedIds]);

  const addKit = (productId: string) => {
    onChange([...kits, { suggested_product_id: productId, discount_percent: 0 }]);
    setQuery('');
  };

  const updateDiscount = (productId: string, discount: number) => {
    onChange(
      kits.map((item) =>
        item.suggested_product_id === productId
          ? { ...item, discount_percent: Math.min(90, Math.max(0, discount)) }
          : item,
      ),
    );
  };

  const removeKit = (productId: string) => {
    onChange(kits.filter((item) => item.suggested_product_id !== productId));
  };

  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-4 sm:p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-brand" aria-hidden="true" />
        <div>
          <h2 className="text-base font-bold text-stone-900">Compre Junto / Sugestão no Carrinho</h2>
          <p className="text-xs text-stone-500">
            Sugira produtos complementares com desconto opcional no carrinho
          </p>
        </div>
      </div>

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
          aria-hidden="true"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar produto ativo para sugerir junto..."
          className="h-11 w-full rounded-2xl border border-stone-200 bg-stone-50 pl-10 pr-3 text-sm focus:border-brand focus:bg-white focus:outline-none"
        />
      </div>

      {filteredOptions.length > 0 && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {filteredOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => addKit(option.id)}
              className="flex min-h-[48px] items-center justify-between gap-2 rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2 text-left transition hover:border-brand-200 hover:bg-brand-50"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-white flex items-center justify-center border border-stone-200">
                  {option.cover_url ? (
                    <img src={option.cover_url} alt={option.name} className="h-full w-full object-cover" />
                  ) : (
                    <Package className="h-4 w-4 text-stone-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-stone-900 truncate">{option.name}</p>
                  {option.brand && <p className="text-[11px] text-stone-500 truncate">{option.brand}</p>}
                </div>
              </div>
              <Plus className="h-4 w-4 shrink-0 text-brand" />
            </button>
          ))}
        </div>
      )}

      {kits.length > 0 && (
        <div className="space-y-2 border-t border-stone-100 pt-3">
          <p className="text-xs font-semibold text-stone-600">Sugestões vinculadas ({kits.length})</p>
          {kits.map((kit) => {
            const product = availableProducts.find((p) => p.id === kit.suggested_product_id);
            return (
              <div
                key={kit.suggested_product_id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-brand-100 bg-brand-50/50 px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-stone-900 truncate">
                    {product?.name ?? 'Produto vinculado'}
                  </p>
                  {product?.brand && <p className="text-[11px] text-stone-500">{product.brand}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs text-stone-600">
                    <span>Desc. %</span>
                    <input
                      type="number"
                      min="0"
                      max="90"
                      value={kit.discount_percent}
                      onChange={(e) => updateDiscount(kit.suggested_product_id, Number(e.target.value) || 0)}
                      className="h-9 w-16 rounded-xl border border-stone-200 bg-white px-2 text-center text-xs font-semibold focus:border-brand focus:outline-none"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => removeKit(kit.suggested_product_id)}
                    aria-label="Remover sugestão"
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-rose-600 hover:bg-rose-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
