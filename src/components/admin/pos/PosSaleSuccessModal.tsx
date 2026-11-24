import { useCallback, useEffect, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  ExternalLink,
  Loader2,
  MessageCircle,
  Sparkles,
} from 'lucide-react';
import PixPaymentPanel from '../../store/PixPaymentPanel';
import { formatBRL, formatPhoneBR, onlyDigits } from '../../../lib/formatters';
import { updateOrderStatusAdmin } from '../../../services/ordersAdminService';
import { createCheckoutPreferenceLink } from '../../../services/paymentService';
import {
  buildOrderReceiptText,
  buildStoreToCustomerWaUrl,
} from '../../../services/whatsappService';
import type { OrderStatus, PaymentStatus } from '../../../types/database';
import type { PosPaymentMethod } from './PosCheckoutDrawer';

export interface CompletedPosSale {
  orderId: string;
  orderNumber: string | number;
  publicToken: string;
  customerName: string;
  customerPhone: string;
  paymentMethod: PosPaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  subtotal: number;
  discountAmount: number;
  total: number;
  notes: string;
  items: Array<{
    product_name: string;
    variant_name: string | null;
    quantity: number;
    line_total: number;
  }>;
}

interface PosSaleSuccessModalProps {
  sale: CompletedPosSale | null;
  storeName: string;
  pickupAddress: string | null;
  onNewSale: () => void;
}

export default function PosSaleSuccessModal({
  sale,
  storeName,
  pickupAddress,
  onNewSale,
}: PosSaleSuccessModalProps) {
  const [phoneInput, setPhoneInput] = useState('');
  const [pixApproved, setPixApproved] = useState(false);
  const [cardLinkLoading, setCardLinkLoading] = useState(false);
  const [cardLinkUrl, setCardLinkUrl] = useState<string | null>(null);
  const [cardLinkErr, setCardLinkErr] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (!sale) return;
    setPhoneInput(formatPhoneBR(sale.customerPhone));
    setPixApproved(sale.paymentStatus === 'approved');
    setCardLinkUrl(null);
    setCardLinkErr(null);
    setCopiedLink(false);
  }, [sale]);

  const handlePixApproved = useCallback(() => {
    setPixApproved(true);
    if (!sale) return;
    void updateOrderStatusAdmin(sale.orderId, 'completed').catch(() => {});
  }, [sale]);

  if (!sale) return null;

  const isPixPending = sale.paymentMethod === 'pos_pix_mp' && !pixApproved;
  const effectivePaymentStatus: PaymentStatus = pixApproved ? 'approved' : sale.paymentStatus;

  const receiptText = buildOrderReceiptText({
    storeName,
    orderNumber: sale.orderNumber,
    customerName: sale.customerName,
    items: sale.items,
    subtotal: sale.subtotal,
    discountAmount: sale.discountAmount,
    shippingFee: 0,
    total: sale.total,
    fulfillmentType: 'in_store',
    pickupAddress,
    paymentMethod: sale.paymentMethod,
    paymentStatus: effectivePaymentStatus,
    notes: sale.notes || null,
  });

  const waUrl =
    onlyDigits(phoneInput).length >= 10
      ? buildStoreToCustomerWaUrl(phoneInput, receiptText)
      : '';

  const handleGenerateCardLink = async () => {
    setCardLinkLoading(true);
    setCardLinkErr(null);
    try {
      const res = await createCheckoutPreferenceLink(sale.orderId, sale.publicToken);
      setCardLinkUrl(res.init_point);
    } catch (err) {
      setCardLinkErr(
        err instanceof Error ? err.message : 'Não foi possível gerar o link de cartão.',
      );
    } finally {
      setCardLinkLoading(false);
    }
  };

  const handleCopyCardLink = async () => {
    if (!cardLinkUrl) return;
    try {
      await navigator.clipboard.writeText(cardLinkUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // Ignora erro de clipboard
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-950/65 p-0 sm:p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Venda presencial registrada"
    >
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white p-5 shadow-2xl space-y-4">
        <div className="text-center space-y-1">
          <CheckCircle2 className="mx-auto h-11 w-11 text-emerald-500" />
          <p className="text-[11px] font-bold uppercase tracking-widest text-brand">
            Venda Balcão #{sale.orderNumber}
          </p>
          <h2 className="text-xl font-extrabold text-stone-900">
            {isPixPending ? 'Aguardando Pix na Tela' : 'Venda Concluída!'}
          </h2>
          <p className="text-sm font-bold text-brand">{formatBRL(sale.total)}</p>
        </div>

        {isPixPending && (
          <div className="space-y-2.5">
            <PixPaymentPanel
              orderId={sale.orderId}
              publicToken={sale.publicToken}
              initialQrCode={null}
              initialQrBase64={null}
              paymentStatus={effectivePaymentStatus}
              onPaymentApproved={handlePixApproved}
            />

            <button
              type="button"
              disabled={cardLinkLoading}
              onClick={() => void handleGenerateCardLink()}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-stone-50 px-4 text-xs font-bold text-stone-700 hover:border-brand-200 hover:text-brand disabled:opacity-60"
            >
              {cardLinkLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4" />
              )}
              Gerar Link Cartão no Celular da Cliente
            </button>

            {cardLinkErr && (
              <p className="text-center text-xs font-medium text-rose-600">{cardLinkErr}</p>
            )}

            {cardLinkUrl && (
              <div className="rounded-2xl border border-brand-200 bg-brand-50/60 p-3 space-y-2">
                <p className="text-xs font-bold text-stone-800">Link de pagamento gerado:</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void handleCopyCardLink()}
                    className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand px-3 text-xs font-bold text-white"
                  >
                    {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copiedLink ? 'Link Copiado!' : 'Copiar Link'}
                  </button>
                  <a
                    href={cardLinkUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-[40px] items-center justify-center gap-1 rounded-xl border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-700"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Abrir
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5 space-y-2.5">
          <label className="block text-xs font-bold text-emerald-900">
            WhatsApp da Cliente para Comprovante
          </label>
          <input
            type="tel"
            value={phoneInput}
            onChange={(e) => setPhoneInput(formatPhoneBR(e.target.value))}
            placeholder="(00) 90000-0000"
            className="h-11 w-full rounded-xl border border-emerald-200 bg-white px-3 text-sm focus:border-emerald-500 focus:outline-none"
          />
          {waUrl ? (
            <a
              href={waUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 text-sm font-bold text-white shadow-sm hover:bg-emerald-700"
            >
              <MessageCircle className="h-5 w-5" />
              Enviar Comprovante no WhatsApp da Cliente
            </a>
          ) : (
            <p className="text-[11px] text-emerald-800">
              Digite o número com DDD acima para enviar o recibo em 1 toque.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onNewSale}
          className="inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-stone-900 px-4 text-sm font-bold text-white hover:bg-brand transition"
        >
          <Sparkles className="h-4 w-4" />
          Nova Venda no Balcão
        </button>
      </div>
    </div>
  );
}
