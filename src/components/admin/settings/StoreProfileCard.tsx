import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { CheckCircle2, Loader2, Save, Store, Trash2, Upload } from 'lucide-react';
import { formatPhoneBR, onlyDigits } from '../../../lib/formatters';
import { uploadCatalogImage } from '../../../lib/imageWebp';
import { saveGeneralStoreSettings } from '../../../services/settingsAdminService';
import type { StoreSettings } from '../../../types/database';

interface StoreProfileCardProps {
  settings: StoreSettings;
  onSaved: () => Promise<void>;
}

export default function StoreProfileCard({ settings, onSaved }: StoreProfileCardProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [storeName, setStoreName] = useState(settings.store_name);
  const [logoUrl, setLogoUrl] = useState(settings.logo_url ?? '');
  const [whatsapp, setWhatsapp] = useState(formatPhoneBR(settings.whatsapp_number ?? ''));
  const [instagram, setInstagram] = useState(settings.instagram_handle ?? '');
  const [primaryColor, setPrimaryColor] = useState(settings.primary_color || '#db2777');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    setStoreName(settings.store_name);
    setLogoUrl(settings.logo_url ?? '');
    setWhatsapp(formatPhoneBR(settings.whatsapp_number ?? ''));
    setInstagram(settings.instagram_handle ?? '');
    setPrimaryColor(settings.primary_color || '#db2777');
  }, [settings]);

  const handleLogoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    setFeedback(null);
    try {
      const publicUrl = await uploadCatalogImage(file, 'branding', 600);
      setLogoUrl(publicUrl);
      setFeedback({ ok: true, text: 'Logo convertida em WebP! Clique em salvar para aplicar.' });
    } catch (err) {
      setFeedback({
        ok: false,
        text: err instanceof Error ? err.message : 'Erro ao enviar logo.',
      });
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      await saveGeneralStoreSettings({
        store_name: storeName,
        logo_url: logoUrl || null,
        whatsapp_number: onlyDigits(whatsapp) || null,
        instagram_handle: instagram.replace(/^@+/, '').trim() || null,
        primary_color: primaryColor || '#db2777',
      });
      await onSaved();
      setFeedback({ ok: true, text: 'Perfil da loja salvo com sucesso!' });
    } catch (err) {
      setFeedback({
        ok: false,
        text: err instanceof Error ? err.message : 'Não foi possível salvar o perfil da loja.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm space-y-4"
    >
      <div className="flex items-center gap-2.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand">
          <Store className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-stone-900">Identidade da Loja</h2>
          <p className="text-xs text-stone-500">Nome, logo em WebP, WhatsApp oficial e redes</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl border border-stone-100 bg-stone-50 p-3.5">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-stone-200 bg-white">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo da loja" className="h-full w-full object-contain p-1" />
          ) : (
            <Store className="h-7 w-7 text-stone-300" />
          )}
        </div>
        <div className="flex-1 space-y-2">
          <p className="text-xs font-semibold text-stone-700">Logo da Loja (WebP otimizado)</p>
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => void handleLogoUpload(e)}
              className="hidden"
            />
            <button
              type="button"
              disabled={uploadingLogo}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-stone-200 bg-white px-3.5 text-xs font-semibold text-stone-700 hover:border-brand hover:text-brand disabled:opacity-60"
            >
              {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploadingLogo ? 'Enviando...' : 'Enviar Logo'}
            </button>
            {logoUrl && (
              <button
                type="button"
                onClick={() => setLogoUrl('')}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-100"
              >
                <Trash2 className="h-4 w-4" /> Remover
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block space-y-1 sm:col-span-2">
          <span className="text-xs font-semibold text-stone-700">Nome da Loja</span>
          <input
            type="text"
            required
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            placeholder="Veluna Cosméticos"
            className="h-11 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 text-sm focus:border-brand focus:bg-white focus:outline-none"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-semibold text-stone-700">WhatsApp da Loja (com DDD)</span>
          <input
            type="tel"
            value={whatsapp}
            onChange={(e) => setWhatsapp(formatPhoneBR(e.target.value))}
            placeholder="(11) 99999-9999"
            className="h-11 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 text-sm focus:border-brand focus:bg-white focus:outline-none"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-semibold text-stone-700">Instagram</span>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-stone-400">
              @
            </span>
            <input
              type="text"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value.replace(/^@+/, ''))}
              placeholder="velunacosmeticos"
              className="h-11 w-full rounded-xl border border-stone-200 bg-stone-50 pl-7 pr-3 text-sm focus:border-brand focus:bg-white focus:outline-none"
            />
          </div>
        </label>

        <label className="block space-y-1 sm:col-span-2">
          <span className="text-xs font-semibold text-stone-700">Cor Principal da Marca</span>
          <div className="flex items-center gap-2.5">
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="h-11 w-14 cursor-pointer rounded-xl border border-stone-200 bg-white p-1"
            />
            <input
              type="text"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              placeholder="#db2777"
              className="h-11 flex-1 rounded-xl border border-stone-200 bg-stone-50 px-3 font-mono text-sm uppercase focus:border-brand focus:bg-white focus:outline-none"
            />
          </div>
        </label>
      </div>

      {feedback && (
        <p
          className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold ${
            feedback.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
          }`}
        >
          {feedback.ok && <CheckCircle2 className="h-4 w-4 shrink-0" />}
          <span>{feedback.text}</span>
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="inline-flex min-h-[48px] w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-brand px-5 text-sm font-bold text-white shadow-sm hover:bg-brand-700 disabled:opacity-60"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {saving ? 'Salvando...' : 'Salvar Identidade da Loja'}
      </button>
    </form>
  );
}
