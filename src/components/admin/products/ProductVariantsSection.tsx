import { Plus } from 'lucide-react';
import type { ProductVariantDraft } from '../../../services/productAdminService';
import ProductVariantCard from './ProductVariantCard';

export function createEmptyVariant(name = ''): ProductVariantDraft {
  return {
    name,
    color_name: '',
    color_hex: null,
    size_label: '',
    ean_barcode: '',
    sku: '',
    cost_price: null,
    price: 0,
    promo_price: null,
    stock_qty: 0,
    batch_expiry_date: null,
    variant_image_url: null,
    is_active: true,
  };
}

interface ProductVariantsSectionProps {
  variants: ProductVariantDraft[];
  onChange: (next: ProductVariantDraft[]) => void;
}

export default function ProductVariantsSection({
  variants,
  onChange,
}: ProductVariantsSectionProps) {
  const handleAdd = () => {
    onChange([...variants, createEmptyVariant('')]);
  };

  const handleUpdate = (index: number, patch: Partial<ProductVariantDraft>) => {
    onChange(variants.map((item, idx) => (idx === index ? { ...item, ...patch } : item)));
  };

  const handleRemove = (index: number) => {
    if (variants.length <= 1) return;
    onChange(variants.filter((_, idx) => idx !== index));
  };

  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-4 sm:p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-stone-900">Variantes, Tons e Estoque</h2>
          <p className="text-xs text-stone-500">
            Cadastre tons, tamanhos, custo, lucro e validade por lote
          </p>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-2xl border border-brand-200 bg-brand-50 px-3.5 text-xs font-semibold text-brand hover:bg-brand-100"
        >
          <Plus className="h-4 w-4" /> Adicionar Variante
        </button>
      </div>

      <div className="space-y-3">
        {variants.map((variant, index) => (
          <ProductVariantCard
            key={variant.id ?? `new-${index}`}
            variant={variant}
            index={index}
            canRemove={variants.length > 1}
            onUpdate={(patch) => handleUpdate(index, patch)}
            onRemove={() => handleRemove(index)}
          />
        ))}
      </div>
    </section>
  );
}
