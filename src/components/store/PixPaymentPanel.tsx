import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Loader2,
  MessageCircle,
  QrCode,
  RefreshCw,
} from 'lucide-react';
import { generatePixPayment, syncOrderPaymentStatus } from '../../services/paymentService';
import type { PaymentStatus } from '../../types/database';

interface PixPaymentPanelProps {
  orderId: string;
  publicToken: string;
  initialQrCode: string | null;
  initialQrBase64: string | null;
  paymentStatus: PaymentStatus;
  fallbackWhatsappUrl?: string;
  onPaymentApproved: () => void;
}

export default function PixPaymentPanel({
  orderId,
  publicToken,
  initialQrCode,
  initialQrBase64,
  paymentStatus,
  fallbackWhatsappUrl,
  onPaymentApproved,
}: PixPaymentPanelProps) {
  const [qrCode, setQrCode] = useState<string | null>(initialQrCode);
  const [qrBase64, setQrBase64] = useState<string | null>(initialQrBase64);
  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [approved, setApproved] = useState(paymentStatus === 'approved');

  const requestPix = useCallback(async () => {
    setGenerating(true);
    setErrorMsg(null);
    try {
      const res = await generatePixPayment(orderId, publicToken);
      setQrCode(res.qr_code);
      setQrBase64(res.qr_code_base64);
      if (res.payment_status === 'approved' || res.status === 'approved') {
        setApproved(true);
        onPaymentApproved();
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Não foi possível gerar o QR Code Pix agora.',
      );
    } finally {
      setGenerating(false);
    }
  }, [orderId, publicToken, onPaymentApproved]);

  useEffect(() => {
    if (paymentStatus === 'approved') {
      setApproved(true);
      return;
    }
    if (!qrCode && !generating && !errorMsg) {
      void requestPix();
    }
  }, [paymentStatus, qrCode, generating, errorMsg, requestPix]);

  useEffect(() => {
    if (paymentStatus !== 'pending' || approved || !qrCode) return;
    let cancelled = false;
    const intervalId = window.setInterval(() => {
      syncOrderPaymentStatus(orderId, publicToken)
        .then((res) => {
          if (!cancelled && res.payment_status === 'approved') {
            setApproved(true);
            onPaymentApproved();
          }
        })
        .catch(() => {});
    }, 6000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [orderId, publicToken, paymentStatus, approved, qrCode, onPaymentApproved]);

  const handleCopy = async () => {
    if (!qrCode) return;
    try {
      await navigator.clipboard.writeText(qrCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Ignora erro de clipboard
    }
  };

  if (approved) {
    return (
      <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-center space-y-2">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
        <p className="text-base font-extrabold text-emerald-900">Pix Confirmado!</p>
        <p className="text-xs text-emerald-800">
          Recebemos seu pagamento na hora. Seu pedido já entrou na fila de preparação!
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-brand-200 bg-white p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-center gap-2 text-brand font-bold">
        <QrCode className="h-5 w-5" />
        <span>Pague com Pix Instantâneo</span>
      </div>

      {generating ? (
        <div className="flex flex-col items-center gap-2 py-8 text-stone-500">
          <Loader2 className="h-7 w-7 animate-spin text-brand" />
          <p className="text-xs font-medium">Gerando seu QR Code Pix seguro...</p>
        </div>
      ) : errorMsg ? (
        <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center">
          <AlertCircle className="mx-auto h-7 w-7 text-amber-600" />
          <p className="text-xs font-semibold text-amber-900">{errorMsg}</p>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => void requestPix()}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 text-xs font-bold text-white hover:bg-brand-700"
            >
              <RefreshCw className="h-4 w-4" /> Tentar gerar Pix novamente
            </button>
            {fallbackWhatsappUrl && (
              <a
                href={fallbackWhatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-600 px-4 text-xs font-bold text-white hover:bg-emerald-700"
              >
                <MessageCircle className="h-4 w-4" /> Combinar Pix pelo WhatsApp
              </a>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4 text-center">
          {qrBase64 && (
            <img
              src={qrBase64.startsWith('data:') ? qrBase64 : `data:image/png;base64,${qrBase64}`}
              alt="QR Code Pix"
              className="mx-auto h-52 w-52 rounded-2xl border border-stone-200 p-2 bg-white"
            />
          )}

          {qrCode && (
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-brand px-4 text-sm font-bold text-white shadow-sm hover:bg-brand-700"
            >
              {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
              {copied ? 'Código Pix Copiado!' : 'Copiar Código Pix (Copia e Cola)'}
            </button>
          )}

          <ol className="rounded-2xl bg-stone-50 p-3.5 text-left text-xs text-stone-600 space-y-1.5 list-decimal list-inside">
            <li>Toque em <strong>Copiar Código Pix</strong> acima.</li>
            <li>Abra o aplicativo do seu banco na área <strong>Pix &gt; Pix Copia e Cola</strong>.</li>
            <li>Cole o código e confirme. A aprovação aparece automaticamente aqui!</li>
          </ol>

          <p className="inline-flex items-center gap-1.5 text-[11px] font-medium text-stone-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-brand" />
            Aguardando confirmação automática do pagamento...
          </p>
        </div>
      )}
    </section>
  );
}
