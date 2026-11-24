import { Sparkles } from 'lucide-react';

interface ProductGalleryProps {
  productName: string;
  activeImageUrl: string;
  galleryUrls: string[];
  onSelectImage: (url: string) => void;
}

export default function ProductGallery({
  productName,
  activeImageUrl,
  galleryUrls,
  onSelectImage,
}: ProductGalleryProps) {
  return (
    <div className="space-y-3">
      <div className="aspect-square overflow-hidden rounded-3xl border border-stone-200 bg-white flex items-center justify-center shadow-sm">
        {activeImageUrl ? (
          <img src={activeImageUrl} alt={productName} className="h-full w-full object-cover" />
        ) : (
          <Sparkles className="h-14 w-14 text-brand-200" />
        )}
      </div>

      {galleryUrls.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {galleryUrls.map((url) => (
            <button
              key={url}
              type="button"
              onClick={() => onSelectImage(url)}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-2xl border-2 transition ${
                activeImageUrl === url ? 'border-brand' : 'border-stone-200 opacity-80'
              }`}
            >
              <img src={url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
