import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Loader2, Truck } from 'lucide-react';
import DeliveryZonesCard from '../../components/admin/logistics/DeliveryZonesCard';
import PickupAndRadiusCard from '../../components/admin/logistics/PickupAndRadiusCard';
import ShippingSimulatorCard from '../../components/admin/logistics/ShippingSimulatorCard';
import { useStoreSettings } from '../../contexts/StoreSettingsContext';
import { listDeliveryZonesAdmin } from '../../services/logisticsAdminService';
import type { DeliveryZone } from '../../types/database';

export default function DeliverySettingsPage() {
  const { settings, loadingSettings, refreshSettings } = useStoreSettings();
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loadingZones, setLoadingZones] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadZones = useCallback(async () => {
    setLoadingZones(true);
    setErrorMsg(null);
    try {
      setZones(await listDeliveryZonesAdmin());
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao carregar zonas de entrega.');
    } finally {
      setLoadingZones(false);
    }
  }, []);

  useEffect(() => {
    void loadZones();
  }, [loadZones]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand text-white shadow-sm">
          <Truck className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-stone-900">Entrega e Retirada</h1>
          <p className="text-xs text-stone-500">
            Configure retirada grátis, taxas por cidade/bairro, raio em KM e teste no simulador
          </p>
        </div>
      </div>

      {errorMsg && (
        <div role="alert" className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {loadingSettings ? (
        <div className="flex justify-center py-12 text-stone-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <>
          <PickupAndRadiusCard settings={settings} onSaved={refreshSettings} />
          <DeliveryZonesCard zones={zones} loading={loadingZones} onChanged={loadZones} />
          <ShippingSimulatorCard settings={settings} zones={zones} />
        </>
      )}
    </div>
  );
}
