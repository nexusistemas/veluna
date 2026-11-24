import { Link } from 'react-router-dom';
import { AlertTriangle, Package, Pencil, Tag, Trash2 } from 'lucide-react';
import { daysUntilDate, formatBRL } from '../../../lib/formatters';
import type { ProductWithRelations } from '../../../services/productAdminService';

export interface ProductCardSummary {
  totalStock: number;
  hasLowStock: boolean;
  minExpiryDays: number | null;
  hasPromo: boolean;
  minOriginal: number;
  minEffective: number;
  coverUrl: string | null;
}

export function summarizeProduct(product: ProductWithRelations): ProductCardSummary {
  const variants = product.product_variants ?? [];
  const totalStock = variants.reduce((sum, v) => sum + (v.stock_qty || 0), 0);
  const hasLowStock = variants.some((v) => (v.stock_qty || 0) <= 3);

  const expiryValues = variants
    .map((v) => daysUntilDate(v.batch_expiry_date))
    .filter((d): d is number => d !== null);
  const minExpiryDays = expiryValues.length > 0 ? Math.min(...expiryValues) : null;

  const hasPromo =
    product.is_flash_sale ||
    variants.some((v) => v.promo_price !== null && v.promo_price > 0 && v.promo_price < v.price);

  const prices = variants.map((v) => v.price).filter((p) => p > 0);
  const effectivePrices = variants
    .map((v) => (v.promo_price && v.promo_price > 0 ? v.promo_price : v.price))
    .filter((p) => p > 0);

  return {
    totalStock,
    hasLowStock,
    minExpiryDays,
    hasPromo,
    minOriginal: prices.length > 0 ? Math.min(...prices) : 0,
    minEffective: effectivePrices.length > 0 ? Math.min(...effectivePrices) : 0,
    coverUrl: product.product_images?.[0]?.image_url ?? null,
  };
}

interface ProductListCardProps {
  product: ProductWithRelations;
  onToggleActive: (product: ProductWithRelations) => void;
  onDelete: (product: ProductWithRelations) => void;
}

export default function ProductListCard({
  product,
  onToggleActive,
  onDelete,
}: ProductListCardProps) {
  const s = summarizeProduct(product);

  return (
    <article className="rounded-2xl border border-stone-200 bg-white p-3.5 shadow-sm">
      <div className="flex gap-3">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-brand-50 flex items-center justify-center border border-stone-100">
          {s.coverUrl ? (
            <img src={s.coverUrl} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <Package className="h-6 w-6 text-brand" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-stone-900 truncate">{product.name}</h2>
              <p className="text-xs text-stone-500 truncate">
                {[product.brand, product.category?.name].filter(Boolean).join(' • ') || 'Sem categoria'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onToggleActive(product)}
              className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                product.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'
              }`}
            >
              {product.is_active ? 'Ativo' : 'Inativo'}
            </button>
          </div>

          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 text-sm">
            {s.hasPromo && s.minEffective < s.minOriginal ? (
              <>
                <span className="text-xs text-stone-400 line-through">{formatBRL(s.minOriginal)}</span>
                <span className="font-bold text-brand">{formatBRL(s.minEffective)}</span>
              </>
            ) : (
              <span className="font-bold text-stone-900">{formatBRL(s.minEffective)}</span>
            )}
            <span className="text-xs text-stone-500">
              • {product.product_variants.length} var. • Estoque: <strong>{s.totalStock}</strong>
            </span>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {s.totalStock === 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-800">
                <AlertTriangle className="h-3 w-3" /> Sem estoque
              </span>
            ) : s.hasLowStock ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                Estoque baixo
              </span>
            ) : null}
            {s.minExpiryDays !== null && s.minExpiryDays <= 60 && (
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.minExpiryDays <= 0 ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>
                <AlertTriangle className="h-3 w-3" />
                {s.minExpiryDays <= 0 ? 'Lote vencido' : `Vence em ${s.minExpiryDays}d`}
              </span>
            )}
            {s.hasPromo && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand">
                <Tag className="h-3 w-3" /> Oferta
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex justify-end gap-2 border-t border-stone-100 pt-2.5">
        <Link
          to={`/painel/produtos/${product.id}`}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-stone-200 px-3.5 text-xs font-semibold text-stone-700 hover:border-brand-200 hover:text-brand"
        >
          <Pencil className="h-3.5 w-3.5" /> Editar
        </Link>
        <button
          type="button"
          onClick={() => onDelete(product)}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
        >
          <Trash2 className="h-3.5 w-3.5" /> Excluir
        </button>
      </div>
    </article>
  );
}
