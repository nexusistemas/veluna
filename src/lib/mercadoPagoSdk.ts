export interface MercadoPagoBrickController {
  unmount: () => void | Promise<void>;
}

export interface MercadoPagoCardBrickOptions {
  initialization: {
    amount: number;
    payer?: {
      email?: string;
    };
  };
  customization?: {
    visual?: {
      style?: {
        theme?: 'default' | 'dark' | 'bootstrap' | 'flat';
        customVariables?: Record<string, string>;
      };
      hideFormTitle?: boolean;
    };
    paymentMethods?: {
      maxInstallments?: number;
      minInstallments?: number;
    };
  };
  callbacks: {
    onReady?: () => void;
    onSubmit: (formData: Record<string, unknown>) => Promise<void>;
    onError?: (error: unknown) => void;
  };
}

export interface MercadoPagoBricksBuilder {
  create: (
    brickType: 'cardPayment',
    containerId: string,
    settings: MercadoPagoCardBrickOptions,
  ) => Promise<MercadoPagoBrickController>;
}

export interface MercadoPagoInstance {
  bricks: () => MercadoPagoBricksBuilder;
}

interface MercadoPagoConstructor {
  new (publicKey: string, options?: { locale?: string }): MercadoPagoInstance;
}

declare global {
  interface Window {
    MercadoPago?: MercadoPagoConstructor;
  }
}

const MP_SDK_URL = 'https://sdk.mercadopago.com/js/v2';
let sdkLoadPromise: Promise<MercadoPagoConstructor> | null = null;

function ensureMercadoPagoScript(): Promise<MercadoPagoConstructor> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('SDK do Mercado Pago disponível apenas no navegador.'));
  }

  if (window.MercadoPago) {
    return Promise.resolve(window.MercadoPago);
  }

  if (sdkLoadPromise) {
    return sdkLoadPromise;
  }

  sdkLoadPromise = new Promise<MercadoPagoConstructor>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${MP_SDK_URL}"]`);
    const script = existing ?? document.createElement('script');

    const handleLoad = () => {
      if (window.MercadoPago) {
        resolve(window.MercadoPago);
      } else {
        sdkLoadPromise = null;
        reject(new Error('SDK do Mercado Pago carregado, mas objeto global não encontrado.'));
      }
    };

    const handleError = () => {
      sdkLoadPromise = null;
      reject(new Error('Não foi possível carregar o script do Mercado Pago.'));
    };

    script.addEventListener('load', handleLoad, { once: true });
    script.addEventListener('error', handleError, { once: true });

    if (!existing) {
      script.src = MP_SDK_URL;
      script.async = true;
      document.head.appendChild(script);
    }
  });

  return sdkLoadPromise;
}

export async function loadMercadoPagoSdk(publicKey: string): Promise<MercadoPagoInstance> {
  const cleanKey = publicKey.trim();
  if (!cleanKey) {
    throw new Error('Chave pública do Mercado Pago não configurada.');
  }

  const MercadoPagoCtor = await ensureMercadoPagoScript();
  return new MercadoPagoCtor(cleanKey, { locale: 'pt-BR' });
}
