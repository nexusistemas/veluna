import { useEffect, useState } from 'react';
import { Download, Share, Smartphone, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const IOS_DISMISSED_KEY = 'veluna_pwa_ios_tip_dismissed';

function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  const mediaStandalone = window.matchMedia?.('(display-mode: standalone)').matches ?? false;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return mediaStandalone || iosStandalone;
}

function isIosDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export default function PwaInstallBanner() {
  const [standalone, setStandalone] = useState<boolean>(isStandaloneMode);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [androidDismissed, setAndroidDismissed] = useState(false);
  const [iosDismissed, setIosDismissed] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(IOS_DISMISSED_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    setStandalone(isStandaloneMode());

    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setStandalone(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  if (standalone) return null;

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setStandalone(true);
    }
    setDeferredPrompt(null);
  };

  const dismissIosTip = () => {
    setIosDismissed(true);
    try {
      window.localStorage.setItem(IOS_DISMISSED_KEY, '1');
    } catch {
      // Ignora erro de storage bloqueado
    }
  };

  if (deferredPrompt && !androidDismissed) {
    return (
      <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-3.5 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white">
            <Smartphone className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-stone-900 truncate">Painel Veluna no Celular</p>
            <p className="text-xs text-stone-600">Acesso rápido direto da tela inicial</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleInstallClick}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-brand px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-brand-700"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Instalar App no Celular
          </button>
          <button
            type="button"
            onClick={() => setAndroidDismissed(true)}
            aria-label="Dispensar aviso de instalação"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-stone-500 hover:bg-brand-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  if (isIosDevice() && !iosDismissed) {
    return (
      <div className="mb-4 flex items-start justify-between gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-3.5 text-xs text-stone-700 shadow-sm">
        <div className="flex items-start gap-2.5">
          <Share className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
          <p className="leading-relaxed">
            Para instalar no iPhone: toque em <strong>Compartilhar</strong> e em{' '}
            <strong>&apos;Adicionar à Tela de Início&apos;</strong>.
          </p>
        </div>
        <button
          type="button"
          onClick={dismissIosTip}
          aria-label="Fechar dica de instalação no iPhone"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-stone-500 hover:bg-brand-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return null;
}
