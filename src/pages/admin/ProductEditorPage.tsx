import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Loader2, Save } from 'lucide-react';
import ProductImagesSection from '../../components/admin/products/ProductImagesSection';
import ProductKitsSection from '../../components/admin/products/ProductKitsSection';
import ProductMainFieldsSection from '../../components/admin/products/ProductMainFieldsSection';
import ProductVariantsSection, {
  createEmptyVariant,
} from '../../components/admin/products/ProductVariantsSection';
import { listCategoriesAdmin } from '../../services/marketingAdminService';
import {
  getProductFullAdmin,
  listActiveProductsSummary,
  saveProductFullAdmin,
  type ProductImageDraft,
  type ProductKitDraft,
  type ProductSummaryOption,
  type ProductVariantDraft,
} from '../../services/productAdminService';
import type { Category } from '../../types/database';

export default function ProductEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [kitOptions, setKitOptions] = useState<ProductSummaryOption[]>([]);

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brand, setBrand] = useState('');
  const [variantCtaLabel, setVariantCtaLabel] = useState('Escolher Tom');
  const [description, setDescription] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [isFlashSale, setIsFlashSale] = useState(false);
  const [isBestseller, setIsBestseller] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const [images, setImages] = useState<ProductImageDraft[]>([]);
  const [variants, setVariants] = useState<ProductVariantDraft[]>([createEmptyVariant('Padrão')]);
  const [kits, setKits] = useState<ProductKitDraft[]>([]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const [cats, options, fullProduct] = await Promise.all([
          listCategoriesAdmin(),
          listActiveProductsSummary(id),
          id ? getProductFullAdmin(id) : Promise.resolve(null),
        ]);
        if (!active) return;
        setCategories(cats);
        setKitOptions(options);

        if (fullProduct) {
          setName(fullProduct.name);
          setCategoryId(fullProduct.category_id ?? '');
          setBrand(fullProduct.brand ?? '');
          setVariantCtaLabel(fullProduct.variant_cta_label?.trim() || 'Escolher Tom');
          setDescription(fullProduct.description ?? '');
          setIsFeatured(fullProduct.is_featured);
          setIsFlashSale(fullProduct.is_flash_sale);
          setIsBestseller(fullProduct.is_bestseller);
          setIsActive(fullProduct.is_active);
          setImages(fullProduct.product_images.map((img) => ({ id: img.id, image_url: img.image_url })));
          setVariants(
            fullProduct.product_variants.length > 0
              ? fullProduct.product_variants.map((v) => ({
                  id: v.id, name: v.name, color_name: v.color_name ?? '', color_hex: v.color_hex,
                  size_label: v.size_label ?? '', ean_barcode: v.ean_barcode ?? '', sku: v.sku ?? '',
                  cost_price: v.cost_price, price: v.price, promo_price: v.promo_price,
                  stock_qty: v.stock_qty, batch_expiry_date: v.batch_expiry_date,
                  variant_image_url: v.variant_image_url, is_active: v.is_active,
                }))
              : [createEmptyVariant('Padrão')],
          );
          setKits(
            fullProduct.product_kits.map((k) => ({
              suggested_product_id: k.suggested_product_id,
              discount_percent: k.discount_percent,
            })),
          );
        }
      } catch (err) {
        if (active) setErrorMsg(err instanceof Error ? err.message : 'Erro ao carregar produto.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [id]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMsg(null);
    if (!name.trim()) {
      setErrorMsg('Informe o nome do produto.');
      return;
    }
    const validVariants = variants.filter((v) => v.name.trim() && v.price > 0);
    if (validVariants.length === 0 || validVariants.length !== variants.length) {
      setErrorMsg('Preencha nome e preço de venda válido (maior que zero) em todas as variantes.');
      return;
    }
    setSaving(true);
    try {
      await saveProductFullAdmin({
        id, name, category_id: categoryId || null, brand,
        variant_cta_label: variantCtaLabel, description,
        is_featured: isFeatured, is_flash_sale: isFlashSale,
        is_bestseller: isBestseller, is_active: isActive,
        images, variants, kits,
      });
      navigate('/painel/produtos', { replace: true });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao salvar produto.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16 text-stone-400">
        <Loader2 className="h-7 w-7 animate-spin" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pb-20">
      <div className="flex items-center gap-3">
        <Link
          to="/painel/produtos"
          aria-label="Voltar para produtos"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-stone-200 bg-white text-stone-700 hover:border-brand-200 hover:text-brand"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-stone-900">
            {isEditing ? 'Editar Produto' : 'Novo Produto'}
          </h1>
          <p className="text-xs text-stone-500">Informações gerais, fotos WebP, variações e estoque</p>
        </div>
      </div>

      {errorMsg && (
        <div role="alert" className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      <ProductMainFieldsSection
        name={name} onNameChange={setName}
        categoryId={categoryId} onCategoryChange={setCategoryId} categories={categories}
        brand={brand} onBrandChange={setBrand}
        variantCtaLabel={variantCtaLabel} onVariantCtaLabelChange={setVariantCtaLabel}
        description={description} onDescriptionChange={setDescription}
        isFeatured={isFeatured} onFeaturedChange={setIsFeatured}
        isFlashSale={isFlashSale} onFlashSaleChange={setIsFlashSale}
        isBestseller={isBestseller} onBestsellerChange={setIsBestseller}
        isActive={isActive} onActiveChange={setIsActive}
      />

      <ProductImagesSection images={images} onChange={setImages} />
      <ProductVariantsSection variants={variants} onChange={setVariants} />
      <ProductKitsSection kits={kits} availableProducts={kitOptions} onChange={setKits} />

      <div className="sticky bottom-16 md:bottom-4 z-10 flex items-center justify-end gap-3 rounded-2xl border border-brand-100 bg-white/95 p-3 shadow-lg backdrop-blur">
        <Link to="/painel/produtos" className="inline-flex min-h-[48px] items-center rounded-2xl border border-stone-200 px-4 text-sm font-semibold text-stone-600 hover:bg-stone-50">
          Cancelar
        </Link>
        <button type="submit" disabled={saving} className="inline-flex min-h-[48px] flex-1 sm:flex-none items-center justify-center gap-2 rounded-2xl bg-brand px-6 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Salvando...' : 'Salvar Produto'}
        </button>
      </div>
    </form>
  );
}
