import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { AlertCircle, Camera, Keyboard, Loader2, X } from 'lucide-react';
import { playScanBeep } from '../../../lib/soundAlert';

interface BarcodeScannerModalProps {
  open: boolean;
  onClose: () => void;
  onDetected: (code: string) => void;
}

const SCANNER_ELEMENT_ID = 'veluna-pos-barcode-reader';

export default function BarcodeScannerModal({
  open,
  onClose,
  onDetected,
}: BarcodeScannerModalProps) {
  const [starting, setStarting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const handledRef = useRef(false);

  useEffect(() => {
    if (!open) return;

    let active = true;
    handledRef.current = false;
    setCameraError(null);
    setStarting(true);

    const stopAndClean = async (instance: Html5Qrcode | null) => {
      if (!instance) return;
      try {
        if (instance.isScanning) {
          await instance.stop();
        }
      } catch {
        // Ignora erro caso a câmera já esteja parada
      }
      try {
        instance.clear();
      } catch {
        // Ignora erro ao limpar container
      }
    };

    const startScanner = async () => {
      try {
        const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.UPC_A,
          ],
          verbose: false,
        });
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 260, height: 130 } },
          (decodedText) => {
            if (handledRef.current || !active) return;
            const cleaned = decodedText.trim();
            if (!cleaned) return;
            handledRef.current = true;
            playScanBeep();
            void stopAndClean(scanner).finally(() => {
              scannerRef.current = null;
              onDetected(cleaned);
            });
          },
          () => {
            // Frame sem código válido — ignora silenciosamente
          },
        );
        if (active) setStarting(false);
      } catch (err) {
        if (!active) return;
        setStarting(false);
        const msg =
          err instanceof Error && err.message
            ? err.message
            : 'Não foi possível acessar a câmera traseira.';
        setCameraError(
          msg.includes('NotAllowed') || msg.includes('Permission')
            ? 'Permissão da câmera negada. Autorize a câmera no navegador ou digite o EAN abaixo.'
            : 'Câmera indisponível neste dispositivo/navegador. Use o campo manual abaixo.',
        );
      }
    };

    const timerId = window.setTimeout(() => {
      void startScanner();
    }, 120);

    return () => {
      active = false;
      window.clearTimeout(timerId);
      const current = scannerRef.current;
      scannerRef.current = null;
      void stopAndClean(current);
    };
  }, [open, onDetected]);

  if (!open) return null;

  const handleManualSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleaned = manualCode.trim();
    if (!cleaned) return;
    playScanBeep();
    setManualCode('');
    onDetected(cleaned);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-950/75 p-0 sm:p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Leitor de código de barras"
    >
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">Bipar Código de Barras</h2>
              <p className="text-xs text-stone-500">Aponte para EAN-13, EAN-8 ou CODE-128</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar leitor"
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-stone-100 text-stone-600 hover:bg-stone-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-stone-200 bg-stone-950 min-h-[220px] flex items-center justify-center">
          <div id={SCANNER_ELEMENT_ID} className="w-full" />
          {starting && !cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-stone-950/80 text-white">
              <Loader2 className="h-7 w-7 animate-spin text-brand-300" />
              <p className="text-xs font-medium">Abrindo câmera traseira...</p>
            </div>
          )}
        </div>

        {cameraError && (
          <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <span>{cameraError}</span>
          </div>
        )}

        <form onSubmit={handleManualSubmit} className="space-y-2 border-t border-stone-100 pt-3">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-stone-700">
            <Keyboard className="h-3.5 w-3.5 text-brand" />
            Digitar código EAN manualmente
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Ex: 7891234567890"
              className="h-11 flex-1 rounded-xl border border-stone-200 bg-stone-50 px-3 font-mono text-sm focus:border-brand focus:bg-white focus:outline-none"
            />
            <button
              type="submit"
              className="min-h-[44px] rounded-xl bg-brand px-4 text-xs font-bold text-white hover:bg-brand-700"
            >
              Buscar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
