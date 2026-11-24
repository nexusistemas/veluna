import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { useStoreSettings } from '../../contexts/StoreSettingsContext';
import type { Banner } from '../../types/database';

interface HeroBannerCarouselProps {
  banners: Banner[];
}

export default function HeroBannerCarousel({ banners }: HeroBannerCarouselProps) {
  const { settings } = useStoreSettings();
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [banners.length]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [banners.length]);

  if (banners.length === 0) {
    return (
      <section className="overflow-hidden rounded-3xl border border-brand-100 bg-gradient-to-br from-brand-600 via-brand-500 to-rose-400 p-6 sm:p-8 text-white shadow-sm">
        <div className="max-w-lg space-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" /> Beleza selecionada
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight">
            {settings.store_name}
          </h1>
          <p className="text-sm text-rose-50/95">
            {settings.tagline || 'Skincare, maquiagem e presentes com entrega rápida e carinho.'}
          </p>
        </div>
      </section>
    );
  }

  const current = banners[activeIndex] ?? banners[0];
  const goPrev = () => setActiveIndex((prev) => (prev - 1 + banners.length) % banners.length);
  const goNext = () => setActiveIndex((prev) => (prev + 1) % banners.length);

  const slideContent = (
    <div className="relative h-52 sm:h-72 md:h-80 w-full overflow-hidden rounded-3xl bg-brand-50 shadow-sm">
      <img
        src={current.mobile_image_url || current.image_url}
        alt={current.title}
        className="h-full w-full object-cover sm:hidden"
      />
      <img
        src={current.image_url}
        alt={current.title}
        className="hidden h-full w-full object-cover sm:block"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-stone-950/65 via-stone-950/15 to-transparent" />
      {(current.title || current.subtitle) && (
        <div className="absolute bottom-4 left-4 right-12 sm:bottom-6 sm:left-6 text-white">
          <h2 className="text-lg sm:text-2xl font-extrabold drop-shadow-sm line-clamp-2">
            {current.title}
          </h2>
          {current.subtitle && (
            <p className="mt-1 text-xs sm:text-sm text-stone-100 drop-shadow-sm line-clamp-2">
              {current.subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );

  const isExternal = current.link_url?.startsWith('http');

  return (
    <section className="relative" aria-label="Banners em destaque">
      {current.link_url ? (
        <a
          href={current.link_url}
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noreferrer' : undefined}
          className="block"
        >
          {slideContent}
        </a>
      ) : (
        slideContent
      )}

      {banners.length > 1 && (
        <>
          <button
            type="button"
            onClick={goPrev}
            aria-label="Banner anterior"
            className="absolute left-2.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-stone-800 shadow hover:bg-white"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-label="Próximo banner"
            className="absolute right-2.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-stone-800 shadow hover:bg-white"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="mt-2.5 flex items-center justify-center gap-1.5">
            {banners.map((banner, idx) => (
              <button
                key={banner.id}
                type="button"
                onClick={() => setActiveIndex(idx)}
                aria-label={`Ver banner ${idx + 1}`}
                className={`h-2 rounded-full transition-all ${
                  idx === activeIndex ? 'w-6 bg-brand' : 'w-2 bg-brand-200'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
