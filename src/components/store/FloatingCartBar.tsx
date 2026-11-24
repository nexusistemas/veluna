import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ShoppingBag, Sparkles, X } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { formatBRL } from '../../lib/formatters';

export default function FloatingCartBar() {
  const { pathname } = useLocation();
  const {
    totalItems,
    subtotal,
    discountAmount,
    isCartOpen,
    openCart,
    lastAdded,
    cartPulse,
    dismissAddedFeedback,
  } = useCart();

  const hiddenRoute =
    pathname.startsWith('/painel') ||
    pathname.startsWith('/checkout') ||
    pathname.startsWith('/pedido');

  if (hiddenRoute || isCartOpen) return null;

  const estimatedTotal = Math.max(0, subtotal - discountAmount);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-3 pb-3 sm:px-4 sm:pb-4">
      <div className="mx-auto max-w-lg space-y-2">
        {lastAdded && (
          <div
            key={lastAdded.id}
            role="status"
            aria-live="polite"
            className="pointer-events-auto animate-veluna-toast flex items-center gap-3 rounded-2xl border border-emerald-200 bg-white/95 p-2.5 shadow-xl backdrop-blur"
          >
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-brand-50 flex items-center justify-center">
              {lastAdded.imageUrl ? (
                <img
                  src={lastAdded.imageUrl}
                  alt={lastAdded.productName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Sparkles className="h-5 w-5 text-brand" />
              )}
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white shadow">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-extrabold text-emerald-700">
                +{lastAdded.quantity} adicionado à sacola!
              </p>
              <p className="truncate text-xs text-stone-700">
                {lastAdded.productName}
                {lastAdded.variantName ? ` • ${lastAdded.variantName}` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={dismissAddedFeedback}
              aria-label="Fechar aviso"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {totalItems > 0 && (
          <div
            className={`pointer-events-auto flex items-center justify-between gap-2 rounded-2xl border border-brand-200 bg-stone-900/95 p-2 text-white shadow-2xl backdrop-blur transition-transform ${
              cartPulse ? 'animate-veluna-pop ring-2 ring-brand/60' : ''
            }`}
          >
            <button
              type="button"
              onClick={openCart}
              className="flex min-h-[48px] min-w-0 flex-1 items-center gap-2.5 rounded-xl px-2.5 text-left transition hover:bg-white/10"
            >
              <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-sm">
                <ShoppingBag className="h-5 w-5" aria-hidden="true" />
                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white px-1 text-[11px] font-extrabold text-brand shadow">
                  {totalItems}
                </span>
              </span>
              <div className="min-w-0">
                <p className="text-[11px] text-stone-300 leading-tight">
                  Ver sacola ({totalItems} {totalItems === 1 ? 'item' : 'itens'})
                </p>
                <p className="text-sm font-extrabold text-white truncate">
                  {formatBRL(estimatedTotal)}
                </p>
              </div>
            </button>

            <Link
              to="/checkout"
              className="inline-flex min-h-[48px] shrink-0 items-center justify-center gap-1.5 rounded-xl bg-brand px-4 text-xs sm:text-sm font-extrabold text-white shadow-sm transition hover:bg-brand-700 active:scale-95"
            >
              <span>Finalizar</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
