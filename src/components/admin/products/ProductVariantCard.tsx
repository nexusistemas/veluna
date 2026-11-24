import { useState, type ChangeEvent } from 'react';
import { AlertTriangle, ImagePlus, Loader2, Trash2, X } from 'lucide-react';
import { daysUntilDate, formatBRL } from '../../../lib/formatters';
import { uploadCatalogImage } from '../../../lib/imageWebp';
import type { ProductVariantDraft } from '../../../services/productAdminService';

interface ProductVariantCardProps {
  variant: ProductVariantDraft;
  index: number;
  canRemove: boolean;
  onUpdate: (patch: Partial<ProductVariantDraft>) => void;
  onRemove: () => void;
}

const INPUT_CLS =
  'mt-1 h-11 w-full rounded-xl border border-stone-200 bg-white px-2.5 text-sm focus:border-brand focus:outline-none';

export default function ProductVariantCard({
  variant,
  index,
  canRemove,
  onUpdate,
  onRemove,
}: ProductVariantCardProps) {
  const [uploading, setUploading] = useState(false);

  const effectivePrice =
    variant.promo_price !== null && variant.promo_price > 0 ? variant.promo_price : variant.price;
  const hasCost = variant.cost_price !== null && Number.isFinite(variant.cost_price);
  const grossProfit = hasCost ? effectivePrice - (variant.cost_price as number) : null;
  const marginPct =
    grossProfit !== null && effectivePrice > 0 ? (grossProfit / effectivePrice) * 100 : null;
  const expiryDays = daysUntilDate(variant.batch_expiry_date);

  const handlePhotoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadCatalogImage(file, 'variants', 900);
      onUpdate({ variant_image_url: url });
    } finally {
      setUploading(false);
    }
  };

  return (
    <article className="rounded-2xl border border-stone-200 bg-stone-50/70 p-3.5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {variant.color_hex && (
            <span
              className="h-5 w-5 shrink-0 rounded-full border border-stone-300 shadow-inner"
              style={{ backgroundColor: variant.color_hex }}
            />
          )}
          <span className="text-xs font-bold uppercase tracking-wider text-brand truncate">
            Variante #{index + 1} {variant.name ? `• ${variant.name}` : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-700 cursor-pointer">
            <input
              type="checkbox"
              checked={variant.is_active}
              onChange={(e) => onUpdate({ is_active: e.target.checked })}
              className="h-4 w-4 rounded accent-brand"
            />
            Ativa
          </label>
          {canRemove && (
            <button
              type="button"
              onClick={onRemove}
              aria-label="Remover variante"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-rose-600 hover:bg-rose-100"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <div>
          <label className="block text-[11px] font-semibold text-stone-600">Nome da Variante *</label>
          <input type="text" required value={variant.name} onChange={(e) => onUpdate({ name: e.target.value })} placeholder="Ex: Padrão, Tom 01 - Bege Claro" className={INPUT_CLS} />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-stone-600">Tamanho / Volume</label>
          <input type="text" value={variant.size_label} onChange={(e) => onUpdate({ size_label: e.target.value })} placeholder="Ex: 30ml, 15g, Kit" className={INPUT_CLS} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <div>
          <label className="block text-[11px] font-semibold text-stone-600">Cor / Tom (opcional)</label>
          <div className="mt-1 flex items-center gap-1.5">
            <input type="color" value={variant.color_hex ?? '#db2777'} onChange={(e) => onUpdate({ color_hex: e.target.value })} aria-label="Escolher cor do tom" className="h-11 w-11 shrink-0 cursor-pointer rounded-xl border border-stone-200 bg-white p-1" />
            <input type="text" value={variant.color_name} onChange={(e) => onUpdate({ color_name: e.target.value })} placeholder="Nome do tom" className="h-11 min-w-0 flex-1 rounded-xl border border-stone-200 bg-white px-2.5 text-sm focus:border-brand focus:outline-none" />
            {variant.color_hex && (
              <button type="button" onClick={() => onUpdate({ color_hex: null, color_name: '' })} title="Limpar cor" aria-label="Limpar cor" className="flex h-11 w-9 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-500 hover:text-rose-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-stone-600">Código de Barras (EAN)</label>
          <input type="text" inputMode="numeric" value={variant.ean_barcode} onChange={(e) => onUpdate({ ean_barcode: e.target.value })} placeholder="789..." className={INPUT_CLS} />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-stone-600">SKU (opcional)</label>
          <input type="text" value={variant.sku} onChange={(e) => onUpdate({ sku: e.target.value })} placeholder="Ex: BAT-01" className={INPUT_CLS} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-[11px] font-semibold text-stone-600">Custo (R$)</label>
          <input type="number" step="0.01" min="0" value={variant.cost_price ?? ''} onChange={(e) => onUpdate({ cost_price: e.target.value === '' ? null : Number(e.target.value) })} placeholder="0,00" className={INPUT_CLS} />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-stone-600">Venda (R$) *</label>
          <input type="number" step="0.01" min="0.01" required value={variant.price || ''} onChange={(e) => onUpdate({ price: Number(e.target.value) || 0 })} placeholder="0,00" className={`${INPUT_CLS} font-semibold`} />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-stone-600">Promo (R$)</label>
          <input type="number" step="0.01" min="0" value={variant.promo_price ?? ''} onChange={(e) => onUpdate({ promo_price: e.target.value === '' ? null : Number(e.target.value) })} placeholder="Opcional" className={`${INPUT_CLS} text-brand font-semibold`} />
        </div>
      </div>

      {grossProfit !== null && (
        <div className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold ${grossProfit >= 0 ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
          <span>Lucro Bruto estimado</span>
          <span>{formatBRL(grossProfit)} ({marginPct !== null ? `${marginPct.toFixed(1)}%` : '0%'})</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <div>
          <label className="block text-[11px] font-semibold text-stone-600">Estoque (unid.)</label>
          <input type="number" min="0" value={variant.stock_qty} onChange={(e) => onUpdate({ stock_qty: Math.max(0, Number(e.target.value) || 0) })} className={INPUT_CLS} />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-stone-600">Validade do Lote</label>
          <input type="date" value={variant.batch_expiry_date ?? ''} onChange={(e) => onUpdate({ batch_expiry_date: e.target.value || null })} className={INPUT_CLS} />
          {expiryDays !== null && expiryDays <= 60 && (
            <p className={`mt-1 inline-flex items-center gap-1 text-[11px] font-semibold ${expiryDays <= 0 ? 'text-rose-700' : 'text-amber-700'}`}>
              <AlertTriangle className="h-3.5 w-3.5" />
              {expiryDays <= 0 ? 'Lote vencido!' : `Vence em ${expiryDays} dia(s)`}
            </p>
          )}
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-stone-600">Foto do Tom (WebP)</label>
          <div className="mt-1 flex items-center gap-2">
            {variant.variant_image_url && <img src={variant.variant_image_url} alt={variant.name} className="h-11 w-11 shrink-0 rounded-xl border border-stone-200 object-cover" />}
            <label className="flex h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white px-2.5 text-xs font-semibold text-stone-700 hover:border-brand">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin text-brand" /> : <ImagePlus className="h-4 w-4 text-brand" />}
              <span>{uploading ? 'Enviando...' : 'Foto'}</span>
              <input type="file" accept="image/*" onChange={handlePhotoUpload} disabled={uploading} className="hidden" />
            </label>
            {variant.variant_image_url && (
              <button type="button" onClick={() => onUpdate({ variant_image_url: null })} aria-label="Remover foto do tom" className="flex h-11 w-9 items-center justify-center rounded-xl border border-stone-200 bg-white text-rose-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
