import { Banknote, CreditCard, QrCode, Tag } from 'lucide-react';
import { formatPhoneBR } from '../../../lib/formatters';
import type { PosPaymentMethod } from './PosCheckoutDrawer';

interface PosCheckoutFormFieldsProps {
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
}

const POS_PAYMENT_OPTIONS: Array<{
  id: PosPaymentMethod;
  label: string;
  subtitle: string;
  icon: typeof QrCode;
}> = [
  { id: 'pos_pix_mp', label: 'Pix QR na Tela (Mercado Pago)', subtitle: 'Gera QR ao vivo com confirmação automática', icon: QrCode },
  { id: 'pos_card_presential', label: 'Cartão Presencial / Point Tap', subtitle: 'Maquininha física ou aproximação no celular', icon: CreditCard },
  { id: 'pos_cash', label: 'Dinheiro', subtitle: 'Recebimento imediato no balcão', icon: Banknote },
];

export default function PosCheckoutFormFields({
  manualDiscountInput,
  onManualDiscountChange,
  couponInput,
  onCouponInputChange,
  appliedCoupon,
  couponMsg,
  onApplyCoupon,
  onRemoveCoupon,
  customerName,
  onCustomerNameChange,
  customerPhone,
  onCustomerPhoneChange,
  notes,
  onNotesChange,
  paymentMethod,
  onPaymentMethodChange,
}: PosCheckoutFormFieldsProps) {
  return (
    <>
      <div className="rounded-2xl border border-stone-200 p-3 space-y-3">
        <p className="text-xs font-bold text-stone-800">Desconto ou Cupom</p>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <div>
            <label className="block text-[11px] font-semibold text-stone-600">Desconto Manual (R$)</label>
            <input
              type="number"
              min="0"
              step="0.50"
              disabled={Boolean(appliedCoupon)}
              value={manualDiscountInput}
              onChange={(e) => onManualDiscountChange(e.target.value)}
              placeholder="0,00"
              className="mt-1 h-11 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 text-sm disabled:opacity-50 focus:border-brand focus:bg-white focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-stone-600">Cupom</label>
            {appliedCoupon ? (
              <div className="mt-1 flex h-11 items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 text-xs">
                <span className="font-bold text-emerald-800 truncate">
                  <Tag className="mr-1 inline h-3.5 w-3.5" />
                  {appliedCoupon.code}
                </span>
                <button type="button" onClick={onRemoveCoupon} className="font-semibold text-rose-600">
                  Tirar
                </button>
              </div>
            ) : (
              <div className="mt-1 flex gap-1.5">
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => onCouponInputChange(e.target.value.toUpperCase())}
                  placeholder="CÓDIGO"
                  className="h-11 min-w-0 flex-1 rounded-xl border border-stone-200 bg-stone-50 px-2.5 font-mono text-xs uppercase focus:border-brand focus:bg-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={onApplyCoupon}
                  className="min-h-[44px] rounded-xl bg-stone-900 px-3 text-xs font-semibold text-white hover:bg-brand"
                >
                  OK
                </button>
              </div>
            )}
          </div>
        </div>
        {couponMsg && (
          <p className={`text-[11px] font-medium ${couponMsg.ok ? 'text-emerald-700' : 'text-rose-700'}`}>
            {couponMsg.text}
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-stone-200 p-3 space-y-2.5">
        <p className="text-xs font-bold text-stone-800">Cliente (opcional — para recibo WhatsApp)</p>
        <input
          type="text"
          value={customerName}
          onChange={(e) => onCustomerNameChange(e.target.value)}
          placeholder="Nome da cliente (vazio = Cliente Balcão)"
          className="h-11 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 text-sm focus:border-brand focus:bg-white focus:outline-none"
        />
        <input
          type="tel"
          value={customerPhone}
          onChange={(e) => onCustomerPhoneChange(formatPhoneBR(e.target.value))}
          placeholder="WhatsApp (00) 90000-0000"
          className="h-11 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 text-sm focus:border-brand focus:bg-white focus:outline-none"
        />
        <input
          type="text"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Observações da venda (opcional)"
          className="h-11 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 text-sm focus:border-brand focus:bg-white focus:outline-none"
        />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-bold text-stone-800">Pagamento no Balcão</p>
        {POS_PAYMENT_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const selected = paymentMethod === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onPaymentMethodChange(opt.id)}
              className={`flex min-h-[54px] w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${
                selected ? 'border-brand bg-brand-50 text-brand' : 'border-stone-200 bg-stone-50 text-stone-700'
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <div>
                <p className="text-xs font-bold">{opt.label}</p>
                <p className="text-[11px] opacity-80">{opt.subtitle}</p>
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}
