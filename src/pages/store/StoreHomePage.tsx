import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import HeroBannerCarousel from '../../components/store/HeroBannerCarousel';
import ProductCard from '../../components/store/ProductCard';
import StoreFooter from '../../components/store/StoreFooter';
import StoreHeader from '../../components/store/StoreHeader';
import {
  fetchStorefrontCatalog,
  type StorefrontCatalogData,
  type StorefrontProduct,
} from '../../services/storePublicService';

function ProductSection({ title, products }: { title: string; products: StorefrontProduct[] }) {
  if (products.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-base sm:text-lg font-extrabold text-stone-900">{title}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

export default function StoreHomePage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [catalog, setCatalog] = useState<StorefrontCatalogData>({
    banners: [],
    categories: [],
    products: [],
  });
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') ?? '');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    const q = searchParams.get('q');
    if (q !== null) setSearchQuery(q);
  }, [searchParams]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchStorefrontCatalog()
      .then((data) => {
        if (active) setCatalog(data);
      })
      .catch((err) => {
        if (active) setErrorMsg(err instanceof Error ? err.message : 'Erro ao carregar vitrine.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (!value.trim() && searchParams.has('q')) {
      setSearchParams({}, { replace: true });
    }
  };

  const hasFilter = Boolean(searchQuery.trim()) || selectedCategory !== 'all';

  const filteredProducts = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    return catalog.products.filter((product) => {
      if (selectedCategory !== 'all' && product.category_id !== selectedCategory) return false;
      if (!term) return true;
      if (product.name.toLowerCase().includes(term)) return true;
      if (product.brand?.toLowerCase().includes(term)) return true;
      if (product.category_name?.toLowerCase().includes(term)) return true;
      return product.variants.some(
        (v) =>
          v.name.toLowerCase().includes(term) ||
          (v.color_name?.toLowerCase().includes(term) ?? false),
      );
    });
  }, [catalog.products, searchQuery, selectedCategory]);

  const offerProducts = useMemo(
    () =>
      catalog.products.filter(
        (p) =>
          p.is_flash_sale ||
          p.variants.some((v) => v.promo_price !== null && v.promo_price > 0 && v.promo_price < v.price),
      ),
    [catalog.products],
  );
  const featuredProducts = useMemo(
    () => catalog.products.filter((p) => p.is_featured),
    [catalog.products],
  );
  const bestsellerProducts = useMemo(
    () => catalog.products.filter((p) => p.is_bestseller),
    [catalog.products],
  );

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <StoreHeader searchQuery={searchQuery} onSearchChange={handleSearchChange} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-3.5 py-4 pb-24 sm:px-5 space-y-6">
        {!hasFilter && <HeroBannerCarousel banners={catalog.banners} />}

        {catalog.categories.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`min-h-[40px] shrink-0 rounded-full px-4 text-xs font-semibold transition ${
                selectedCategory === 'all'
                  ? 'bg-brand text-white shadow-sm'
                  : 'border border-stone-200 bg-white text-stone-700 hover:border-brand-200'
              }`}
            >
              Todos
            </button>
            {catalog.categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`min-h-[40px] shrink-0 rounded-full px-4 text-xs font-semibold transition ${
                  selectedCategory === cat.id
                    ? 'bg-brand text-white shadow-sm'
                    : 'border border-stone-200 bg-white text-stone-700 hover:border-brand-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {errorMsg && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            {errorMsg}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div key={idx} className="overflow-hidden rounded-3xl border border-stone-200 bg-white p-3 space-y-3 animate-pulse">
                <div className="aspect-square rounded-2xl bg-brand-50" />
                <div className="h-3 w-1/2 rounded bg-stone-200" />
                <div className="h-4 w-4/5 rounded bg-stone-200" />
                <div className="h-10 w-full rounded-2xl bg-stone-100" />
              </div>
            ))}
          </div>
        ) : catalog.products.length === 0 ? (
          <div className="rounded-3xl border border-brand-100 bg-white p-10 text-center shadow-sm">
            <Sparkles className="mx-auto h-10 w-10 text-brand" />
            <h2 className="mt-3 text-lg font-bold text-stone-900">Vitrine em preparação</h2>
            <p className="mt-1 text-sm text-stone-500">
              Em breve novos cosméticos e lançamentos estarão disponíveis aqui!
            </p>
          </div>
        ) : hasFilter ? (
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-stone-700">
                {filteredProducts.length} produto(s) encontrado(s)
              </p>
              <button
                type="button"
                onClick={() => {
                  handleSearchChange('');
                  setSelectedCategory('all');
                }}
                className="text-xs font-semibold text-brand hover:underline"
              >
                Limpar filtros
              </button>
            </div>
            {filteredProducts.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-500">
                Nenhum cosmético corresponde à sua busca.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </section>
        ) : (
          <div className="space-y-8">
            <ProductSection title="Ofertas Especiais 🔥" products={offerProducts} />
            <ProductSection title="Destaques ✨" products={featuredProducts} />
            <ProductSection title="Mais Vendidos 💖" products={bestsellerProducts} />
            <ProductSection title="Catálogo Completo" products={catalog.products} />
          </div>
        )}
      </main>

      <StoreFooter />
    </div>
  );
}
