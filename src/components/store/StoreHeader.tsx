import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Instagram, MessageCircle, Search, ShoppingBag, Sparkles, X } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { useStoreSettings } from '../../contexts/StoreSettingsContext';
import { onlyDigits } from '../../lib/formatters';

interface StoreHeaderProps {
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  hideSearch?: boolean;
}

export default function StoreHeader({
  searchQuery,
  onSearchChange,
  hideSearch = false,
}: StoreHeaderProps) {
  const { settings } = useStoreSettings();
  const { totalItems, openCart } = useCart();
  const navigate = useNavigate();
  const [localQuery, setLocalQuery] = useState(searchQuery ?? '');

  const currentSearch = onSearchChange ? (searchQuery ?? '') : localQuery;
  const whatsappDigits = onlyDigits(settings.whatsapp_number ?? '');
  const instagramClean = (settings.instagram_handle ?? '').replace(/^@/, '').trim();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!onSearchChange) {
      const q = localQuery.trim();
      navigate(q ? `/?q=${encodeURIComponent(q)}` : '/');
    }
  };

  const handleInput = (value: string) => {
    if (onSearchChange) {
      onSearchChange(value);
    } else {
      setLocalQuery(value);
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-brand-100 bg-white/95 backdrop-blur">
      <div className="mx-auto max-w-6xl px-3.5 py-2.5 sm:px-5">
        <div className="flex items-center justify-between gap-2.5">
          <Link to="/" className="flex items-center gap-2.5 min-w-0">
            {settings.logo_url ? (
              <img
                src={settings.logo_url}
                alt={settings.store_name}
                className="h-10 w-10 shrink-0 rounded-2xl object-cover border border-brand-100"
              />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand text-white shadow-sm">
                <Sparkles className="h-5 w-5" aria-hidden="true" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm sm:text-base font-bold text-stone-900 truncate">
                {settings.store_name}
              </p>
              <p className="text-[11px] text-brand font-medium truncate">Cosméticos &amp; Beleza</p>
            </div>
          </Link>

          <div className="flex items-center gap-1.5 shrink-0">
            {instagramClean && (
              <a
                href={`https://instagram.com/${instagramClean}`}
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram da loja"
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-stone-200 bg-white text-stone-600 transition hover:border-brand-200 hover:text-brand"
              >
                <Instagram className="h-4 w-4" />
              </a>
            )}
            {whatsappDigits && (
              <a
                href={`https://wa.me/${whatsappDigits.startsWith('55') ? whatsappDigits : `55${whatsappDigits}`}`}
                target="_blank"
                rel="noreferrer"
                aria-label="WhatsApp da loja"
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-stone-200 bg-white text-emerald-600 transition hover:border-emerald-300 hover:bg-emerald-50"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
            )}
            <button
              type="button"
              onClick={openCart}
              aria-label={`Abrir sacola com ${totalItems} itens`}
              className="relative flex h-11 min-w-[44px] items-center justify-center gap-1.5 rounded-2xl bg-brand px-3 text-white shadow-sm transition hover:bg-brand-700 active:scale-95"
            >
              <ShoppingBag className="h-5 w-5" aria-hidden="true" />
              {totalItems > 0 && (
                <span className="rounded-full bg-white px-1.5 py-0.5 text-[11px] font-extrabold text-brand leading-none">
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </div>

        {!hideSearch && (
          <form onSubmit={handleSubmit} className="relative mt-2.5">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={currentSearch}
              onChange={(e) => handleInput(e.target.value)}
              placeholder="Buscar batom, base, skincare, marca ou tom..."
              className="h-11 w-full rounded-2xl border border-stone-200 bg-stone-50 pl-10 pr-10 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand focus:bg-white focus:outline-none"
            />
            {currentSearch && (
              <button
                type="button"
                onClick={() => handleInput('')}
                aria-label="Limpar busca"
                className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-stone-400 hover:text-stone-700"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </form>
        )}
      </div>
    </header>
  );
}
