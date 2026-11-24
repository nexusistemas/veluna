import { useEffect, useState, type FormEvent } from 'react';
import { CheckCircle2, Loader2, Save, Store, Truck } from 'lucide-react';
import { cleanCep, formatCep, resolveCepWithCoords } from '../../../lib/geoCep';
import { updateLogisticsSettings } from '../../../services/logisticsAdminService';
import type { DeliveryMode, StoreSettings } from '../../../types/database';
import RadiusConfigSection from './RadiusConfigSection';

interface PickupAndRadiusCardProps {
  settings: StoreSettings;
  onSaved: () => Promise<void>;
}

interface LogisticsFormState {
  pickupEnabled: boolean;
  pickupAddress: string;
  pickupInstructions: string;
  deliveryEnabled: boolean;
  deliveryMode: DeliveryMode;
  freeShippingMin: string;
  storeCep: string;
  storeLat: string;
  storeLng: string;
  maxRadiusKm: string;
  radiusBaseFee: string;
  radiusKmFee: string;
}

const MODE_OPTIONS: Array<{ value: DeliveryMode; label: string; desc: string }> = [
  { value: 'zones', label: 'Apenas Cidades/Bairros', desc: 'Usa somente as zonas cadastradas abaixo' },
  { value: 'radius', label: 'Apenas Raio em KM', desc: 'Calcula distância pelo CEP/GPS da loja' },
  { value: 'both', label: 'Híbrido: Cidades + Raio', desc: 'Prioriza zona cadastrada; se não achar, usa o Raio KM' },
];

const INPUT_CLS =
  'mt-1 h-11 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 text-sm focus:border-brand focus:bg-white focus:outline-none';

function toFormState(s: StoreSettings): LogisticsFormState {
  return {
    pickupEnabled: s.pickup_enabled,
    pickupAddress: s.pickup_address ?? '',
    pickupInstructions: s.pickup_instructions ?? '',
    deliveryEnabled: s.delivery_enabled,
    deliveryMode: s.delivery_mode,
    freeShippingMin: s.free_shipping_min ? String(s.free_shipping_min) : '',
    storeCep: formatCep(s.store_cep ?? ''),
    storeLat: s.store_lat !== null ? String(s.store_lat) : '',
    storeLng: s.store_lng !== null ? String(s.store_lng) : '',
    maxRadiusKm: String(s.max_radius_km ?? 10),
    radiusBaseFee: String(s.radius_base_fee ?? 5),
    radiusKmFee: String(s.radius_km_fee ?? 1.5),
  };
}

