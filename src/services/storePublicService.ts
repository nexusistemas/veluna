import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type {
  Banner,
  Category,
  CouponValidationResult,
  CreateOrderPayload,
  CreateOrderResult,
  Product,
  ProductImage,
  ProductKit,
  PublicOrderStatusResult,
  PublicProductVariant,
} from '../types/database';

export interface StorefrontKitSuggestion {
  suggested_product_id: string;
  discount_percent: number;
}

export interface StorefrontProduct extends Product {
  category_name: string | null;
  images: ProductImage[];
  variants: PublicProductVariant[];
  kit_suggestions: StorefrontKitSuggestion[];
}

export interface StorefrontCatalogData {
  banners: Banner[];
  categories: Category[];
  products: StorefrontProduct[];
}

function coercePublicVariant(v: PublicProductVariant): PublicProductVariant {
  return {
    ...v,
    price: Number(v.price) || 0,
    promo_price: v.promo_price !== null && v.promo_price !== undefined ? Number(v.promo_price) : null,
    stock_qty: Number(v.stock_qty) || 0,
  };
}

export async function fetchStorefrontCatalog(): Promise<StorefrontCatalogData> {
  if (!isSupabaseConfigured) {
    return { banners: [], categories: [], products: [] };
  }

  const [bannersRes, categoriesRes, productsRes, imagesRes, variantsRes, kitsRes] =
    await Promise.all([
      supabase
        .from('banners')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
      supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true }),
      supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false }),
      supabase.from('product_images').select('*').order('sort_order', { ascending: true }),
      supabase
        .from('public_product_variants')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true }),
      supabase.from('product_kits').select('*'),
    ]);

  if (bannersRes.error) throw new Error(bannersRes.error.message);
  if (categoriesRes.error) throw new Error(categoriesRes.error.message);
  if (productsRes.error) throw new Error(productsRes.error.message);
  if (imagesRes.error) throw new Error(imagesRes.error.message);
  if (variantsRes.error) throw new Error(variantsRes.error.message);

  const banners = (bannersRes.data ?? []) as Banner[];
  const categories = (categoriesRes.data ?? []) as Category[];
  const rawProducts = (productsRes.data ?? []) as Product[];
  const rawImages = (imagesRes.data ?? []) as ProductImage[];
  const rawVariants = ((variantsRes.data ?? []) as PublicProductVariant[]).map(coercePublicVariant);
  const rawKits = (kitsRes.data ?? []) as ProductKit[];

  const categoryById = new Map(categories.map((c) => [c.id, c.name]));
  const imagesByProduct = new Map<string, ProductImage[]>();
  for (const img of rawImages) {
    const list = imagesByProduct.get(img.product_id) ?? [];
    list.push(img);
    imagesByProduct.set(img.product_id, list);
  }

  const variantsByProduct = new Map<string, PublicProductVariant[]>();
  for (const variant of rawVariants) {
    const list = variantsByProduct.get(variant.product_id) ?? [];
    list.push(variant);
    variantsByProduct.set(variant.product_id, list);
  }

  const kitsByProduct = new Map<string, StorefrontKitSuggestion[]>();
  for (const kit of rawKits) {
    const list = kitsByProduct.get(kit.main_product_id) ?? [];
    list.push({
      suggested_product_id: kit.suggested_product_id,
      discount_percent: Number(kit.discount_percent) || 0,
    });
    kitsByProduct.set(kit.main_product_id, list);
  }

  const products: StorefrontProduct[] = rawProducts
    .map((product) => {
      const variants = variantsByProduct.get(product.id) ?? [];
      const images = [...(imagesByProduct.get(product.id) ?? [])].sort(
        (a, b) => a.sort_order - b.sort_order,
      );
      return {
        ...product,
        category_name: product.category_id ? (categoryById.get(product.category_id) ?? null) : null,
        images,
        variants,
        kit_suggestions: kitsByProduct.get(product.id) ?? [],
      };
    })
    .filter((product) => product.variants.length > 0);

  return { banners, categories, products };
}

export async function validateCouponStore(
  code: string,
  subtotal: number,
): Promise<CouponValidationResult> {
  const cleanCode = code.trim().toUpperCase().replace(/\s+/g, '');
  if (!cleanCode) {
    return {
      valid: false,
      coupon_id: null,
      code: null,
      discount_type: null,
      discount_value: 0,
      discount_amount: 0,
      message: 'Digite um código de cupom.',
    };
  }

  const { data, error } = await supabase.rpc('validate_coupon_public', {
    p_code: cleanCode,
    p_subtotal: Number(subtotal) || 0,
  });

  if (error) {
    throw new Error(error.message);
  }

  const row = (Array.isArray(data) ? data[0] : data) as Partial<CouponValidationResult> | null;
  if (!row) {
    return {
      valid: false,
      coupon_id: null,
      code: null,
      discount_type: null,
      discount_value: 0,
      discount_amount: 0,
      message: 'Cupom inválido ou expirado.',
    };
  }

  return {
    valid: Boolean(row.valid),
    coupon_id: row.coupon_id ?? null,
    code: row.code ?? cleanCode,
    discount_type: row.discount_type ?? null,
    discount_value: Number(row.discount_value) || 0,
    discount_amount: Number(row.discount_amount) || 0,
    message: row.message || (row.valid ? 'Cupom aplicado!' : 'Cupom inválido.'),
  };
}

export async function submitStoreOrder(payload: CreateOrderPayload): Promise<CreateOrderResult> {
  const { data, error } = await supabase.rpc('create_order_atomic', {
    p_payload: payload,
  });

  if (error) throw new Error(error.message);
  const res = (Array.isArray(data) ? data[0] : data) as CreateOrderResult | null;
  if (!res?.order_id) {
    throw new Error('Não foi possível registrar o pedido. Tente novamente.');
  }

  return {
    ...res,
    subtotal: Number(res.subtotal) || 0,
    discount_amount: Number(res.discount_amount) || 0,
    shipping_fee: Number(res.shipping_fee) || 0,
    total: Number(res.total) || 0,
  };
}

export async function fetchOrderPublicReceipt(
  orderId: string,
  token: string,
): Promise<PublicOrderStatusResult> {
  const { data, error } = await supabase.rpc('get_order_public_status', {
    p_order_id: orderId,
    p_token: token,
  });

  if (error) throw new Error(error.message);
  const res = (Array.isArray(data) ? data[0] : data) as PublicOrderStatusResult | null;
  if (!res?.order_id) {
    throw new Error('Pedido não encontrado ou link de acompanhamento inválido.');
  }

  return {
    ...res,
    subtotal: Number(res.subtotal) || 0,
    discount_amount: Number(res.discount_amount) || 0,
    shipping_fee: Number(res.shipping_fee) || 0,
    total: Number(res.total) || 0,
    items: (res.items ?? []).map((item) => ({
      ...item,
      quantity: Number(item.quantity) || 1,
      unit_price: Number(item.unit_price) || 0,
      line_total: Number(item.line_total) || 0,
    })),
  };
}
