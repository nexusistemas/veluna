import { useState, type FormEvent } from 'react';
import { AlertCircle, Calculator, CheckCircle2, Loader2, MapPin, Truck } from 'lucide-react';
import { formatBRL } from '../../../lib/formatters';
import { formatCep } from '../../../lib/geoCep';
import {
  calculateShippingQuote,
  type ShippingCalculationResult,
  type ShippingRuleSource,
} from '../../../services/shippingService';
import type { DeliveryZone, StoreSettings } from '../../../types/database';

interface ShippingSimulatorCardProps {
  settings: StoreSettings;
  zones: DeliveryZone[];
}

const RULE_LABELS: Record<ShippingRuleSource, string> = {
  pickup: 'Retirada',
  zone_neighborhood: 'Zona Bairro',
  zone_city: 'Zona Cidade',
  radius: 'Raio KM',
};

export default function ShippingSimulatorCard({ settings, zones }: ShippingSimulatorCardProps) {
  const [cep, setCep] = useState('');
  const [subtotal, setSubtotal] = useState('120');
  const [running, setRunning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<ShippingCalculationResult | null>(null);

  const handleSimulate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMsg(null);
    setRunning(true);
    try {
      const quote = await calculateShippingQuote({
        rawCep: cep,
        subtotal: Number(subtotal) || 0,
        settings,
        activeZones: zones.filter((z) => z.is_active),
      });
      setResult(quote);
    } catch (err) {
      setResult(null);
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao simular frete.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <section className="rounded-3xl border border-brand-200 bg-gradient-to-br from-brand-50/60 via-white to-white p-4 sm:p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white shadow-sm">
          <Calculator className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-stone-900">Simulador de Frete em Tempo Real</h2>
          <p className="text-xs text-stone-500">Teste qualquer CEP com as regras salvas acima</p>
        </div>
      </div>

      <form onSubmit={handleSimulate} className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <div>
          <label className="block text-[11px] font-semibold text-stone-600">CEP do Cliente</label>
          <input
            type="text"
            inputMode="numeric"
            value={cep}
            onChange={(e) => setCep(formatCep(e.target.value))}
            placeholder="00000-000"
            className="mt-1 h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm focus:border-brand focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-stone-600">Valor do Carrinho (R$)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={subtotal}
            onChange={(e) => setSubtotal(e.target.value)}
            className="mt-1 h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm focus:border-brand focus:outline-none"
          />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={running}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
            {running ? 'Calculando...' : 'Simular Frete'}
          </button>
        </div>
      </form>

      {errorMsg && (
        <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {result && (
        <div className="space-y-3 border-t border-brand-100 pt-3">
          {result.address && (
            <div className="flex items-start gap-2 rounded-2xl border border-stone-200 bg-white p-3 text-xs text-stone-700">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
              <div>
                <p className="font-semibold text-stone-900">
                  {[result.address.street, result.address.neighborhood].filter(Boolean).join(', ') || 'CEP localizado'}
                </p>
                <p className="text-stone-500">
                  {result.address.city} - {result.address.state} • CEP {formatCep(result.address.cep)}
                  {result.address.lat !== null && result.address.lng !== null
                    ? ` (${result.address.lat.toFixed(4)}, ${result.address.lng.toFixed(4)})`
                    : ' (sem GPS)'}
                </p>
              </div>
            </div>
          )}

          {result.deliveryUnavailableReason && (
            <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <span>{result.deliveryUnavailableReason}</span>
            </div>
          )}

          {result.options.length > 0 && (
            <div className="space-y-2">
              {result.options.map((opt) => (
                <div key={opt.id} className="flex items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-3.5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <p className="text-sm font-bold text-stone-900">{opt.title}</p>
                      <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand">
                        {RULE_LABELS[opt.ruleSource]}
                      </span>
                      {opt.isFreeShipping && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                          Frete Grátis
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-stone-600">{opt.subtitle}</p>
                    <p className="text-[11px] text-stone-400">{opt.estimatedTime}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    {opt.isFreeShipping && opt.originalFee > 0 ? (
                      <>
                        <p className="text-[11px] text-stone-400 line-through">{formatBRL(opt.originalFee)}</p>
                        <p className="text-sm font-bold text-emerald-700">Grátis</p>
                      </>
                    ) : (
                      <p className="text-sm font-bold text-stone-900">
                        {opt.fee === 0 ? 'Grátis' : formatBRL(opt.fee)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
