import { isSupabaseConfigured, supabase } from './supabase';

export type CatalogImageFolder = 'products' | 'variants' | 'banners' | 'categories' | 'branding';

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Não foi possível ler a imagem selecionada.'));
    };
    img.src = objectUrl;
  });
}

export async function compressImageToWebp(
  file: File,
  maxDimension = 1200,
  quality = 0.82,
): Promise<Blob> {
  const img = await loadImageFromFile(file);
  const { naturalWidth: origW, naturalHeight: origH } = img;

  let targetW = origW;
  let targetH = origH;

  if (origW > maxDimension || origH > maxDimension) {
    const scale = maxDimension / Math.max(origW, origH);
    targetW = Math.max(1, Math.round(origW * scale));
    targetH = Math.max(1, Math.round(origH * scale));
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Navegador sem suporte a canvas para compressão de imagem.');
  }

  ctx.drawImage(img, 0, 0, targetW, targetH);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Falha ao converter a imagem para WebP.'));
          return;
        }
        resolve(blob);
      },
      'image/webp',
      quality,
    );
  });
}

export async function uploadCatalogImage(
  file: File,
  folder: CatalogImageFolder,
  maxDimension = 1200,
): Promise<string> {
  if (!isSupabaseConfigured) {
    throw new Error('Configure o Supabase (.env) antes de enviar imagens.');
  }

  const webpBlob = await compressImageToWebp(file, maxDimension, 0.82);
  const randomPart = Math.random().toString(36).slice(2, 8);
  const filePath = `${folder}/${Date.now()}-${randomPart}.webp`;

  const { error } = await supabase.storage.from('catalog').upload(filePath, webpBlob, {
    contentType: 'image/webp',
    upsert: false,
  });

  if (error) {
    throw new Error(`Erro no upload da imagem: ${error.message}`);
  }

  const { data } = supabase.storage.from('catalog').getPublicUrl(filePath);
  return data.publicUrl;
}
