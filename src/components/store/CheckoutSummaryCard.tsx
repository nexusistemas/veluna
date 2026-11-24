import { CreditCard, Loader2, MessageCircle, QrCode, Tag } from 'lucide-react';
import type { AppliedCoupon, CartItem } from '../../contexts/CartContext';
import { formatBRL } from '../../lib/formatters';
import type { FulfillmentType, PaymentMethod } from '../../types/database';

const PAYMENT_OPTIONS: Array<{
  id: PaymentMethod;
  label: string;
  desc: string;
  icon: typeof QrCode;
}> = [
  { id: 'pix_mp', label: 'Pix — Aprovação Rápida', desc: 'QR Code e Copia e Cola imediato', icon: QrCode },
  { id: 'card_mp', label: 'Cartão de Crédito', desc: 'Pagamento online seguro', icon: CreditCard },
  { id: 'whatsapp_combine', label: 'Combinar pelo WhatsApp', desc: 'Feche o pagamento direto com a loja', icon: MessageCircle },
];

interface CheckoutSummaryCardProps {
  items: CartItem[];
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  grandTotal: number;
  fulfillmentType: FulfillmentType;
  paymentMethod: PaymentMethod;
  onPaymentChange: (method: PaymentMethod) => void;
  appliedCoupon: AppliedCoupon | null;
  couponInput: string;
  onCouponInputChange: (val: string) => void;
  onApplyCoupon: () => void;
  onRemoveCoupon: () => void;
  couponMsg: { ok: boolean; text: string } | null;
  submitting: boolean;
}

export default function CheckoutSummaryCard({
  items,
  subtotal,
  discountAmount,
  shippingFee,
  grandTotal,
  fulfillmentType,
  paymentMethod,
  onPaymentChange,
  appliedCoupon,
  couponInput,
  onCouponInputChange,
  onApplyCoupon,
  onRemoveCoupon,
  couponMsg,
  submitting,
}: CheckoutSummaryCardProps) {
  return (
    <>
      <section className="rounded-3xl border border-stone-200 bg-white p-4 sm:p-5 shadow-sm space-y-3">
        <h2 className="text-base font-bold text-stone-900">Forma de Pagamento</h2>
        <div className="space-y-2">
          {PAYMENT_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onPaymentChange(opt.id)}
                className={`flex min-h-[56px] w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition ${
                  paymentMethod === opt.id
                    ? 'border-brand bg-brand-50 text-brand'
                    : 'border-stone-200 bg-stone-50 text-stone-700'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <div>
                  <p className="text-xs font-bold">{opt.label}</p>
                  <p className="text-[11px] opacity-80">{opt.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-brand-100 bg-white p-4 sm:p-5 shadow-sm space-y-3">
        <h2 className="text-base font-bold text-stone-900">Cupom e Resumo</h2>
        {appliedCoupon ? (
          <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs">
            <span className="font-bold text-emerald-800">
              <Tag className="mr-1 inline h-3.5 w-3.5" /> {appliedCoupon.code} aplicado
            </span>
            <button type="button" onClick={onRemoveCoupon} className="font-semibold text-rose-600">
              Remover
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={couponInput}
              onChange={(e) => onCouponInputChange(e.target.value.toUpperCase())}
              placeholder="Código do cupom"
              className="h-11 flex-1 rounded-xl border border-stone-200 bg-stone-50 px-3 font-mono text-xs uppercase focus:border-brand focus:bg-white focus:outline-none"
            />
            <button
              type="button"
              onClick={onApplyCoupon}
              className="min-h-[44px] rounded-xl bg-stone-900 px-4 text-xs font-semibold text-white hover:bg-brand"
            >
              Aplicar
            </button>
          </div>
        )}
        {couponMsg && (
          <p className={`text-xs font-medium ${couponMsg.ok ? 'text-emerald-700' : 'text-rose-700'}`}>
            {couponMsg.text}
          </p>
        )}

        <div className="space-y-1.5 border-t border-stone-100 pt-3 text-xs text-stone-600">
          {items.map((item) => (
            <div key={item.variantId} className="flex justify-between gap-2">
              <span className="truncate">
                {item.quantity}x {item.productName} ({item.variantName})
              </span>
              <span className="shrink-0 font-semibold">
                {formatBRL(item.unitPrice * item.quantity)}
              </span>
            </div>
          ))}
          <div className="border-t border-stone-100 pt-2 flex justify-between">
            <span>Subtotal</span>
            <span>{formatBRL(subtotal)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between font-semibold text-emerald-700">
              <span>Desconto</span>
              <span>-{formatBRL(discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Frete ({fulfillmentType === 'pickup' ? 'Retirada' : 'Entrega'})</span>
            <span>{shippingFee === 0 ? 'Grátis' : formatBRL(shippingFee)}</span>
          </div>
          <div className="flex justify-between pt-2 text-base font-extrabold text-stone-900">
            <span>Total</span>
            <span className="text-brand">{formatBRL(grandTotal)}</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-brand text-sm font-bold text-white shadow-sm hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting && <Loader2 className="h-5 w-5 animate-spin" />}
          {submitting ? 'Registrando Pedido...' : `Confirmar Pedido • ${formatBRL(grandTotal)}`}
        </button>
      </section>
    </>
  );
}
