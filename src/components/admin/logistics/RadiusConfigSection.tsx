import { Crosshair, Loader2, MapPin, Search } from 'lucide-react';
import { formatCep } from '../../../lib/geoCep';

interface RadiusConfigSectionProps {
  storeCep: string;
  storeLat: string;
  storeLng: string;
  maxRadiusKm: string;
  radiusBaseFee: string;
  radiusKmFee: string;
  locating: 'cep' | 'gps' | null;
  onChange: (patch: {
    storeCep?: string;
    storeLat?: string;
    storeLng?: string;
    maxRadiusKm?: string;
    radiusBaseFee?: string;
    radiusKmFee?: string;
  }) => void;
  onLookupCep: () => void;
  onUseGps: () => void;
}

const INPUT_CLS =
  'mt-1 h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm focus:border-brand focus:outline-none';

export default function RadiusConfigSection({
  storeCep,
  storeLat,
  storeLng,
  maxRadiusKm,
  radiusBaseFee,
  radiusKmFee,
  locating,
  onChange,
  onLookupCep,
  onUseGps,
}: RadiusConfigSectionProps) {
  return (
    <div className="rounded-2xl border border-brand-100 bg-brand-50/40 p-3.5 space-y-3">
      <div className="flex items-center gap-2 text-sm font-bold text-stone-900">
        <MapPin className="h-4 w-4 text-brand" /> Localização da Loja e Cálculo por Raio (KM)
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          inputMode="numeric"
          value={storeCep}
          onChange={(e) => onChange({ storeCep: formatCep(e.target.value) })}
          placeholder="CEP da Loja (00000-000)"
          className="h-11 min-w-[160px] flex-1 rounded-xl border border-stone-200 bg-white px-3 text-sm focus:border-brand focus:outline-none"
        />
        <button
          type="button"
          onClick={onLookupCep}
          disabled={locating !== null}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-brand px-3.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {locating === 'cep' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Buscar pelo CEP
        </button>
        <button
          type="button"
          onClick={onUseGps}
          disabled={locating !== null}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-brand-200 bg-white px-3.5 text-xs font-semibold text-brand hover:bg-brand-50 disabled:opacity-60"
        >
          {locating === 'gps' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
          Usar GPS do Celular
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label className="block text-[11px] font-semibold text-stone-600">Latitude da Loja</label>
          <input type="number" step="any" value={storeLat} onChange={(e) => onChange({ storeLat: e.target.value })} placeholder="-23.55052" className={INPUT_CLS} />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-stone-600">Longitude da Loja</label>
          <input type="number" step="any" value={storeLng} onChange={(e) => onChange({ storeLng: e.target.value })} placeholder="-46.63331" className={INPUT_CLS} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-[11px] font-semibold text-stone-600">Raio Máx. (KM)</label>
          <input type="number" step="0.5" min="0" value={maxRadiusKm} onChange={(e) => onChange({ maxRadiusKm: e.target.value })} className={INPUT_CLS} />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-stone-600">Taxa Base (R$)</label>
          <input type="number" step="0.01" min="0" value={radiusBaseFee} onChange={(e) => onChange({ radiusBaseFee: e.target.value })} className={INPUT_CLS} />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-stone-600">Valor/KM (R$)</label>
          <input type="number" step="0.01" min="0" value={radiusKmFee} onChange={(e) => onChange({ radiusKmFee: e.target.value })} className={INPUT_CLS} />
        </div>
      </div>
    </div>
  );
}
