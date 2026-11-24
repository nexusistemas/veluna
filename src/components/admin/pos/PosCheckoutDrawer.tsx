import { AlertCircle, Loader2, Minus, Plus, Trash2, X } from 'lucide-react';
import { formatBRL } from '../../../lib/formatters';
import type { PosCatalogItem } from '../../../services/ordersAdminService';
import PosCheckoutFormFields from './PosCheckoutFormFields';

export interface PosCartItem {
  item: PosCatalogItem;
  quantity: number;
}

export type PosPaymentMethod = 'pos_pix_mp' | 'pos_card_presential' | 'pos_cash';

interface PosCheckoutDrawerProps {
  open: boolean;
  onClose: () => void;
  cartItems: PosCartItem[];
  onUpdateQty: (variantId: string, delta: number) => void;
  onClearCart: () => void;
  manualDiscountInput: string;
  onManualDiscountChange: (val: string) => void;
  couponInput: string;
  onCouponInputChange: (val: string) => void;
  appliedCoupon: { code: string; discountAmount: number } | null;
  couponMsg: { ok: boolean; text: string } | null;
  onApplyCoupon: () => void;
  onRemoveCoupon: () => void;
  customerName: string;
  onCustomerNameChange: (val: string) => void;
  customerPhone: string;
  onCustomerPhoneChange: (val: string) => void;
  notes: string;
  onNotesChange: (val: string) => void;
  paymentMethod: PosPaymentMethod;
  onPaymentMethodChange: (method: PosPaymentMethod) => void;
  subtotal: number;
  effectiveDiscount: number;
  total: number;
  submitting: boolean;
  errorMsg: string | null;
  onSubmit: () => void;
}

export default function PosCheckoutDrawer(props: PosCheckoutDrawerProps) {
  const {
    open,
    onClose,
    cartItems,
    onUpdateQty,
    onClearCart,
    subtotal,
    effectiveDiscount,
    total,
    submitting,
    errorMsg,
    onSubmit,
  } = props;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-stone-950/55 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-label="Fechar venda no balcão"
    >
      <button type="button" aria-label="Fechar painel" onClick={onClose} className="flex-1" />
      <div className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3.5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-brand">Caixa PDV</p>
            <h2 className="text-base font-extrabold text-stone-900">Fechar Venda Presencial</h2>
          </div>
          <div className="flex items-center gap-1.5">
            {cartItems.length > 0 && (
              <button
                type="button"
                onClick={onClearCart}
                title="Limpar venda"
                className="flex h-11 w-11 items-center justify-center rounded-xl text-rose-600 hover:bg-rose-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar caixa"
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-stone-100 text-stone-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {errorMsg && (
            <div role="alert" className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-2">
            {cartItems.map(({ item, quantity }) => (
              <div key={item.variantId} className="flex items-center justify-between gap-2 rounded-2xl border border-stone-200 bg-stone-50 p-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-stone-900">{item.productName}</p>
                  <p className="truncate text-[11px] text-stone-500">
                    {item.variantName} • {formatBRL(item.effectivePrice)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onUpdateQty(item.variantId, -1)}
                    aria-label="Diminuir quantidade"
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-700"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-6 text-center text-xs font-extrabold">{quantity}</span>
                  <button
                    type="button"
                    disabled={quantity >= item.stockQty}
                    onClick={() => onUpdateQty(item.variantId, 1)}
                    aria-label="Aumentar quantidade"
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-700 disabled:opacity-40"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <PosCheckoutFormFields
            manualDiscountInput={props.manualDiscountInput}
            onManualDiscountChange={props.onManualDiscountChange}
            couponInput={props.couponInput}
            onCouponInputChange={props.onCouponInputChange}
            appliedCoupon={props.appliedCoupon}
            couponMsg={props.couponMsg}
            onApplyCoupon={props.onApplyCoupon}
            onRemoveCoupon={props.onRemoveCoupon}
            customerName={props.customerName}
            onCustomerNameChange={props.onCustomerNameChange}
            customerPhone={props.customerPhone}
            onCustomerPhoneChange={props.onCustomerPhoneChange}
            notes={props.notes}
            onNotesChange={props.onNotesChange}
            paymentMethod={props.paymentMethod}
            onPaymentMethodChange={props.onPaymentMethodChange}
          />
        </div>

        <div className="border-t border-stone-200 bg-stone-50 p-4 space-y-2.5">
          <div className="space-y-1 text-xs text-stone-600">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatBRL(subtotal)}</span></div>
            {effectiveDiscount > 0 && (
              <div className="flex justify-between font-semibold text-emerald-700">
                <span>Desconto</span><span>-{formatBRL(effectiveDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between pt-1 text-base font-extrabold text-stone-900">
              <span>Total a Cobrar</span><span className="text-brand">{formatBRL(total)}</span>
            </div>
          </div>
          <button
            type="button"
            disabled={submitting || cartItems.length === 0}
            onClick={onSubmit}
            className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-brand px-4 text-sm font-bold text-white shadow-sm hover:bg-brand-700 disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-5 w-5 animate-spin" />}
            {submitting ? 'Registrando venda...' : `Finalizar Venda • ${formatBRL(total)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
