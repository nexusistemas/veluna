import type { FormEvent } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Package,
  Plus,
  ScanBarcode,
  Search,
  X,
} from 'lucide-react';
import { formatBRL } from '../../../lib/formatters';
import type { PosCatalogItem } from '../../../services/ordersAdminService';

interface PosProductPickerProps {
  items: PosCatalogItem[];
  loading: boolean;
  search: string;
  onSearchChange: (val: string) => void;
  onExactBarcodeSubmit: (code: string) => void;
  cartQuantities: Record<string, number>;
  onAddItem: (item: PosCatalogItem) => void;
  onOpenScanner: () => void;
  scanFeedback: { type: 'ok' | 'error'; text: string } | null;
}

export default function PosProductPicker({
  items,
  loading,
  search,
  onSearchChange,
  onExactBarcodeSubmit,
  cartQuantities,
  onAddItem,
  onOpenScanner,
  scanFeedback,
}: PosProductPickerProps) {
  const query = search.trim().toLowerCase();

  const filtered = query
    ? items.filter((it) => {
        const haystack = [
          it.productName,
          it.brand ?? '',
          it.variantName,
          it.colorName ?? '',
          it.sku ?? '',
          it.eanBarcode ?? '',
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(query);
      })
    : items;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (search.trim()) {
      onExactBarcodeSubmit(search.trim());
    }
  };

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar produto, marca, tom, SKU ou EAN..."
            className="h-12 w-full rounded-2xl border border-stone-200 bg-white pl-10 pr-10 text-sm shadow-sm focus:border-brand focus:outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Limpar busca"
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onOpenScanner}
          className="inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-2xl bg-brand px-5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-700 active:scale-[0.98]"
        >
          <ScanBarcode className="h-5 w-5" />
          <span>Bipar Código</span>
        </button>
      </form>

      {scanFeedback && (
        <div
          role="status"
          className={`flex items-center gap-2 rounded-2xl border px-3.5 py-2.5 text-xs font-semibold ${
            scanFeedback.type === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-800'
          }`}
        >
          {scanFeedback.type === 'ok' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          )}
          <span>{scanFeedback.text}</span>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-stone-400">
          <Loader2 className="h-7 w-7 animate-spin text-brand" />
          <p className="text-xs font-medium">Carregando catálogo do balcão...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-stone-200 bg-white p-8 text-center space-y-2">
          <Package className="mx-auto h-10 w-10 text-stone-300" />
          <p className="text-sm font-bold text-stone-800">Nenhum cosmético encontrado</p>
          <p className="text-xs text-stone-500">
            Tente outro termo ou bipe o código de barras do produto.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((item) => {
            const qtyInCart = cartQuantities[item.variantId] ?? 0;
            const outOfStock = item.stockQty <= 0;
            const maxedOut = qtyInCart >= item.stockQty;
            const disabled = outOfStock || maxedOut;

            return (
              <button
                key={item.variantId}
                type="button"
                disabled={disabled}
                onClick={() => onAddItem(item)}
                className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition active:scale-[0.98] ${
                  qtyInCart > 0
                    ? 'border-brand ring-1 ring-brand/30'
                    : 'border-stone-200 hover:border-brand-200'
                } ${disabled ? 'opacity-55 cursor-not-allowed' : ''}`}
              >
                <div className="relative h-28 w-full bg-stone-100">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.productName}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-stone-300">
                      <Package className="h-8 w-8" />
                    </div>
                  )}

                  {qtyInCart > 0 && (
                    <span className="absolute right-2 top-2 inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-brand px-1.5 text-xs font-extrabold text-white shadow">
                      {qtyInCart}
                    </span>
                  )}

                  <span
                    className={`absolute bottom-1.5 left-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      outOfStock
                        ? 'bg-rose-600 text-white'
                        : item.stockQty <= 3
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-white/90 text-stone-700'
                    }`}
                  >
                    {outOfStock ? 'Sem estoque' : `Est: ${item.stockQty}`}
                  </span>
                </div>

                <div className="flex flex-1 flex-col justify-between p-2.5 space-y-1.5">
                  <div>
                    {item.brand && (
                      <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                        {item.brand}
                      </p>
                    )}
                    <p className="line-clamp-2 text-xs font-bold leading-snug text-stone-900">
                      {item.productName}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5">
                      {item.colorHex && (
                        <span
                          className="h-3.5 w-3.5 shrink-0 rounded-full border border-stone-300"
                          style={{ backgroundColor: item.colorHex }}
                        />
                      )}
                      <span className="truncate text-[11px] font-medium text-stone-600">
                        {item.variantName}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-end justify-between gap-1 pt-1">
                    <div>
                      {item.promoPrice !== null && item.promoPrice < item.price && (
                        <p className="text-[10px] text-stone-400 line-through">
                          {formatBRL(item.price)}
                        </p>
                      )}
                      <p className="text-sm font-extrabold text-brand">
                        {formatBRL(item.effectivePrice)}
                      </p>
                    </div>
                    {!disabled && (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand group-hover:bg-brand group-hover:text-white transition">
                        <Plus className="h-4 w-4" />
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
