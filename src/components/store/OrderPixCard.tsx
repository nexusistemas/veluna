import { Check, Copy, QrCode } from 'lucide-react';

interface OrderPixCardProps {
  qrBase64: string | null;
  qrCode: string | null;
  storePixKey: string | null;
  copiedPix: boolean;
  onCopyPix: () => void;
}

export default function OrderPixCard({
  qrBase64,
  qrCode,
  storePixKey,
  copiedPix,
  onCopyPix,
}: OrderPixCardProps) {
  if (qrCode || qrBase64) {
    return (
      <section className="rounded-3xl border border-brand-200 bg-white p-5 text-center shadow-sm space-y-3">
        <div className="flex items-center justify-center gap-2 text-brand font-bold">
          <QrCode className="h-5 w-5" /> Pague com Pix
        </div>
        {qrBase64 && (
          <img
            src={qrBase64.startsWith('data:') ? qrBase64 : `data:image/png;base64,${qrBase64}`}
            alt="QR Code Pix"
            className="mx-auto h-52 w-52 rounded-2xl border border-stone-200 p-2"
          />
        )}
        {qrCode && (
          <button
            type="button"
            onClick={onCopyPix}
            className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-brand px-4 text-sm font-bold text-white hover:bg-brand-700"
          >
            {copiedPix ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copiedPix ? 'Código Pix copiado!' : 'Copiar Pix Copia e Cola'}
          </button>
        )}
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-brand-100 bg-brand-50/60 p-4 text-xs leading-relaxed text-stone-700 space-y-2">
      <p className="font-bold text-stone-900">Orientações de Pagamento</p>
      <p>
        Seu pedido foi registrado com sucesso! Envie o resumo no WhatsApp abaixo para confirmar o
        pagamento ou enviar seu comprovante rapidamente.
      </p>
      {storePixKey && (
        <div className="flex items-center justify-between gap-2 rounded-xl bg-white border border-brand-100 px-3 py-2">
          <span className="truncate font-mono text-xs text-stone-800">
            Chave Pix: {storePixKey}
          </span>
          <button type="button" onClick={onCopyPix} className="shrink-0 font-bold text-brand">
            {copiedPix ? 'Copiada!' : 'Copiar'}
          </button>
        </div>
      )}
    </section>
  );
}
