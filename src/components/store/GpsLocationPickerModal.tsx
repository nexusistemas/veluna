import { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { AlertCircle, Check, Loader2, LocateFixed, MapPin, X } from 'lucide-react';
import {
  requestBrowserGps,
  reverseGeocodeCoords,
  type ResolvedGpsLocation,
} from '../../lib/geoMaps';
import { formatCep } from '../../lib/geoCep';

interface GpsLocationPickerModalProps {
  open: boolean;
  initialLat?: number | null;
  initialLng?: number | null;
  onClose: () => void;
  onConfirm: (location: ResolvedGpsLocation) => void;
}

const DEFAULT_CENTER = { lat: -15.793889, lng: -47.882778 };

const PIN_ICON = L.divIcon({
  className: 'veluna-map-pin',
  html: `<div style="display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:9999px 9999px 9999px 0;transform:rotate(-45deg);background:#db2777;border:3px solid #ffffff;box-shadow:0 6px 14px rgba(0,0,0,0.28);"><div style="width:10px;height:10px;border-radius:9999px;background:#ffffff;"></div></div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
});

export default function GpsLocationPickerModal({
  open,
  initialLat,
  initialLng,
  onClose,
  onConfirm,
}: GpsLocationPickerModalProps) {
  const mapElRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const lookupSeqRef = useRef(0);

  const [locating, setLocating] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resolved, setResolved] = useState<ResolvedGpsLocation | null>(null);

  const resolvePoint = useCallback(async (lat: number, lng: number) => {
    const seq = ++lookupSeqRef.current;
    setResolving(true);
    setErrorMsg(null);
    try {
      const addr = await reverseGeocodeCoords(lat, lng);
      if (lookupSeqRef.current === seq) setResolved(addr);
    } catch (err) {
      if (lookupSeqRef.current === seq) {
        setResolved({
          cep: '', street: '', number: '', neighborhood: '', city: '', state: '',
          lat, lng, formattedAddress: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        });
        setErrorMsg(err instanceof Error ? err.message : 'Não foi possível ler o endereço.');
      }
    } finally {
      if (lookupSeqRef.current === seq) setResolving(false);
    }
  }, []);

  const movePinTo = useCallback(
    (lat: number, lng: number, zoom = 17) => {
      if (markerRef.current) markerRef.current.setLatLng([lat, lng]);
      if (mapRef.current) mapRef.current.setView([lat, lng], zoom, { animate: true });
      void resolvePoint(lat, lng);
    },
    [resolvePoint],
  );

  const handleUseGps = useCallback(async () => {
    setLocating(true);
    setErrorMsg(null);
    try {
      const coords = await requestBrowserGps();
      movePinTo(coords.lat, coords.lng, 18);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao acessar o GPS.');
    } finally {
      setLocating(false);
    }
  }, [movePinTo]);

  useEffect(() => {
    if (!open || !mapElRef.current) return;

    const hasInit =
      initialLat !== null && initialLat !== undefined &&
      initialLng !== null && initialLng !== undefined &&
      Number.isFinite(Number(initialLat)) && Number.isFinite(Number(initialLng));

    const startLat = hasInit ? Number(initialLat) : DEFAULT_CENTER.lat;
    const startLng = hasInit ? Number(initialLng) : DEFAULT_CENTER.lng;
    const startZoom = hasInit ? 15 : 4;

    const map = L.map(mapElRef.current, { zoomControl: true }).setView([startLat, startLng], startZoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    const marker = L.marker([startLat, startLng], { icon: PIN_ICON, draggable: true }).addTo(map);
    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      void resolvePoint(pos.lat, pos.lng);
    });
    map.on('click', (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      void resolvePoint(e.latlng.lat, e.latlng.lng);
    });

    mapRef.current = map;
    markerRef.current = marker;

    setTimeout(() => map.invalidateSize(), 120);
    void handleUseGps();

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [open, initialLat, initialLng, handleUseGps, resolvePoint]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Selecionar localização pelo GPS"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-950/60 p-0 sm:p-4 backdrop-blur-xs"
    >
      <div className="flex h-[92vh] sm:h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-2 border-b border-stone-100 px-4 py-3.5">
          <div>
            <h2 className="text-base font-extrabold text-stone-900">Marque sua casa no mapa</h2>
            <p className="text-xs text-stone-500">
              Toque no mapa ou arraste o alfinete rosa para ajustar o ponto exato
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar mapa"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-stone-500 hover:bg-stone-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative flex-1 bg-stone-100">
          <div ref={mapElRef} className="h-full w-full z-0" />
          <button
            type="button"
            disabled={locating}
            onClick={() => void handleUseGps()}
            className="absolute right-3 top-3 z-[400] inline-flex min-h-[44px] items-center gap-1.5 rounded-2xl border border-stone-200 bg-white px-3.5 text-xs font-bold text-stone-800 shadow-md hover:border-brand hover:text-brand disabled:opacity-70"
          >
            {locating ? <Loader2 className="h-4 w-4 animate-spin text-brand" /> : <LocateFixed className="h-4 w-4 text-brand" />}
            {locating ? 'Buscando GPS...' : 'Centralizar no GPS'}
          </button>
        </div>

        <div className="border-t border-stone-100 bg-white p-4 space-y-3">
          {errorMsg && (
            <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex items-start gap-2.5 rounded-2xl border border-stone-200 bg-stone-50 p-3">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
            <div className="min-w-0 flex-1 text-xs">
              {resolving ? (
                <span className="inline-flex items-center gap-1.5 text-stone-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-brand" /> Identificando endereço do alfinete...
                </span>
              ) : resolved ? (
                <>
                  <p className="font-bold text-stone-900">{resolved.formattedAddress}</p>
                  {resolved.cep && (
                    <p className="text-[11px] text-stone-500 mt-0.5">CEP {formatCep(resolved.cep)}</p>
                  )}
                </>
              ) : (
                <span className="text-stone-500">Arraste o alfinete ou toque no mapa para escolher o local.</span>
              )}
            </div>
          </div>

          <button
            type="button"
            disabled={!resolved || resolving}
            onClick={() => {
              if (resolved) onConfirm(resolved);
            }}
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-brand px-5 text-sm font-bold text-white shadow-sm hover:bg-brand-700 disabled:opacity-60"
          >
            <Check className="h-4 w-4" />
            Confirmar este local
          </button>
        </div>
      </div>
    </div>
  );
}
