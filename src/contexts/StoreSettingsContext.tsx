import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { StoreSettings } from '../types/database';

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  id: 1,
  store_name: 'Veluna Cosméticos',
  tagline: 'Beleza, cuidado e autoestima no seu tempo',
  logo_url: null,
  primary_color: '#db2777',
  whatsapp_number: null,
  instagram_handle: null,
  opening_hours: null,
  is_open: true,
  pickup_enabled: true,
  pickup_address: null,
  pickup_instructions: null,
  delivery_enabled: true,
  delivery_mode: 'both',
  store_cep: null,
  store_lat: null,
  store_lng: null,
  max_radius_km: 10,
  radius_base_fee: 5,
  radius_km_fee: 1.5,
  free_shipping_min: null,
  pix_key: null,
  pix_receiver_name: null,
  mp_public_key: null,
  whatsapp_auto_enabled: false,
  google_auth_enabled: true,
  apple_auth_enabled: false,
  updated_at: '',
};

interface StoreSettingsContextValue {
  settings: StoreSettings;
  loadingSettings: boolean;
  refreshSettings: () => Promise<void>;
}

const StoreSettingsContext = createContext<StoreSettingsContextValue | undefined>(undefined);

function coerceSettingsRow(raw: Partial<StoreSettings>): StoreSettings {
  const merged = { ...DEFAULT_STORE_SETTINGS, ...raw };
  return {
    ...merged,
    store_lat: merged.store_lat !== null && merged.store_lat !== undefined ? Number(merged.store_lat) : null,
    store_lng: merged.store_lng !== null && merged.store_lng !== undefined ? Number(merged.store_lng) : null,
    max_radius_km: Number(merged.max_radius_km ?? 10) || 0,
    radius_base_fee: Number(merged.radius_base_fee ?? 0) || 0,
    radius_km_fee: Number(merged.radius_km_fee ?? 0) || 0,
    free_shipping_min:
      merged.free_shipping_min !== null && merged.free_shipping_min !== undefined
        ? Number(merged.free_shipping_min)
        : null,
    whatsapp_auto_enabled: Boolean(merged.whatsapp_auto_enabled),
    google_auth_enabled: merged.google_auth_enabled ?? true,
    apple_auth_enabled: Boolean(merged.apple_auth_enabled),
  };
}

export function StoreSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);
  const [loadingSettings, setLoadingSettings] = useState<boolean>(isSupabaseConfigured);

  const refreshSettings = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setSettings(DEFAULT_STORE_SETTINGS);
      setLoadingSettings(false);
      return;
    }

    setLoadingSettings(true);
    try {
      const { data, error } = await supabase
        .from('store_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (!error && data) {
        setSettings(coerceSettingsRow(data as Partial<StoreSettings>));
      }
    } catch {
      // Mantém fallback seguro caso a rede esteja offline
    } finally {
      setLoadingSettings(false);
    }
  }, []);

  useEffect(() => {
    void refreshSettings();
  }, [refreshSettings]);

  return (
    <StoreSettingsContext.Provider value={{ settings, loadingSettings, refreshSettings }}>
      {children}
    </StoreSettingsContext.Provider>
  );
}

export function useStoreSettings(): StoreSettingsContextValue {
  const ctx = useContext(StoreSettingsContext);
  if (!ctx) {
    throw new Error('useStoreSettings deve ser utilizado dentro de StoreSettingsProvider.');
  }
  return ctx;
}
