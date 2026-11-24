import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Loader2,
  Minus,
  Plus,
  ShoppingBag,
  Sparkles,
  Tag,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { useStoreSettings } from '../../contexts/StoreSettingsContext';
import { formatBRL } from '../../lib/formatters';
import { formatCep } from '../../lib/geoCep';
import { listActiveDeliveryZonesPublic } from '../../services/logisticsAdminService';
import { calculateShippingQuote } from '../../services/shippingService';

export default function CartDrawer() {
  const navigate = useNavigate();
  const { settings } = useStoreSettings();
  const {
    items,
    isCartOpen,
    closeCart,
    updateQuantity,
    removeItem,
    appliedCoupon,
    applyCouponCode,
    removeCoupon,
    totalItems,
    subtotal,
    discountAmount,
    isFreeShippingCoupon,
  } = useCart();

  const [couponInput, setCouponInput] = useState('');
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponFeedback, setCouponFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const [cepInput, setCepInput] = useState('');
  const [cepBusy, setCepBusy] = useState(false);
  const [cepSummary, setCepSummary] = useState<string | null>(null);

  if (!isCartOpen) return null;

  const freeMin = settings.free_shipping_min ? Number(settings.free_shipping_min) : 0;
  const remainingForFree = freeMin > 0 ? Math.max(0, freeMin - subtotal) : 0;
  const freeProgress = freeMin > 0 ? Math.min(100, (subtotal / freeMin) * 100) : 0;
  const estimatedTotal = Math.max(0, subtotal - discountAmount);

  const handleApplyCoupon = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!couponInput.trim()) return;
    setCouponBusy(true);
    setCouponFeedback(null);
    const res = await applyCouponCode(couponInput);
    setCouponFeedback({ ok: res.ok, text: res.message });
    if (res.ok) setCouponInput('');
    setCouponBusy(false);
  };

  const handleQuickCep = async () => {
    setCepBusy(true);
    setCepSummary(null);
    try {
      const zones = await listActiveDeliveryZonesPublic();
      const quote = await calculateShippingQuote({
        rawCep: cepInput,
        subtotal,
        settings,
        activeZones: zones,
      });
      const delivery = quote.options.find((o) => o.fulfillmentType === 'delivery');
      if (delivery) {
        const feeText = delivery.isFreeShipping || isFreeShippingCoupon ? 'Grátis!' : formatBRL(delivery.fee);
        setCepSummary(`Entrega (${delivery.subtitle}): ${feeText}`);
      } else if (quote.deliveryUnavailableReason) {
        setCepSummary(quote.deliveryUnavailableReason);
      } else {
        setCepSummary('Digite um CEP válido com 8 números.');
      }
    } catch (err) {
      setCepSummary(err instanceof Error ? err.message : 'Não foi possível calcular o frete.');
    } finally {
      setCepBusy(false);
    }
  };

  const handleCheckout = () => {
    closeCart();
    navigate('/checkout');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Sacola de compras">
      <button type="button" aria-label="Fechar sacola" onClick={closeCart} className="absolute inset-0 bg-stone-900/50 backdrop-blur-[1px]" />

      <aside className="relative z-10 flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3.5">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-brand" />
            <h2 className="text-base font-bold text-stone-900">Sua Sacola ({totalItems})</h2>
          </div>
          <button type="button" onClick={closeCart} aria-label="Fechar" className="flex h-11 w-11 items-center justify-center rounded-xl bg-stone-100 text-stone-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {freeMin > 0 && items.length > 0 && (
          <div className="border-b border-brand-100 bg-brand-50/70 px-4 py-2.5">
            {remainingForFree === 0 || isFreeShippingCoupon ? (
              <p className="text-xs font-semibold text-emerald-700">
                🎉 Parabéns! Você ganhou Frete Grátis nesta compra!
              </p>
            ) : (
              <p className="text-xs font-medium text-stone-700">
                Faltam <strong className="text-brand">{formatBRL(remainingForFree)}</strong> para ganhar{' '}
                <strong>Frete Grátis</strong>!
              </p>
            )}
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-brand-100">
              <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${isFreeShippingCoupon ? 100 : freeProgress}%` }} />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {items.length === 0 ? (
            <div className="py-12 text-center">
              <Sparkles className="mx-auto h-10 w-10 text-brand-200" />
              <p className="mt-3 text-sm font-semibold text-stone-700">Sua sacola está vazia</p>
              <p className="mt-1 text-xs text-stone-500">Explore nossos cosméticos e escolha seus favoritos.</p>
            </div>
          ) : (
            <>
              {items.map((item) => (
                <article key={item.variantId} className="flex gap-3 rounded-2xl border border-stone-200 p-2.5">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-brand-50 flex items-center justify-center">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.productName} className="h-full w-full object-cover" />
                    ) : (
                      <Sparkles className="h-5 w-5 text-brand-300" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-1">
                      <p className="text-xs font-bold text-stone-900 line-clamp-2">{item.productName}</p>
                      <button type="button" onClick={() => removeItem(item.variantId)} aria-label="Remover item" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-stone-400 hover:bg-rose-50 hover:text-rose-600">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-stone-500">
                      {item.colorHex && <span className="h-3 w-3 rounded-full border border-stone-300" style={{ backgroundColor: item.colorHex }} />}
                      <span className="truncate">{[item.variantName, item.sizeLabel].filter(Boolean).join(' • ')}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs font-extrabold text-brand">{formatBRL(item.unitPrice * item.quantity)}</span>
                      <div className="inline-flex items-center rounded-xl border border-stone-200 bg-stone-50">
                        <button type="button" onClick={() => updateQuantity(item.variantId, item.quantity - 1)} aria-label="Diminuir" className="flex h-9 w-9 items-center justify-center text-stone-700"><Minus className="h-3.5 w-3.5" /></button>
                        <span className="w-6 text-center text-xs font-bold">{item.quantity}</span>
                        <button type="button" onClick={() => updateQuantity(item.variantId, item.quantity + 1)} disabled={item.quantity >= item.maxStock} aria-label="Aumentar" className="flex h-9 w-9 items-center justify-center text-stone-700 disabled:opacity-30"><Plus className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}

              <form onSubmit={handleApplyCoupon} className="rounded-2xl border border-stone-200 bg-stone-50 p-3 space-y-2">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-stone-700"><Tag className="h-3.5 w-3.5 text-brand" /> Cupom de Desconto</p>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs">
                    <span className="font-bold text-emerald-800">{appliedCoupon.code} aplicado</span>
                    <button type="button" onClick={removeCoupon} className="font-semibold text-rose-600">Remover</button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input type="text" value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} placeholder="Código do cupom" className="h-10 flex-1 rounded-xl border border-stone-200 bg-white px-3 font-mono text-xs uppercase focus:border-brand focus:outline-none" />
                    <button type="submit" disabled={couponBusy} className="min-h-[40px] rounded-xl bg-stone-900 px-3 text-xs font-semibold text-white hover:bg-brand disabled:opacity-50">
                      {couponBusy ? '...' : 'Aplicar'}
                    </button>
                  </div>
                )}
                {couponFeedback && (
                  <p className={`text-[11px] font-medium ${couponFeedback.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{couponFeedback.text}</p>
                )}
              </form>

              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3 space-y-2">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-stone-700"><Truck className="h-3.5 w-3.5 text-brand" /> Simular Frete (CEP)</p>
                <div className="flex gap-2">
                  <input type="text" inputMode="numeric" value={cepInput} onChange={(e) => setCepInput(formatCep(e.target.value))} placeholder="00000-000" className="h-10 flex-1 rounded-xl border border-stone-200 bg-white px-3 text-xs focus:border-brand focus:outline-none" />
                  <button type="button" onClick={() => void handleQuickCep()} disabled={cepBusy} className="min-h-[40px] rounded-xl border border-brand-200 bg-white px-3 text-xs font-semibold text-brand hover:bg-brand-50">
                    {cepBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Calcular'}
                  </button>
                </div>
                {cepSummary && <p className="text-[11px] text-stone-600">{cepSummary}</p>}
              </div>
            </>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-stone-200 bg-white p-4 space-y-2.5">
            <div className="space-y-1 text-xs text-stone-600">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatBRL(subtotal)}</span></div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Desconto ({appliedCoupon?.code})</span>
                  <span>-{formatBRL(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between pt-1 text-sm font-extrabold text-stone-900">
                <span>Total estimado</span>
                <span className="text-brand">{formatBRL(estimatedTotal)}</span>
              </div>
            </div>
            <button type="button" onClick={handleCheckout} className="min-h-[48px] w-full rounded-2xl bg-brand text-sm font-bold text-white shadow-sm hover:bg-brand-700">
              Finalizar Compra
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
