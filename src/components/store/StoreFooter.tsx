import { Link } from 'react-router-dom';
import { Instagram, Lock, MessageCircle } from 'lucide-react';
import { useStoreSettings } from '../../contexts/StoreSettingsContext';
import { onlyDigits } from '../../lib/formatters';

export default function StoreFooter() {
  const { settings } = useStoreSettings();
  const whatsappDigits = onlyDigits(settings.whatsapp_number ?? '');
  const instagramClean = (settings.instagram_handle ?? '').replace(/^@/, '').trim();

  return (
    <footer className="border-t border-stone-200 bg-white px-4 py-6 text-center text-xs text-stone-500 space-y-2">
      <p className="font-bold text-stone-800">{settings.store_name}</p>
      {settings.pickup_address && <p>{settings.pickup_address}</p>}
      <div className="flex items-center justify-center gap-3 pt-1">
        {whatsappDigits && (
          <a
            href={`https://wa.me/${whatsappDigits.startsWith('55') ? whatsappDigits : `55${whatsappDigits}`}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-emerald-700 font-semibold"
          >
            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
          </a>
        )}
        {instagramClean && (
          <a
            href={`https://instagram.com/${instagramClean}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-brand font-semibold"
          >
            <Instagram className="h-3.5 w-3.5" /> @{instagramClean}
          </a>
        )}
        <Link
          to="/painel"
          aria-label="Painel Administrativo"
          title="Painel Administrativo"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-stone-400 hover:bg-brand-50 hover:text-brand"
        >
          <Lock className="h-3.5 w-3.5" />
        </Link>
      </div>
    </footer>
  );
}
