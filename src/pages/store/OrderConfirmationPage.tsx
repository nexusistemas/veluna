import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  MapPin,
  MessageCircle,
  Store,
} from 'lucide-react';
import OrderPixCard from '../../components/store/OrderPixCard';
import StoreHeader from '../../components/store/StoreHeader';
import { useStoreSettings } from '../../contexts/StoreSettingsContext';
import { formatBRL, onlyDigits } from '../../lib/formatters';
import { fetchOrderPublicReceipt } from '../../services/storePublicService';
import type { OrderStatus, PaymentStatus, PublicOrderStatusResult } from '../../types/database';

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Aguardando confirmação',
  confirmed: 'Confirmado',
  preparing: 'Em separação',
  ready: 'Pronto para retirada',
  out_for_delivery: 'Saiu para entrega',
  delivered: 'Entregue',
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

  useEffect(() => {
    if (!id || !token) {
      setErrorMsg('Link do pedido incompleto ou inválido.');
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    fetchOrderPublicReceipt(id, token)
      .then((data) => {
        if (active) setReceipt(data);
      })
      .catch((err) => {
        if (active) setErrorMsg(err instanceof Error ? err.message : 'Erro ao carregar recibo.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, token]);

  const handleCopyPix = async () => {
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

  const buildWhatsappUrl = (order: PublicOrderStatusResult): string | null => {
    const digits = onlyDigits(settings.whatsapp_number ?? '');
    if (!digits) return null;
    const target = digits.startsWith('55') ? digits : `55${digits}`;
    const itemLines = order.items
      .map(
        (i) =>
          `• ${i.quantity}x ${i.product_name}${i.variant_name ? ` (${i.variant_name})` : ''} — ${formatBRL(i.line_total)}`,
      )
      .join('\n');
    const fulfillmentText =
      order.fulfillment_type === 'pickup'
        ? 'Retirada na Loja'
        : `Entrega: ${order.shipping_address || 'Endereço cadastrado'}`;
    const text = [
      `Olá! Acabei de fazer o pedido *#${order.order_number}* na *${settings.store_name}* 💖`,
      '',
      `*Cliente:* ${order.customer_name}`,
      `*Modalidade:* ${fulfillmentText}`,
      '',
      '*Itens:*',
      itemLines,
      '',
      `*Subtotal:* ${formatBRL(order.subtotal)}`,
      order.discount_amount > 0 ? `*Desconto:* -${formatBRL(order.discount_amount)}` : null,
      `*Frete:* ${order.shipping_fee === 0 ? 'Grátis' : formatBRL(order.shipping_fee)}`,
      `*Total:* ${formatBRL(order.total)}`,
    ]
      .filter((line) => line !== null)
      .join('\n');
    return `https://wa.me/${target}?text=${encodeURIComponent(text)}`;
  };

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
                <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700">
                  {PAYMENT_STATUS_LABELS[receipt.payment_status] ?? receipt.payment_status}
                </span>
              </div>
            </section>

            <OrderPixCard
              qrBase64={receipt.mp_pix_qr_base64}
              qrCode={receipt.mp_pix_qr_code}
              storePixKey={settings.pix_key}
              copiedPix={copiedPix}
              onCopyPix={() => void handleCopyPix()}
            />

            {buildWhatsappUrl(receipt) && (
              <a
                href={buildWhatsappUrl(receipt) as string}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700"
              >
                <MessageCircle className="h-5 w-5" />
                Enviar Comprovante / Falar com a Loja no WhatsApp
              </a>
            )}

            <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm space-y-3">
              <h2 className="text-sm font-bold text-stone-900">Itens do Pedido</h2>
              <div className="space-y-2 text-xs text-stone-700">
                {receipt.items.map((item, idx) => (
                  <div key={`${item.product_name}-${idx}`} className="flex justify-between gap-2 border-b border-stone-100 pb-2">
                    <span>
                      <strong>{item.quantity}x</strong> {item.product_name}
                      {item.variant_name ? ` (${item.variant_name})` : ''}
                    </span>
                    <span className="shrink-0 font-semibold">{formatBRL(item.line_total)}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1 text-xs text-stone-600 pt-1">
                <div className="flex justify-between"><span>Subtotal</span><span>{formatBRL(receipt.subtotal)}</span></div>
                {receipt.discount_amount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold"><span>Desconto</span><span>-{formatBRL(receipt.discount_amount)}</span></div>
                )}
                <div className="flex justify-between"><span>Frete</span><span>{receipt.shipping_fee === 0 ? 'Grátis' : formatBRL(receipt.shipping_fee)}</span></div>
                <div className="flex justify-between pt-2 text-base font-extrabold text-stone-900"><span>Total</span><span className="text-brand">{formatBRL(receipt.total)}</span></div>
              </div>
            </section>

            <section className="rounded-3xl border border-stone-200 bg-white p-4 text-xs text-stone-600 shadow-sm space-y-1">
              <p className="flex items-center gap-1.5 font-bold text-stone-900">
                {receipt.fulfillment_type === 'pickup' ? <Store className="h-4 w-4 text-brand" /> : <MapPin className="h-4 w-4 text-brand" />}
                {receipt.fulfillment_type === 'pickup' ? 'Retirada na Loja' : 'Endereço de Entrega'}
              </p>
              <p>
                {receipt.fulfillment_type === 'pickup'
                  ? settings.pickup_address || 'Combine a retirada pelo WhatsApp.'
                  : receipt.shipping_address || 'Endereço registrado no pedido.'}
              </p>
            </section>

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
