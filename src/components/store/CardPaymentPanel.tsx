import { useEffect, useId, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { loadMercadoPagoSdk, type MercadoPagoBrickController } from '../../lib/mercadoPagoSdk';
import {
  createCheckoutPreferenceLink,
  processCardPayment,
} from '../../services/paymentService';

interface CardPaymentPanelProps {
  orderId: string;
  publicToken: string;
  total: number;
  mpPublicKey: string | null;
  customerEmail?: string | null;
  onPaymentApproved: () => void;
}

export default function CardPaymentPanel({
  orderId,
  publicToken,
  total,
  mpPublicKey,
  customerEmail,
  onPaymentApproved,
}: CardPaymentPanelProps) {
  const rawId = useId();
  const containerId = `mp-card-brick-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  const [brickLoading, setBrickLoading] = useState(Boolean(mpPublicKey?.trim()));
  const [brickError, setBrickError] = useState<string | null>(null);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [pendingNotice, setPendingNotice] = useState<string | null>(null);
  const [approved, setApproved] = useState(false);
  const [openingLink, setOpeningLink] = useState(false);

  useEffect(() => {
    const cleanKey = mpPublicKey?.trim() ?? '';
    if (!cleanKey || approved) {
      setBrickLoading(false);
      return;
    }

    let active = true;
    let controller: MercadoPagoBrickController | null = null;
    setBrickLoading(true);
    setBrickError(null);

    const mountBrick = async () => {
      try {
        const mp = await loadMercadoPagoSdk(cleanKey);
        if (!active) return;

        const containerEl = document.getElementById(containerId);
        if (containerEl) containerEl.innerHTML = '';

        const bricks = mp.bricks();
        controller = await bricks.create('cardPayment', containerId, {
          initialization: {
            amount: Number(total.toFixed(2)),
            payer: customerEmail ? { email: customerEmail } : undefined,
          },
          customization: {
            visual: {
              hideFormTitle: true,
              style: {
                theme: 'default',
                customVariables: {
                  baseColor: '#db2777',
                },
              },
            },
            paymentMethods: {
              maxInstallments: 6,
            },
          },
          callbacks: {
            onReady: () => {
              if (active) setBrickLoading(false);
            },
            onError: () => {
              if (active) {
                setBrickLoading(false);
                setBrickError(
                  'Não foi possível exibir o formulário do cartão aqui. Use o link seguro do Mercado Pago abaixo.',
                );
              }
            },
            onSubmit: async (formData) => {
              setProcessingError(null);
              setPendingNotice(null);
              try {
                const res = await processCardPayment(orderId, formData, publicToken);
                if (!active) return;
                if (res.payment_status === 'approved' || res.status === 'approved') {
                  setApproved(true);
                  onPaymentApproved();
                  return;
                }
                if (res.payment_status === 'rejected' || res.status === 'rejected') {
                  setProcessingError(
                    res.status_detail
                      ? `Cartão não aprovado (${res.status_detail}). Confira os dados ou tente outro cartão.`
                      : 'Pagamento recusado pela operadora. Tente outro cartão ou use o Pix.',
                  );
                  return;
                }
                setPendingNotice(
                  'Pagamento enviado para análise do Mercado Pago. Assim que confirmar, o status atualiza automaticamente.',
                );
              } catch (err) {
                if (active) {
                  setProcessingError(
                    err instanceof Error
                      ? err.message
                      : 'Erro ao processar cartão. Tente novamente ou use o link seguro abaixo.',
                  );
                }
              }
            },
          },
        });
      } catch (err) {
        if (active) {
          setBrickLoading(false);
          setBrickError(
            err instanceof Error
              ? err.message
              : 'Não foi possível carregar o checkout transparente de cartão.',
          );
        }
      }
    };

    void mountBrick();

    return () => {
      active = false;
      if (controller) {
        void Promise.resolve(controller.unmount()).catch(() => {});
      }
    };
  }, [containerId, mpPublicKey, total, customerEmail, orderId, publicToken, approved, onPaymentApproved]);

  const handleOpenSecureLink = async () => {
    setOpeningLink(true);
    setProcessingError(null);
    try {
      const res = await createCheckoutPreferenceLink(orderId, publicToken);
      if (res.init_point) {
        window.location.href = res.init_point;
      } else {
        setProcessingError('Link de pagamento indisponível no momento.');
      }
    } catch (err) {
      setProcessingError(
        err instanceof Error ? err.message : 'Não foi possível gerar o link do Mercado Pago.',
      );
    } finally {
      setOpeningLink(false);
    }
  };

  if (approved) {
    return (
      <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-center space-y-2">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
        <p className="text-base font-extrabold text-emerald-900">Pagamento no Cartão Aprovado!</p>
        <p className="text-xs text-emerald-800">
          Seu pedido foi confirmado com sucesso e já está em preparação.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-brand-200 bg-white p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-brand font-bold">
          <CreditCard className="h-5 w-5" />
          <span>Pague com Cartão de Crédito</span>
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
          <ShieldCheck className="h-3.5 w-3.5" /> Ambiente Seguro
        </span>
      </div>

      {processingError && (
        <div role="alert" className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{processingError}</span>
        </div>
      )}

      {pendingNotice && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-900">
          {pendingNotice}
        </div>
      )}

      {mpPublicKey?.trim() ? (
        <div className="space-y-2">
          {brickLoading && (
            <div className="flex items-center justify-center gap-2 py-6 text-xs text-stone-500">
              <Loader2 className="h-5 w-5 animate-spin text-brand" />
              Carregando formulário seguro de cartão...
            </div>
          )}
          {brickError && (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">{brickError}</p>
          )}
          <div id={containerId} />
        </div>
      ) : (
        <p className="rounded-2xl bg-stone-50 p-3 text-xs text-stone-600">
          Finalize com segurança diretamente na página oficial do Mercado Pago clicando no botão abaixo.
        </p>
      )}

      <div className="border-t border-stone-100 pt-3">
        <button
          type="button"
          disabled={openingLink}
          onClick={() => void handleOpenSecureLink()}
          className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-sky-300 bg-sky-50 px-4 text-xs font-bold text-sky-900 hover:bg-sky-100 disabled:opacity-60"
        >
          {openingLink ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
          {openingLink ? 'Abrindo Mercado Pago...' : 'Pagar pelo Link Seguro Mercado Pago'}
        </button>
      </div>
    </section>
  );
}
