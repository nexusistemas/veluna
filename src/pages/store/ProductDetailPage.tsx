import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Loader2,
  Minus,
  Plus,
  Share2,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import KitSuggestionsBlock from '../../components/store/KitSuggestionsBlock';
import ProductGallery from '../../components/store/ProductGallery';
import StoreHeader from '../../components/store/StoreHeader';
import { useCart } from '../../contexts/CartContext';
import { formatBRL } from '../../lib/formatters';
import { fetchStorefrontCatalog, type StorefrontProduct } from '../../services/storePublicService';

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { addItem } = useCart();

  const [allProducts, setAllProducts] = useState<StorefrontProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [activeImageUrl, setActiveImageUrl] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchStorefrontCatalog()
      .then((data) => {
        if (!active) return;
        setAllProducts(data.products);
        const found = data.products.find((p) => p.slug === slug);
        if (found) {
          const initialVariant = found.variants.find((v) => v.stock_qty > 0) ?? found.variants[0];
          setSelectedVariantId(initialVariant?.id ?? '');
          setActiveImageUrl(initialVariant?.variant_image_url || found.images[0]?.image_url || '');
          setQuantity(1);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  const product = useMemo(() => allProducts.find((p) => p.slug === slug) ?? null, [allProducts, slug]);
  const selectedVariant = useMemo(
    () => product?.variants.find((v) => v.id === selectedVariantId) ?? product?.variants[0] ?? null,
    [product, selectedVariantId],
  );

  const galleryUrls = useMemo(() => {
    if (!product) return [];
    const urls = [
      ...product.images.map((i) => i.image_url),
      ...product.variants.map((v) => v.variant_image_url).filter((u): u is string => Boolean(u)),
    ];
    return Array.from(new Set(urls));
  }, [product]);

  const handleSelectVariant = (variantId: string) => {
    setSelectedVariantId(variantId);
    setQuantity(1);
    const chosen = product?.variants.find((v) => v.id === variantId);
    if (chosen?.variant_image_url) {
      setActiveImageUrl(chosen.variant_image_url);
    } else if (!activeImageUrl && product?.images[0]?.image_url) {
      setActiveImageUrl(product.images[0].image_url);
    }
  };

  const handleShare = async () => {
    if (!product) return;
    const shareUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: product.name, text: `Olha esse cosmético na Veluna: ${product.name}`, url: shareUrl });
        return;
      } catch {
        // Fallback para copiar link
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Ignora erro de clipboard
    }
  };

  const handleAddToCart = () => {
    if (!product || !selectedVariant || selectedVariant.stock_qty <= 0) return;
    const unitPrice =
      selectedVariant.promo_price && selectedVariant.promo_price > 0 && selectedVariant.promo_price < selectedVariant.price
        ? selectedVariant.promo_price
        : selectedVariant.price;
    addItem(
      {
        variantId: selectedVariant.id,
        productId: product.id,
        slug: product.slug,
        productName: product.name,
        brand: product.brand ?? '',
        variantName: selectedVariant.name,
        colorHex: selectedVariant.color_hex ?? '',
        sizeLabel: selectedVariant.size_label ?? '',
        imageUrl: selectedVariant.variant_image_url || product.images[0]?.image_url || '',
        unitPrice,
        originalPrice: selectedVariant.price,
        maxStock: selectedVariant.stock_qty,
      },
      quantity,
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50">
        <StoreHeader />
        <div className="flex justify-center py-20 text-brand"><Loader2 className="h-7 w-7 animate-spin" /></div>
      </div>
    );
  }

  if (!product || !selectedVariant) {
    return (
      <div className="min-h-screen bg-stone-50">
        <StoreHeader />
        <main className="mx-auto max-w-lg px-4 py-16 text-center space-y-4">
          <Sparkles className="mx-auto h-10 w-10 text-brand-300" />
          <h1 className="text-lg font-bold text-stone-900">Produto não encontrado</h1>
          <Link to="/" className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-brand px-5 text-sm font-semibold text-white">
            <ArrowLeft className="h-4 w-4" /> Voltar para a loja
          </Link>
        </main>
      </div>
    );
  }

  const hasPromo =
    selectedVariant.promo_price !== null &&
    selectedVariant.promo_price > 0 &&
    selectedVariant.promo_price < selectedVariant.price;
  const effectivePrice = hasPromo ? (selectedVariant.promo_price as number) : selectedVariant.price;
  const isOutOfStock = selectedVariant.stock_qty <= 0;

  return (
    <div className="min-h-screen bg-stone-50">
      <StoreHeader />
      <main className="mx-auto max-w-5xl px-4 py-4 pb-12 space-y-6">
        <Link to="/" className="inline-flex min-h-[40px] items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-brand">
          <ArrowLeft className="h-4 w-4" /> Voltar para a vitrine
        </Link>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <ProductGallery
            productName={product.name}
            activeImageUrl={activeImageUrl}
            galleryUrls={galleryUrls}
            onSelectImage={setActiveImageUrl}
          />

          <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm space-y-4">
            <div>
              {product.brand && <p className="text-xs font-bold uppercase tracking-widest text-brand">{product.brand}</p>}
              <h1 className="mt-1 text-2xl font-extrabold text-stone-900">{product.name}</h1>
              {product.category_name && <p className="mt-0.5 text-xs text-stone-500">{product.category_name}</p>}
            </div>

            <div className="flex flex-wrap items-baseline gap-2">
              {hasPromo && <span className="text-sm text-stone-400 line-through">{formatBRL(selectedVariant.price)}</span>}
              <span className="text-2xl font-extrabold text-brand">{formatBRL(effectivePrice)}</span>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold text-stone-700">
                {(product.variant_cta_label?.trim() || 'Tom / Opção').replace(/^escolher\s+/i, '')}:{' '}
                <span className="text-brand">
                  {[selectedVariant.name, selectedVariant.color_name, selectedVariant.size_label].filter(Boolean).join(' • ')}
                </span>
              </p>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((variant) => {
                  const active = variant.id === selectedVariant.id;
                  const empty = variant.stock_qty <= 0;
                  return (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => handleSelectVariant(variant.id)}
                      className={`inline-flex min-h-[44px] items-center gap-2 rounded-2xl border px-3 text-xs font-semibold transition ${
                        active ? 'border-brand bg-brand-50 text-brand ring-2 ring-brand/20' : 'border-stone-200 bg-stone-50 text-stone-700 hover:border-brand-200'
                      } ${empty ? 'opacity-50 line-through' : ''}`}
                    >
                      {variant.color_hex && <span className="h-5 w-5 rounded-full border border-stone-300 shadow-inner" style={{ backgroundColor: variant.color_hex }} />}
                      <span>{variant.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedVariant.stock_qty >= 1 && selectedVariant.stock_qty <= 3 && (
              <p className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-800">
                <AlertTriangle className="h-3.5 w-3.5" /> Últimas {selectedVariant.stock_qty} unidade(s)!
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <div className="inline-flex items-center rounded-2xl border border-stone-200 bg-stone-50">
                <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Diminuir quantidade" className="flex h-12 w-11 items-center justify-center text-stone-700"><Minus className="h-4 w-4" /></button>
                <span className="w-8 text-center text-sm font-bold">{quantity}</span>
                <button type="button" onClick={() => setQuantity((q) => Math.min(selectedVariant.stock_qty, q + 1))} disabled={isOutOfStock || quantity >= selectedVariant.stock_qty} aria-label="Aumentar quantidade" className="flex h-12 w-11 items-center justify-center text-stone-700 disabled:opacity-30"><Plus className="h-4 w-4" /></button>
              </div>
              <button type="button" onClick={handleAddToCart} disabled={isOutOfStock} className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-2xl bg-brand px-5 text-sm font-bold text-white shadow-sm hover:bg-brand-700 disabled:bg-stone-200 disabled:text-stone-500">
                <ShoppingBag className="h-5 w-5" />
                {isOutOfStock ? 'Opção Esgotada' : 'Adicionar à Sacola'}
              </button>
            </div>

            <button type="button" onClick={() => void handleShare()} className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-stone-50 text-xs font-semibold text-stone-700 hover:border-brand-200 hover:text-brand">
              {copiedLink ? <Check className="h-4 w-4 text-emerald-600" /> : <Share2 className="h-4 w-4" />}
              {copiedLink ? 'Link copiado para compartilhar!' : 'Compartilhar Link nos Stories'}
            </button>

            {product.description && (
              <div className="border-t border-stone-100 pt-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500">Descrição</h2>
                <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-stone-700">{product.description}</p>
              </div>
            )}
          </div>
        </div>

        <KitSuggestionsBlock product={product} allProducts={allProducts} />
      </main>
    </div>
  );
}
