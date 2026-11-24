import { slugify } from '../lib/formatters';
import { supabase } from '../lib/supabase';
import type { Banner, Category, Coupon, DiscountType } from '../types/database';

export interface SaveCategoryInput {
  id?: string;
  name: string;
  slug?: string;
  image_url?: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface SaveBannerInput {
  id?: string;
  title: string;
  subtitle?: string | null;
  image_url: string;
  mobile_image_url?: string | null;
  link_url?: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface SaveCouponInput {
  id?: string;
  code: string;
  discount_type: DiscountType;
  discount_value: number;
  min_order_value: number;
  max_uses?: number | null;
  expires_at?: string | null;
  is_active: boolean;
}

async function resolveUniqueCategorySlug(baseNameOrSlug: string, currentId?: string): Promise<string> {
  const base = slugify(baseNameOrSlug) || `categoria-${Math.random().toString(36).slice(2, 6)}`;
  const { data, error } = await supabase
    .from('categories')
    .select('id, slug')
    .like('slug', `${base}%`);

  if (error || !data) return base;

  const taken = new Set(
    data.filter((row) => row.id !== currentId).map((row) => String(row.slug)),
  );
  if (!taken.has(base)) return base;

  for (let i = 2; i <= 50; i += 1) {
    const candidate = `${base}-${i}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}

export async function listCategoriesAdmin(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as Category[];
}

export async function saveCategory(input: SaveCategoryInput): Promise<Category> {
  const slug = await resolveUniqueCategorySlug(input.slug?.trim() || input.name, input.id);
  const payload = {
    name: input.name.trim(),
    slug,
    image_url: input.image_url || null,
    sort_order: Number.isFinite(input.sort_order) ? input.sort_order : 0,
    is_active: input.is_active,
  };

  if (input.id) {
    const { data, error } = await supabase
      .from('categories')
      .update(payload)
      .eq('id', input.id)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return data as Category;
  }

  const { data, error } = await supabase
    .from('categories')
    .insert(payload)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as Category;
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function listBannersAdmin(): Promise<Banner[]> {
  const { data, error } = await supabase
    .from('banners')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Banner[];
}

export async function saveBanner(input: SaveBannerInput): Promise<Banner> {
  const payload = {
    title: input.title.trim(),
    subtitle: input.subtitle?.trim() || null,
    image_url: input.image_url.trim(),
    mobile_image_url: input.mobile_image_url?.trim() || null,
    link_url: input.link_url?.trim() || null,
    sort_order: Number.isFinite(input.sort_order) ? input.sort_order : 0,
    is_active: input.is_active,
  };

  if (input.id) {
    const { data, error } = await supabase
      .from('banners')
      .update(payload)
      .eq('id', input.id)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return data as Banner;
  }

  const { data, error } = await supabase
    .from('banners')
    .insert(payload)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as Banner;
}

export async function deleteBanner(id: string): Promise<void> {
  const { error } = await supabase.from('banners').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function listCouponsAdmin(): Promise<Coupon[]> {
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Coupon[];
}

export async function saveCoupon(input: SaveCouponInput): Promise<Coupon> {
  const cleanCode = input.code.trim().toUpperCase().replace(/\s+/g, '');
  if (!cleanCode) throw new Error('Informe um código para o cupom.');

  const payload = {
    code: cleanCode,
    discount_type: input.discount_type,
    discount_value: input.discount_type === 'free_shipping' ? 0 : Math.max(0, input.discount_value),
    min_order_value: Math.max(0, input.min_order_value || 0),
    max_uses: input.max_uses && input.max_uses > 0 ? input.max_uses : null,
    expires_at: input.expires_at?.trim() || null,
    is_active: input.is_active,
  };

  if (input.id) {
    const { data, error } = await supabase
      .from('coupons')
      .update(payload)
      .eq('id', input.id)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return data as Coupon;
  }

  const { data, error } = await supabase
    .from('coupons')
    .insert(payload)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as Coupon;
}

export async function deleteCoupon(id: string): Promise<void> {
  const { error } = await supabase.from('coupons').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
