import { ExternalLink, MapPin, Navigation } from 'lucide-react';
import { buildGoogleMapsUrl, buildWazeUrl } from '../../lib/geoMaps';

interface PickupLocationCardProps {
  pickupAddress: string | null;
  pickupInstructions?: string | null;
  storeLat?: number | null;
  storeLng?: number | null;
  title?: string;
}

export default function PickupLocationCard({
  pickupAddress,
  pickupInstructions,
  storeLat,
  storeLng,
  title = 'Endereço de Retirada',
}: PickupLocationCardProps) {
  const googleUrl = buildGoogleMapsUrl({
    lat: storeLat,
    lng: storeLng,
    address: pickupAddress,
  });
  const wazeUrl = buildWazeUrl({
    lat: storeLat,
    lng: storeLng,
    address: pickupAddress,
  });

  return (
    <div className="rounded-2xl border border-brand-100 bg-brand-50/50 p-3.5 space-y-2.5 text-xs text-stone-700">
      <div className="space-y-1">
        <p className="flex items-center gap-1.5 font-bold text-stone-900">
          <MapPin className="h-4 w-4 text-brand shrink-0" /> {title}
        </p>
        {googleUrl ? (
          <a
            href={googleUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-medium text-stone-800 underline decoration-brand/40 underline-offset-2 hover:text-brand"
          >
            <span>{pickupAddress || 'Ver localização da loja no mapa'}</span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-brand" />
          </a>
        ) : (
          <p>{pickupAddress || 'Endereço informado após confirmação do pedido.'}</p>
        )}
        {pickupInstructions && <p className="text-stone-500">{pickupInstructions}</p>}
      </div>

      {(googleUrl || wazeUrl) && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 pt-0.5">
          {googleUrl && (
            <a
              href={googleUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-brand px-3.5 text-xs font-bold text-white shadow-sm transition hover:bg-brand-700"
            >
              <Navigation className="h-4 w-4 shrink-0" />
              Abrir no Google Maps
            </a>
          )}
          {wazeUrl && (
            <a
              href={wazeUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-brand-200 bg-white px-3.5 text-xs font-bold text-brand transition hover:bg-brand-50"
            >
              <MapPin className="h-4 w-4 shrink-0" />
              Abrir no Waze
            </a>
          )}
        </div>
      )}
    </div>
  );
}
