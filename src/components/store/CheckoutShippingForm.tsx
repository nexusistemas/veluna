import { useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, LocateFixed, Store, Truck } from 'lucide-react';
import { formatBRL } from '../../lib/formatters';
import { formatCep } from '../../lib/geoCep';
import type { ResolvedGpsLocation } from '../../lib/geoMaps';
import type { ShippingCalculationResult } from '../../services/shippingService';
import type { FulfillmentType, StoreSettings } from '../../types/database';
import GpsLocationPickerModal from './GpsLocationPickerModal';
import PickupLocationCard from './PickupLocationCard';

export interface CheckoutAddressFields {
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
}

interface CheckoutShippingFormProps {
  settings: StoreSettings;
  fulfillmentType: FulfillmentType;
  onFulfillmentChange: (next: FulfillmentType) => void;
  cep: string;
  onCepChange: (formatted: string) => void;
  address: CheckoutAddressFields;
  onAddressChange: (patch: Partial<CheckoutAddressFields>) => void;
  shippingResult: ShippingCalculationResult | null;
  calculating: boolean;
  shippingError: string | null;
  onCalculateCep: (overrideCep?: string) => void;
  onGpsLocationConfirmed: (location: ResolvedGpsLocation) => void;
  isFreeShippingCoupon: boolean;
}

const INPUT_CLS =
  'mt-1 h-11 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 text-sm focus:border-brand focus:bg-white focus:outline-none';

export default function CheckoutShippingForm({
  settings,
  fulfillmentType,
  onFulfillmentChange,
  cep,
  onCepChange,
  address,
  onAddressChange,
  shippingResult,
  calculating,
  shippingError,
  onCalculateCep,
  onGpsLocationConfirmed,
  isFreeShippingCoupon,
}: CheckoutShippingFormProps) {
  const [gpsModalOpen, setGpsModalOpen] = useState(false);
  const deliveryOption = shippingResult?.options.find((o) => o.fulfillmentType === 'delivery');

  const handleCepInput = (raw: string) => {
    const formatted = formatCep(raw);
    onCepChange(formatted);
    if (formatted.replace(/\D/g, '').length === 8) {
      onCalculateCep(formatted);
    }
  };

  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-4 sm:p-5 shadow-sm space-y-4">
      <h2 className="text-base font-bold text-stone-900">Entrega ou Retirada</h2>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {settings.delivery_enabled && (
          <button
            type="button"
            onClick={() => onFulfillmentChange('delivery')}
            className={`flex min-h-[60px] items-center gap-3 rounded-2xl border p-3.5 text-left transition ${
              fulfillmentType === 'delivery'
                ? 'border-brand bg-brand-50 text-brand'
                : 'border-stone-200 bg-stone-50 text-stone-700'
            }`}
          >
            <Truck className="h-5 w-5 shrink-0" />
            <div>
              <p className="text-xs font-bold">Receber em Casa</p>
              <p className="text-[11px] opacity-80">Calcule pelo GPS ou CEP</p>
            </div>
          </button>
        )}

        {settings.pickup_enabled && (
          <button
            type="button"
            onClick={() => onFulfillmentChange('pickup')}
            className={`flex min-h-[60px] items-center gap-3 rounded-2xl border p-3.5 text-left transition ${
              fulfillmentType === 'pickup'
                ? 'border-brand bg-brand-50 text-brand'
                : 'border-stone-200 bg-stone-50 text-stone-700'
            }`}
          >
            <Store className="h-5 w-5 shrink-0" />
            <div>
              <p className="text-xs font-bold">Retirar na Loja — Grátis</p>
              <p className="text-[11px] opacity-80">Ver local no Maps / Waze</p>
            </div>
          </button>
        )}
      </div>

      {fulfillmentType === 'pickup' ? (
        <PickupLocationCard
          pickupAddress={settings.pickup_address}
          pickupInstructions={settings.pickup_instructions}
          storeLat={settings.store_lat}
          storeLng={settings.store_lng}
        />
      ) : (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setGpsModalOpen(true)}
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-brand-200 bg-brand-50/70 px-4 text-xs sm:text-sm font-bold text-brand transition hover:bg-brand-100 active:scale-[0.99]"
          >
            <LocateFixed className="h-4 w-4 shrink-0" />
            Usar meu GPS e ajustar alfinete no mapa
          </button>

          <div>
            <label className="block text-xs font-semibold text-stone-700">CEP (ou selecione pelo GPS acima)</label>
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={cep}
                onChange={(e) => handleCepInput(e.target.value)}
                placeholder="00000-000"
                className="h-11 flex-1 rounded-xl border border-stone-200 bg-stone-50 px-3 text-sm focus:border-brand focus:bg-white focus:outline-none"
              />
              <button
                type="button"
                onClick={() => onCalculateCep()}
                disabled={calculating}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-brand px-4 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {calculating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Calcular'}
              </button>
            </div>
          </div>

          {shippingError && (
            <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{shippingError}</span>
            </div>
          )}

          {shippingResult?.deliveryUnavailableReason && (
            <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <span>{shippingResult.deliveryUnavailableReason}</span>
            </div>
          )}

          {deliveryOption && (
            <div className="flex items-center justify-between gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <div>
                  <p className="font-bold text-emerald-900">{deliveryOption.subtitle}</p>
                  <p className="text-emerald-700">{deliveryOption.estimatedTime}</p>
                </div>
              </div>
              <span className="shrink-0 text-sm font-extrabold text-emerald-800">
                {deliveryOption.isFreeShipping || isFreeShippingCoupon
                  ? 'Grátis'
                  : formatBRL(deliveryOption.fee)}
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-stone-700">Rua / Logradouro *</label>
              <input type="text" required value={address.street} onChange={(e) => onAddressChange({ street: e.target.value })} className={INPUT_CLS} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700">Número *</label>
              <input type="text" required value={address.number} onChange={(e) => onAddressChange({ number: e.target.value })} placeholder="Ex: 120" className={INPUT_CLS} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-stone-700">Complemento</label>
              <input type="text" value={address.complement} onChange={(e) => onAddressChange({ complement: e.target.value })} placeholder="Apto, bloco, ref." className={INPUT_CLS} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700">Bairro *</label>
              <input type="text" required value={address.neighborhood} onChange={(e) => onAddressChange({ neighborhood: e.target.value })} className={INPUT_CLS} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-stone-700">Cidade *</label>
              <input type="text" required value={address.city} onChange={(e) => onAddressChange({ city: e.target.value })} className={INPUT_CLS} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700">UF *</label>
              <input type="text" required maxLength={2} value={address.state} onChange={(e) => onAddressChange({ state: e.target.value.toUpperCase() })} className={`${INPUT_CLS} uppercase`} />
            </div>
          </div>
        </div>
      )}

      <GpsLocationPickerModal
        open={gpsModalOpen}
        initialLat={shippingResult?.address?.lat ?? settings.store_lat}
        initialLng={shippingResult?.address?.lng ?? settings.store_lng}
        onClose={() => setGpsModalOpen(false)}
        onConfirm={(loc) => {
          setGpsModalOpen(false);
          onGpsLocationConfirmed(loc);
        }}
      />
    </section>
  );
}
