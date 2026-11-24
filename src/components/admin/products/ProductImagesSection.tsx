import { useState, type ChangeEvent } from 'react';
import { ArrowLeft, ArrowRight, Camera, ImagePlus, Loader2, Star, Trash2 } from 'lucide-react';
import { uploadCatalogImage } from '../../../lib/imageWebp';
import type { ProductImageDraft } from '../../../services/productAdminService';

interface ProductImagesSectionProps {
  images: ProductImageDraft[];
  onChange: (next: ProductImageDraft[]) => void;
}

export default function ProductImagesSection({ images, onChange }: ProductImagesSectionProps) {
  const [uploadingCount, setUploadingCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length === 0) return;

    setErrorMsg(null);
    setUploadingCount(files.length);
    const uploaded: ProductImageDraft[] = [];

    try {
      for (const file of files) {
        const image_url = await uploadCatalogImage(file, 'products', 1200);
        uploaded.push({ image_url });
      }
      if (uploaded.length > 0) {
        onChange([...images, ...uploaded]);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao otimizar ou enviar foto.');
    } finally {
      setUploadingCount(0);
    }
  };

  const makeCover = (index: number) => {
    if (index === 0) return;
    const next = [...images];
    const [picked] = next.splice(index, 1);
    next.unshift(picked);
    onChange(next);
  };

  const moveImage = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const removeImage = (index: number) => {
    onChange(images.filter((_, idx) => idx !== index));
  };

  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-4 sm:p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-stone-900">Fotos do Produto</h2>
          <p className="text-xs text-stone-500">Convertidas automaticamente para WebP leve</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-2xl bg-brand px-3.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-700">
            <Camera className="h-4 w-4" aria-hidden="true" />
            Tirar Foto
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFiles}
              disabled={uploadingCount > 0}
              className="hidden"
            />
          </label>

          <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-2xl border border-brand-200 bg-brand-50 px-3.5 text-xs font-semibold text-brand hover:bg-brand-100">
            <ImagePlus className="h-4 w-4" aria-hidden="true" />
            Galeria
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFiles}
              disabled={uploadingCount > 0}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {uploadingCount > 0 && (
        <div className="flex items-center gap-2 rounded-2xl border border-brand-200 bg-brand-50 px-3.5 py-2.5 text-xs font-semibold text-brand">
          <Loader2 className="h-4 w-4 animate-spin" />
          Otimizando foto{uploadingCount > 1 ? `s (${uploadingCount})` : ''}...
        </div>
      )}

      {errorMsg && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-800">
          {errorMsg}
        </div>
      )}

      {images.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-6 text-center text-xs text-stone-500">
          Nenhuma foto adicionada ainda. A primeira foto será exibida como capa na loja.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {images.map((img, index) => (
            <div key={`${img.image_url}-${index}`} className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-50">
              <div className="relative aspect-square bg-white">
                <img src={img.image_url} alt={`Foto ${index + 1}`} className="h-full w-full object-cover" />
                {index === 0 && (
                  <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-brand px-2.5 py-0.5 text-[10px] font-bold text-white shadow">
                    <Star className="h-3 w-3 fill-current" /> Capa
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-1 p-1.5 bg-white border-t border-stone-100">
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => moveImage(index, -1)}
                    disabled={index === 0}
                    aria-label="Mover para esquerda"
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-stone-600 hover:bg-stone-100 disabled:opacity-30"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveImage(index, 1)}
                    disabled={index === images.length - 1}
                    aria-label="Mover para direita"
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-stone-600 hover:bg-stone-100 disabled:opacity-30"
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-0.5">
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => makeCover(index)}
                      title="Definir como capa"
                      aria-label="Definir como capa"
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-amber-600 hover:bg-amber-50"
                    >
                      <Star className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    aria-label="Remover foto"
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
