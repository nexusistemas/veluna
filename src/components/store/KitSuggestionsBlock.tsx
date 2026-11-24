import { Link } from 'react-router-dom';
import { Plus, Sparkles } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { formatBRL } from '../../lib/formatters';
import type { StorefrontProduct } from '../../services/storePublicService';

interface KitSuggestionsBlockProps {
  product: StorefrontProduct;
  allProducts: StorefrontProduct[];
}

export default function KitSuggestionsBlock({
  product,
  allProducts,
}: KitSuggestionsBlockProps) {
  const { addItem } = useCart();

  const suggestions = product.kit_suggestions
    .map((kit) => {
      const target = allProducts.find((p) => p.id === kit.suggested_product_id);
      if (!target) return null;
      const availableVariant = target.variants.find((v) => v.stock_qty > 0);
      if (!availableVariant) return null;
      return { kit, target, variant: availableVariant };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  if (suggestions.length === 0) return null;

  return (
    <section className="rounded-3xl border border-brand-100 bg-brand-50/50 p-4 sm:p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-brand" aria-hidden="true" />
        <h2 className="text-base font-bold text-stone-900">Compre Junto e Combine ✨</h2>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {suggestions.map(({ kit, target, variant }) => {
          const basePrice =
            variant.promo_price && variant.promo_price > 0 && variant.promo_price < variant.price
              ? variant.promo_price
              : variant.price;
          const coverUrl = variant.variant_image_url || target.images[0]?.image_url || '';

          const handleAdd = () => {
            addItem({
              variantId: variant.id,
              productId: target.id,
              slug: target.slug,
              productName: target.name,
              brand: target.brand ?? '',
              variantName: variant.name,
              colorHex: variant.color_hex ?? '',
              sizeLabel: variant.size_label ?? '',
              imageUrl: coverUrl,
              unitPrice: basePrice,
              originalPrice: variant.price,
              maxStock: variant.stock_qty,
            });
          };

          return (
            <div
              key={target.id}
              className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm"
            >
              <Link
                to={`/produto/${target.slug}`}
                className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-brand-50 flex items-center justify-center"
              >
                {coverUrl ? (
                  <img src={coverUrl} alt={target.name} className="h-full w-full object-cover" />
                ) : (
                  <Sparkles className="h-5 w-5 text-brand-300" />
                )}
              </Link>
              <div className="min-w-0 flex-1">
                <Link to={`/produto/${target.slug}`} className="text-xs font-bold text-stone-900 line-clamp-2 hover:text-brand">
                  {target.name}
                </Link>
                <p className="text-[11px] text-stone-500 truncate">{variant.name}</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="text-xs font-extrabold text-brand">{formatBRL(basePrice)}</span>
                  {kit.discount_percent > 0 && (
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand">
                      Kit -{kit.discount_percent}%
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={handleAdd}
                className="inline-flex min-h-[44px] shrink-0 items-center gap-1 rounded-xl bg-brand px-3 text-xs font-semibold text-white hover:bg-brand-700"
              >
                <Plus className="h-4 w-4" /> Levar
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