export default function PickupAndRadiusCard({ settings, onSaved }: PickupAndRadiusCardProps) {
  const [form, setForm] = useState<LogisticsFormState>(() => toFormState(settings));
  const [locating, setLocating] = useState<'cep' | 'gps' | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    setForm(toFormState(settings));
  }, [settings]);

  const patchForm = (patch: Partial<LogisticsFormState>) => setForm((prev) => ({ ...prev, ...patch }));

  const handleLookupCep = async () => {
    setFeedback(null);
    setLocating('cep');
    try {
      const resolved = await resolveCepWithCoords(form.storeCep);
      const next: Partial<LogisticsFormState> = { storeCep: formatCep(resolved.cep) };
      if (resolved.lat !== null && resolved.lng !== null) {
        next.storeLat = String(resolved.lat);
        next.storeLng = String(resolved.lng);
        setFeedback({ type: 'ok', text: `Localização encontrada: ${resolved.city} - ${resolved.state}.` });
      } else {
        setFeedback({ type: 'err', text: 'Endereço encontrado, mas sem coordenadas. Use o botão GPS do celular.' });
      }
      if (!form.pickupAddress.trim()) {
        next.pickupAddress = [resolved.street, resolved.neighborhood, `${resolved.city} - ${resolved.state}`]
          .filter(Boolean)
          .join(', ');
      }
      patchForm(next);
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Erro ao buscar CEP.' });
    } finally {
      setLocating(null);
    }
  };

  const handleUseGps = () => {
    if (!navigator.geolocation) {
      setFeedback({ type: 'err', text: 'Seu navegador não suporta geolocalização GPS.' });
      return;
    }
    setFeedback(null);
    setLocating('gps');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        patchForm({ storeLat: pos.coords.latitude.toFixed(6), storeLng: pos.coords.longitude.toFixed(6) });
        setFeedback({ type: 'ok', text: 'Coordenadas exatas da loja capturadas pelo GPS!' });
        setLocating(null);
      },
      () => {
        setFeedback({ type: 'err', text: 'Permissão de GPS negada ou indisponível no dispositivo.' });
        setLocating(null);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      await updateLogisticsSettings({
        pickup_enabled: form.pickupEnabled,
        pickup_address: form.pickupAddress,
        pickup_instructions: form.pickupInstructions,
        delivery_enabled: form.deliveryEnabled,
        delivery_mode: form.deliveryMode,
        free_shipping_min: form.freeShippingMin.trim() ? Number(form.freeShippingMin) : null,
        store_cep: cleanCep(form.storeCep) || null,
        store_lat: form.storeLat.trim() ? Number(form.storeLat) : null,
        store_lng: form.storeLng.trim() ? Number(form.storeLng) : null,
        max_radius_km: Number(form.maxRadiusKm) || 0,
        radius_base_fee: Number(form.radiusBaseFee) || 0,
        radius_km_fee: Number(form.radiusKmFee) || 0,
      });
      await onSaved();
      setFeedback({ type: 'ok', text: 'Configurações de entrega e retirada salvas!' });
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Erro ao salvar configurações.' });
    } finally {
      setSaving(false);
    }
  };

  const showRadiusBlock = form.deliveryMode === 'radius' || form.deliveryMode === 'both';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {feedback && (
        <div className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm ${feedback.type === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
          {feedback.type === 'ok' && <CheckCircle2 className="h-4 w-4 shrink-0" />}
          <span>{feedback.text}</span>
        </div>
      )}

      <section className="rounded-3xl border border-stone-200 bg-white p-4 sm:p-5 shadow-sm space-y-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand"><Store className="h-5 w-5" /></div>
            <div>
              <h2 className="text-base font-bold text-stone-900">Retirada Presencial</h2>
              <p className="text-xs text-stone-500">Cliente retira grátis na loja ou ponto combinado</p>
            </div>
          </div>
          <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 text-xs font-semibold text-stone-700">
            <input type="checkbox" checked={form.pickupEnabled} onChange={(e) => patchForm({ pickupEnabled: e.target.checked })} className="h-5 w-5 rounded accent-brand" />
            Ativa
          </label>
        </div>
        <div>
          <label className="block text-xs font-semibold text-stone-700">Endereço Completo de Retirada</label>
          <input type="text" value={form.pickupAddress} onChange={(e) => patchForm({ pickupAddress: e.target.value })} placeholder="Ex: Rua das Flores, 120 - Centro" className={INPUT_CLS} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-stone-700">Horário / Instruções de Retirada</label>
          <input type="text" value={form.pickupInstructions} onChange={(e) => patchForm({ pickupInstructions: e.target.value })} placeholder="Ex: Seg a Sáb, das 9h às 18h" className={INPUT_CLS} />
        </div>
      </section>

      <section className="rounded-3xl border border-stone-200 bg-white p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand"><Truck className="h-5 w-5" /></div>
            <div>
              <h2 className="text-base font-bold text-stone-900">Regras Gerais de Entrega</h2>
              <p className="text-xs text-stone-500">Escolha como o frete será calculado no checkout</p>
            </div>
          </div>
          <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 text-xs font-semibold text-stone-700">
            <input type="checkbox" checked={form.deliveryEnabled} onChange={(e) => patchForm({ deliveryEnabled: e.target.checked })} className="h-5 w-5 rounded accent-brand" />
            Ativa
          </label>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {MODE_OPTIONS.map((opt) => (
            <button key={opt.value} type="button" onClick={() => patchForm({ deliveryMode: opt.value })} className={`min-h-[64px] rounded-2xl border p-3 text-left transition ${form.deliveryMode === opt.value ? 'border-brand bg-brand-50 text-brand' : 'border-stone-200 bg-stone-50 text-stone-700 hover:border-brand-200'}`}>
              <p className="text-xs font-bold">{opt.label}</p>
              <p className="mt-0.5 text-[11px] opacity-80">{opt.desc}</p>
            </button>
          ))}
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700">Frete Grátis em compras acima de (R$ — opcional)</label>
          <input type="number" step="0.01" min="0" value={form.freeShippingMin} onChange={(e) => patchForm({ freeShippingMin: e.target.value })} placeholder="Deixe vazio para desativar" className={INPUT_CLS} />
        </div>

        {showRadiusBlock && (
          <RadiusConfigSection
            storeCep={form.storeCep}
            storeLat={form.storeLat}
            storeLng={form.storeLng}
            maxRadiusKm={form.maxRadiusKm}
            radiusBaseFee={form.radiusBaseFee}
            radiusKmFee={form.radiusKmFee}
            locating={locating}
            onChange={patchForm}
            onLookupCep={() => void handleLookupCep()}
            onUseGps={handleUseGps}
          />
        )}

        <button type="submit" disabled={saving} className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-brand px-5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Salvando...' : 'Salvar Configurações de Entrega'}
        </button>
      </section>
    </form>
  );
}
