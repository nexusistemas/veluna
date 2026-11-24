import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  MessageCircle,
  Sparkles,
} from 'lucide-react';
import CardPaymentPanel from '../../components/store/CardPaymentPanel';
import OrderPixCard from '../../components/store/OrderPixCard';
import OrderReceiptDetailsCard from '../../components/store/OrderReceiptDetailsCard';
import PixPaymentPanel from '../../components/store/PixPaymentPanel';
import StoreHeader from '../../components/store/StoreHeader';
import { useStoreSettings } from '../../contexts/StoreSettingsContext';
import { fetchOrderPublicReceipt } from '../../services/storePublicService';
import {
  buildCustomerToStoreWaUrl,
  buildOrderReceiptText,
} from '../../services/whatsappService';
import type { OrderStatus, PaymentStatus, PublicOrderStatusResult } from '../../types/database';

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Aguardando confirmação',
  pending_payment: 'Aguardando pagamento',
  paid: 'Pagamento confirmado',
  confirmed: 'Confirmado',
  preparing: 'Em separação',
  ready: 'Pronto para retirada',
  ready_for_pickup: 'Pronto para retirada',
  out_for_delivery: 'Saiu para entrega',
  delivered: 'Entregue',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Pagamento pendente',
  approved: 'Pagamento aprovado',
  rejected: 'Pagamento recusado',
  refunded: 'Estornado',
  cancelled: 'Cancelado',
};

export default function OrderConfirmationPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { settings } = useStoreSettings();

  const token = searchParams.get('token') ?? '';
  const [receipt, setReceipt] = useState<PublicOrderStatusResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);

  const loadReceipt = useCallback(
    async (silent = false) => {
      if (!id || !token) {
        setErrorMsg('Link do pedido incompleto ou inválido.');
        setLoading(false);
        return;
      }
      if (!silent) setLoading(true);
      try {
        const data = await fetchOrderPublicReceipt(id, token);
        setReceipt(data);
        setErrorMsg(null);
      } catch (err) {
        if (!silent) {
          setErrorMsg(err instanceof Error ? err.message : 'Erro ao carregar recibo.');
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [id, token],
  );

  useEffect(() => {
    void loadReceipt(false);
  }, [loadReceipt]);

  const handlePaymentApproved = useCallback(() => {
    setReceipt((prev) =>
      prev
        ? {
            ...prev,
            payment_status: 'approved',
            status:
              prev.status === 'pending' || prev.status === 'pending_payment' ? 'paid' : prev.status,
          }
        : prev,
    );
    void loadReceipt(true);
  }, [loadReceipt]);

  const handleCopyFallbackPix = async () => {
    const code = receipt?.mp_pix_qr_code || settings.pix_key;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 2500);
    } catch {
      // Ignora erro de clipboard
    }
  };

  const whatsappUrl = receipt
    ? buildCustomerToStoreWaUrl(
        settings.whatsapp_number ?? '',
        buildOrderReceiptText({
          storeName: settings.store_name,
          orderNumber: receipt.order_number,
          customerName: receipt.customer_name,
          items: receipt.items,
          subtotal: receipt.subtotal,
          discountAmount: receipt.discount_amount,
          shippingFee: receipt.shipping_fee,
          total: receipt.total,
          fulfillmentType: receipt.fulfillment_type,
          shippingAddress: receipt.shipping_address,
          pickupAddress: settings.pickup_address,
          paymentMethod: receipt.payment_method,
          paymentStatus: receipt.payment_status,
        }),
      )
    : '';

  return (
    <div className="min-h-screen bg-stone-50">
      <StoreHeader hideSearch />
      <main className="mx-auto max-w-2xl px-4 py-6 pb-16 space-y-4">
        {loading ? (
          <div className="flex justify-center py-20 text-brand">
            <Loader2 className="h-7 w-7 animate-spin" />
          </div>
        ) : errorMsg || !receipt ? (
          <section className="rounded-3xl border border-rose-200 bg-white p-6 text-center space-y-3 shadow-sm">
            <AlertCircle className="mx-auto h-10 w-10 text-rose-500" />
            <h1 className="text-lg font-bold text-stone-900">Não encontramos este pedido</h1>
            <p className="text-sm text-stone-600">{errorMsg}</p>
            <Link to="/" className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-brand px-5 text-sm font-semibold text-white">
              <ArrowLeft className="h-4 w-4" /> Voltar para a loja
            </Link>
          </section>
        ) : (
          <>
            <section className="rounded-3xl border border-emerald-200 bg-white p-6 text-center shadow-sm space-y-2">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
              <p className="text-xs font-bold uppercase tracking-widest text-brand">Pedido Recebido</p>
              <h1 className="text-2xl font-extrabold text-stone-900">Pedido #{receipt.order_number}</h1>
              <p className="text-sm text-stone-600">Obrigado pela preferência, {receipt.customer_name}!</p>
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand">
                  {STATUS_LABELS[receipt.status] ?? receipt.status}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    receipt.payment_status === 'approved'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-stone-100 text-stone-700'
                  }`}
                >
                  {PAYMENT_STATUS_LABELS[receipt.payment_status] ?? receipt.payment_status}
                </span>
              </div>
            </section>

            {receipt.payment_status === 'approved' && (
              <section className="rounded-3xl border border-emerald-300 bg-gradient-to-br from-emerald-50 to-white p-5 text-center shadow-sm space-y-1.5">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white">
                  <Sparkles className="h-3.5 w-3.5" /> Pagamento Confirmado!
                </div>
                <p className="text-sm font-bold text-emerald-950">
                  Tudo certo com o seu pagamento na {settings.store_name}!
                </p>
                <p className="text-xs text-emerald-800">
                  Estamos separando seus produtos com muito carinho.
                </p>
              </section>
            )}

            {receipt.payment_method === 'pix_mp' && receipt.payment_status === 'pending' && (
              <PixPaymentPanel
                orderId={receipt.order_id}
                publicToken={token}
                initialQrCode={receipt.mp_pix_qr_code}
                initialQrBase64={receipt.mp_pix_qr_base64}
                paymentStatus={receipt.payment_status}
                fallbackWhatsappUrl={whatsappUrl || undefined}
                onPaymentApproved={handlePaymentApproved}
              />
            )}

            {receipt.payment_method === 'card_mp' && receipt.payment_status === 'pending' && (
              <CardPaymentPanel
                orderId={receipt.order_id}
                publicToken={token}
                total={receipt.total}
                mpPublicKey={settings.mp_public_key}
                onPaymentApproved={handlePaymentApproved}
              />
            )}

            {receipt.payment_method === 'whatsapp_combine' && receipt.payment_status === 'pending' && (
              <OrderPixCard
                qrBase64={receipt.mp_pix_qr_base64}
                qrCode={receipt.mp_pix_qr_code}
                storePixKey={settings.pix_key}
                copiedPix={copiedPix}
                onCopyPix={() => void handleCopyFallbackPix()}
              />
            )}

            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700"
              >
                <MessageCircle className="h-5 w-5" />
                Enviar Comprovante / Acompanhar no WhatsApp
              </a>
            )}

            <OrderReceiptDetailsCard
              receipt={receipt}
              pickupAddress={settings.pickup_address}
              pickupInstructions={settings.pickup_instructions}
              storeLat={settings.store_lat}
              storeLng={settings.store_lng}
            />

            <div className="text-center pt-2">
              <Link to="/" className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-semibold text-brand hover:underline">
                <ArrowLeft className="h-4 w-4" /> Voltar para a loja
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
