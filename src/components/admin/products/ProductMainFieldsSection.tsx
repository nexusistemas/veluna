import type { Category } from '../../../types/database';

const VARIANT_LABEL_PRESETS = [
  'Escolher Tom',
  'Escolher Aroma',
  'Escolher Fragrância',
  'Escolher Cor',
  'Escolher Opção',
];

interface ProductMainFieldsSectionProps {
  name: string;
  onNameChange: (value: string) => void;
  categoryId: string;
  onCategoryChange: (value: string) => void;
  categories: Category[];
  brand: string;
  onBrandChange: (value: string) => void;
  variantCtaLabel: string;
  onVariantCtaLabelChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  isFeatured: boolean;
  onFeaturedChange: (value: boolean) => void;
  isFlashSale: boolean;
  onFlashSaleChange: (value: boolean) => void;
  isBestseller: boolean;
  onBestsellerChange: (value: boolean) => void;
  isActive: boolean;
  onActiveChange: (value: boolean) => void;
}

export default function ProductMainFieldsSection(props: ProductMainFieldsSectionProps) {
  const {
    name, onNameChange, categoryId, onCategoryChange, categories,
    brand, onBrandChange, variantCtaLabel, onVariantCtaLabelChange,
    description, onDescriptionChange,
    isFeatured, onFeaturedChange, isFlashSale, onFlashSaleChange,
    isBestseller, onBestsellerChange, isActive, onActiveChange,
  } = props;

  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-4 sm:p-5 shadow-sm space-y-4">
      <h2 className="text-base font-bold text-stone-900">Dados Principais</h2>
      <div>
        <label className="block text-xs font-semibold text-stone-700">Nome do Produto *</label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Ex: Geleia de Banho, Base Líquida Matte Soft"
          className="mt-1 h-12 w-full rounded-2xl border border-stone-200 bg-stone-50 px-3.5 text-sm focus:border-brand focus:bg-white focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-semibold text-stone-700">Categoria</label>
          <select
            value={categoryId}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="mt-1 h-12 w-full rounded-2xl border border-stone-200 bg-stone-50 px-3.5 text-sm focus:border-brand focus:bg-white focus:outline-none"
          >
            <option value="">Sem categoria</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-stone-700">Marca</label>
          <input
            type="text"
            value={brand}
            onChange={(e) => onBrandChange(e.target.value)}
            placeholder="Ex: Veluna, Bruna Tavares, Boca Rosa"
            className="mt-1 h-12 w-full rounded-2xl border border-stone-200 bg-stone-50 px-3.5 text-sm focus:border-brand focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-semibold text-stone-700">
          Texto do Botão de Variação na Vitrine (quando houver 2+ opções)
        </label>
        <input
          type="text"
          value={variantCtaLabel}
          onChange={(e) => onVariantCtaLabelChange(e.target.value)}
          placeholder="Ex: Escolher Aroma, Escolher Tom, Escolher Fragrância"
          className="h-12 w-full rounded-2xl border border-stone-200 bg-stone-50 px-3.5 text-sm focus:border-brand focus:bg-white focus:outline-none"
        />
        <div className="flex flex-wrap gap-1.5">
          {VARIANT_LABEL_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => onVariantCtaLabelChange(preset)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                variantCtaLabel.trim().toLowerCase() === preset.toLowerCase()
                  ? 'border-brand bg-brand-50 text-brand'
                  : 'border-stone-200 bg-stone-50 text-stone-600 hover:border-brand-200 hover:text-brand'
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-stone-700">Descrição</label>
        <textarea
          rows={3}
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Detalhes, modo de uso, aroma, acabamento..."
          className="mt-1 w-full rounded-2xl border border-stone-200 bg-stone-50 p-3.5 text-sm focus:border-brand focus:bg-white focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-2.5 pt-1">
        {[
          { label: 'Destaque na Home', checked: isFeatured, set: onFeaturedChange },
          { label: 'Oferta Relâmpago', checked: isFlashSale, set: onFlashSaleChange },
          { label: 'Mais Vendido', checked: isBestseller, set: onBestsellerChange },
          { label: 'Produto Ativo', checked: isActive, set: onActiveChange },
        ].map((flag) => (
          <label
            key={flag.label}
            className="flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-semibold text-stone-700"
          >
            <input
              type="checkbox"
              checked={flag.checked}
              onChange={(e) => flag.set(e.target.checked)}
              className="h-4 w-4 rounded accent-brand"
            />
            <span>{flag.label}</span>
          </label>
        ))}
      </div>
    </section>
  );
}
