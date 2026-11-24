import { Link } from 'react-router-dom';
import { Palette, ShoppingBag, Sparkles } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { formatBRL } from '../../lib/formatters';
import type { StorefrontProduct } from '../../services/storePublicService';

interface ProductCardProps {
  product: StorefrontProduct;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart();

  const variants = product.variants;
  const totalStock = variants.reduce((sum, v) => sum + (v.stock_qty || 0), 0);
  const isOutOfStock = totalStock <= 0;

  const effectivePrices = variants.map((v) =>
    v.promo_price !== null && v.promo_price > 0 && v.promo_price < v.price ? v.promo_price : v.price,
  );
  const minEffective = Math.min(...effectivePrices);
  const maxEffective = Math.max(...effectivePrices);
  const hasPriceRange = maxEffective > minEffective;

  const bestPromoVariant = variants.find(
    (v) => v.promo_price !== null && v.promo_price > 0 && v.promo_price < v.price,
  );
  const maxDiscountPct = variants.reduce((best, v) => {
    if (v.promo_price && v.promo_price > 0 && v.promo_price < v.price) {
      const pct = Math.round(((v.price - v.promo_price) / v.price) * 100);
      return Math.max(best, pct);
    }
    return best;
  }, 0);

  const colorHexes = Array.from(
    new Set(variants.map((v) => v.color_hex).filter((hex): hex is string => Boolean(hex))),
  );
  const visibleColors = colorHexes.slice(0, 5);
  const extraColors = Math.max(0, colorHexes.length - 5);

  const coverUrl = product.images[0]?.image_url || variants[0]?.variant_image_url || '';
  const singleVariant = variants.length === 1 ? variants[0] : null;

  const handleQuickAdd = () => {
    if (!singleVariant || singleVariant.stock_qty <= 0) return;
    const unitPrice =
      singleVariant.promo_price && singleVariant.promo_price > 0 && singleVariant.promo_price < singleVariant.price
        ? singleVariant.promo_price
        : singleVariant.price;
    addItem({
      variantId: singleVariant.id,
      productId: product.id,
      slug: product.slug,
      productName: product.name,
      brand: product.brand ?? '',
      variantName: singleVariant.name,
      colorHex: singleVariant.color_hex ?? '',
      sizeLabel: singleVariant.size_label ?? '',
      imageUrl: singleVariant.variant_image_url || coverUrl,
      unitPrice,
      originalPrice: singleVariant.price,
      maxStock: singleVariant.stock_qty,
    });
  };

  return (
    <article className="group flex flex-col overflow-hidden rounded-3xl border border-stone-200/90 bg-white shadow-sm transition hover:border-brand-200 hover:shadow">
      <Link to={`/produto/${product.slug}`} className="relative block aspect-square bg-brand-50/50 overflow-hidden">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={product.name}
            loading="lazy"
            className={`h-full w-full object-cover transition duration-300 group-hover:scale-105 ${isOutOfStock ? 'opacity-60 grayscale' : ''}`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-brand-300">
            <Sparkles className="h-10 w-10" />
          </div>
        )}

        {maxDiscountPct > 0 && !isOutOfStock && (
          <span className="absolute left-2.5 top-2.5 rounded-full bg-brand px-2.5 py-1 text-[10px] font-extrabold text-white shadow">
            -{maxDiscountPct}% OFF
          </span>
        )}
        {isOutOfStock && (
          <span className="absolute inset-x-3 bottom-3 rounded-full bg-stone-900/80 py-1 text-center text-[11px] font-bold text-white">
            Esgotado
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-3">
        <Link to={`/produto/${product.slug}`} className="flex-1">
          {product.brand && (
            <p className="text-[10px] font-bold uppercase tracking-wider text-brand truncate">
              {product.brand}
            </p>
          )}
          <h3 className="mt-0.5 text-sm font-semibold text-stone-900 line-clamp-2 leading-snug">
            {product.name}
          </h3>

          {visibleColors.length > 0 && (
            <div className="mt-2 flex items-center gap-1">
              {visibleColors.map((hex) => (
                <span
                  key={hex}
                  className="h-4 w-4 rounded-full border border-stone-300 shadow-inner"
                  style={{ backgroundColor: hex }}
                />
              ))}
              {extraColors > 0 && (
                <span className="text-[10px] font-semibold text-stone-500">+{extraColors}</span>
              )}
            </div>
          )}

          <div className="mt-2">
            {!hasPriceRange && bestPromoVariant ? (
              <div className="flex flex-wrap items-baseline gap-1.5">
                <span className="text-[11px] text-stone-400 line-through">
                  {formatBRL(bestPromoVariant.price)}
                </span>
                <span className="text-sm font-extrabold text-brand">
                  {formatBRL(minEffective)}
                </span>
              </div>
            ) : (
              <p className="text-sm font-extrabold text-stone-900">
                {hasPriceRange && (
                  <span className="mr-1 text-[11px] font-medium text-stone-500">A partir de</span>
                )}
                {formatBRL(minEffective)}
              </p>
            )}
          </div>
        </Link>

        <div className="mt-3">
          {isOutOfStock ? (
            <button
              type="button"
              disabled
              className="min-h-[44px] w-full rounded-2xl bg-stone-100 text-xs font-semibold text-stone-400 cursor-not-allowed"
            >
              Esgotado
            </button>
          ) : singleVariant ? (
            <button
              type="button"
              onClick={handleQuickAdd}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-2xl bg-brand px-3 text-xs font-semibold text-white transition hover:bg-brand-700 active:scale-[0.98]"
            >
              <ShoppingBag className="h-4 w-4" /> Adicionar
            </button>
          ) : (
            <Link
              to={`/produto/${product.slug}`}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-2xl border border-brand-200 bg-brand-50 px-3 text-xs font-semibold text-brand transition hover:bg-brand hover:text-white"
            >
              {(product.variant_cta_label ?? '').toLowerCase().includes('aroma') ||
              (product.variant_cta_label ?? '').toLowerCase().includes('fragr') ? (
                <Sparkles className="h-4 w-4" />
              ) : (
                <Palette className="h-4 w-4" />
              )}
              {product.variant_cta_label?.trim() || 'Escolher Tom'}
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
