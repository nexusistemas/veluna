import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Loader2, Settings } from 'lucide-react';
import MercadoPagoConfigCard from '../../components/admin/settings/MercadoPagoConfigCard';
import StoreProfileCard from '../../components/admin/settings/StoreProfileCard';
import WhatsappAutomationCard from '../../components/admin/settings/WhatsappAutomationCard';
import { useStoreSettings } from '../../contexts/StoreSettingsContext';
import { fetchPrivateSecretsAdmin } from '../../services/settingsAdminService';
import type { PrivateSecrets } from '../../types/database';

const INITIAL_SECRETS: PrivateSecrets = {
  id: 1,
  mp_access_token: null,
  mp_webhook_secret: null,
  mp_point_device_id: null,
  whatsapp_webhook_url: null,
  whatsapp_webhook_token: null,
  updated_at: '',
};

export default function SettingsPage() {
  const { settings, loadingSettings, refreshSettings } = useStoreSettings();
  const [secrets, setSecrets] = useState<PrivateSecrets>(INITIAL_SECRETS);
  const [loadingSecrets, setLoadingSecrets] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadSecrets = useCallback(async () => {
    setLoadingSecrets(true);
    setErrorMsg(null);
    try {
      const data = await fetchPrivateSecretsAdmin();
      setSecrets(data);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao carregar credenciais privadas.');
    } finally {
      setLoadingSecrets(false);
    }
  }, []);

  useEffect(() => {
    void loadSecrets();
  }, [loadSecrets]);

  const handleSavedAll = useCallback(async () => {
    await Promise.all([refreshSettings(), loadSecrets()]);
  }, [refreshSettings, loadSecrets]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand text-white shadow-sm">
          <Settings className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-stone-900">Configurações da Loja</h1>
          <p className="text-xs text-stone-500">
            Identidade visual, integração segura Mercado Pago e automação de WhatsApp
          </p>
        </div>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {loadingSettings || loadingSecrets ? (
        <div className="flex justify-center py-12 text-stone-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <div className="space-y-5">
          <StoreProfileCard settings={settings} onSaved={refreshSettings} />
          <MercadoPagoConfigCard
            settings={settings}
            secrets={secrets}
            onSaved={handleSavedAll}
          />
          <WhatsappAutomationCard
            settings={settings}
            secrets={secrets}
            onSaved={handleSavedAll}
          />
        </div>
      )}
    </div>
  );
}
