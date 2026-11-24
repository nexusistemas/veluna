import { slugify } from '../lib/formatters';
import { supabase } from '../lib/supabase';
import type { Product, ProductImage, ProductKit, ProductVariant } from '../types/database';
import type {
  ProductFullAdmin,
  ProductImageDraft,
  ProductKitDraft,
  ProductSummaryOption,
  ProductVariantDraft,
  ProductWithRelations,
  SaveProductFullInput,
} from './productAdminTypes';

export type {
  ProductFullAdmin,
  ProductImageDraft,
  ProductKitDraft,
  ProductSummaryOption,
  ProductVariantDraft,
  ProductWithRelations,
  SaveProductFullInput,
};

async function resolveUniqueProductSlug(name: string, currentId?: string): Promise<string> {
  const base = slugify(name) || `produto-${Math.random().toString(36).slice(2, 6)}`;
  const { data, error } = await supabase.from('products').select('id, slug').like('slug', `${base}%`);
  if (error || !data) return base;

  const taken = new Set(data.filter((row) => row.id !== currentId).map((row) => String(row.slug)));
  if (!taken.has(base)) return base;

  for (let i = 2; i <= 50; i += 1) {
    const candidate = `${base}-${i}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}

export async function listProductsAdmin(): Promise<ProductWithRelations[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(id, name), product_images(*), product_variants(*)')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return ((data ?? []) as ProductWithRelations[]).map((product) => ({
    ...product,
    product_images: [...(product.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    product_variants: [...(product.product_variants ?? [])].sort((a, b) =>
      a.created_at.localeCompare(b.created_at),
    ),
  }));
}

export async function listActiveProductsSummary(excludeId?: string): Promise<ProductSummaryOption[]> {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, brand, product_images(image_url, sort_order)')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) throw new Error(error.message);

  return ((data ?? []) as Array<{ id: string; name: string; brand: string | null; product_images: ProductImage[] }>)
    .filter((item) => item.id !== excludeId)
    .map((item) => {
      const sorted = [...(item.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
      return { id: item.id, name: item.name, brand: item.brand, cover_url: sorted[0]?.image_url ?? null };
    });
}

export async function getProductFullAdmin(productId: string): Promise<ProductFullAdmin> {
  const [prodRes, kitsRes] = await Promise.all([
    supabase
      .from('products')
      .select('*, product_images(*), product_variants(*)')
      .eq('id', productId)
      .single(),
    supabase.from('product_kits').select('*').eq('main_product_id', productId),
  ]);

  if (prodRes.error) throw new Error(prodRes.error.message);
  if (kitsRes.error) throw new Error(kitsRes.error.message);

  const raw = prodRes.data as Product & { product_images: ProductImage[]; product_variants: ProductVariant[] };
  return {
    ...raw,
    product_images: [...(raw.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    product_variants: [...(raw.product_variants ?? [])].sort((a, b) =>
      a.created_at.localeCompare(b.created_at),
    ),
    product_kits: (kitsRes.data ?? []) as ProductKit[],
  };
}

async function syncProductImages(productId: string, images: ProductImageDraft[]): Promise<void> {
  const { data: existing } = await supabase.from('product_images').select('id').eq('product_id', productId);
  const keepIds = new Set(images.map((img) => img.id).filter(Boolean) as string[]);
  const toDelete = (existing ?? []).map((r) => String(r.id)).filter((id) => !keepIds.has(id));

  if (toDelete.length > 0) {
    const { error } = await supabase.from('product_images').delete().in('id', toDelete);
    if (error) throw new Error(error.message);
  }

  const updates = images
    .map((img, i) => (img.id ? { id: img.id, product_id: productId, image_url: img.image_url, sort_order: i } : null))
    .filter((r): r is NonNullable<typeof r> => Boolean(r));
  const inserts = images
    .map((img, i) => (!img.id ? { product_id: productId, image_url: img.image_url, sort_order: i } : null))
    .filter((r): r is NonNullable<typeof r> => Boolean(r));

  if (updates.length > 0) {
    const { error } = await supabase.from('product_images').upsert(updates, { onConflict: 'id' });
    if (error) throw new Error(error.message);
  }
  if (inserts.length > 0) {
    const { error } = await supabase.from('product_images').insert(inserts);
    if (error) throw new Error(error.message);
  }
}

async function syncProductVariants(productId: string, variants: ProductVariantDraft[]): Promise<void> {
  const { data: existing, error: fetchErr } = await supabase
    .from('product_variants')
    .select('id')
    .eq('product_id', productId);
  if (fetchErr) throw new Error(fetchErr.message);

  const keepIds = new Set(variants.map((v) => v.id).filter(Boolean) as string[]);
  const removedIds = (existing ?? []).map((r) => String(r.id)).filter((id) => !keepIds.has(id));

  const toRow = (v: ProductVariantDraft) => ({
    product_id: productId,
    name: v.name.trim(),
    color_name: v.color_name.trim() || null,
    color_hex: v.color_hex || null,
    size_label: v.size_label.trim() || null,
    ean_barcode: v.ean_barcode.trim() || null,
    sku: v.sku.trim() || null,
    cost_price: v.cost_price !== null && Number.isFinite(v.cost_price) ? v.cost_price : null,
    price: v.price,
    promo_price: v.promo_price !== null && v.promo_price > 0 ? v.promo_price : null,
    stock_qty: Math.max(0, Math.trunc(v.stock_qty || 0)),
    batch_expiry_date: v.batch_expiry_date || null,
    variant_image_url: v.variant_image_url || null,
    is_active: v.is_active,
  });

  const existingRows = variants.filter((v) => Boolean(v.id)).map((v) => ({ id: v.id as string, ...toRow(v) }));
  const newRows = variants.filter((v) => !v.id).map(toRow);

  if (existingRows.length > 0) {
    const { error } = await supabase.from('product_variants').upsert(existingRows, { onConflict: 'id' });
    if (error) throw new Error(error.message);
  }
  if (newRows.length > 0) {
    const { error } = await supabase.from('product_variants').insert(newRows);
    if (error) throw new Error(error.message);
  }
  if (removedIds.length > 0) {
    const { error } = await supabase.from('product_variants').delete().in('id', removedIds);
    if (error) throw new Error(error.message);
  }
}

async function syncProductKits(productId: string, kits: ProductKitDraft[]): Promise<void> {
  const { error: delErr } = await supabase.from('product_kits').delete().eq('main_product_id', productId);
  if (delErr) throw new Error(delErr.message);

  const uniqueKits = kits.filter(
    (kit, idx, arr) =>
      kit.suggested_product_id !== productId &&
      arr.findIndex((other) => other.suggested_product_id === kit.suggested_product_id) === idx,
  );

  if (uniqueKits.length > 0) {
    const rows = uniqueKits.map((k) => ({
      main_product_id: productId,
      suggested_product_id: k.suggested_product_id,
      discount_percent: Math.min(90, Math.max(0, Number(k.discount_percent) || 0)),
    }));
    const { error } = await supabase.from('product_kits').insert(rows);
    if (error) throw new Error(error.message);
  }
}

export async function saveProductFullAdmin(input: SaveProductFullInput): Promise<string> {
  const slug = await resolveUniqueProductSlug(input.name, input.id);
  const productPayload = {
    name: input.name.trim(),
    slug,
    category_id: input.category_id || null,
    brand: input.brand.trim() || null,
    description: input.description.trim() || null,
    variant_cta_label: input.variant_cta_label.trim() || null,
    is_featured: input.is_featured,
    is_flash_sale: input.is_flash_sale,
    is_bestseller: input.is_bestseller,
    is_active: input.is_active,
  };

  let productId = input.id;
  if (productId) {
    const { error } = await supabase.from('products').update(productPayload).eq('id', productId);
    if (error) throw new Error(error.message);
  } else {
    const { data, error } = await supabase.from('products').insert(productPayload).select('id').single();
    if (error) throw new Error(error.message);
    productId = String(data.id);
  }

  await syncProductImages(productId, input.images);
  await syncProductVariants(productId, input.variants);
  await syncProductKits(productId, input.kits);
  return productId;
}

export async function toggleProductActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.from('products').update({ is_active: isActive }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteProductAdmin(id: string): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
