import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { triggerOrderEmailNotification } from './emailNotificationService';
import type {
  CreateOrderPayload,
  CreateOrderResult,
  Order,
  OrderItem,
  OrderStatus,
  Product,
  ProductImage,
  ProductVariant,
} from '../types/database';

export type AdminOrderWithItems = Order & { order_items: OrderItem[] };

export interface PosCatalogItem {
  variantId: string;
  productId: string;
  productName: string;
  brand: string | null;
  variantName: string;
  colorName: string | null;
  colorHex: string | null;
  sizeLabel: string | null;
  sku: string | null;
  eanBarcode: string | null;
  price: number;
  promoPrice: number | null;
  effectivePrice: number;
  stockQty: number;
  imageUrl: string | null;
}

function coerceOrderItem(item: OrderItem): OrderItem {
  return {
    ...item,
    unit_price: Number(item.unit_price) || 0,
    unit_cost:
      item.unit_cost !== undefined && item.unit_cost !== null
        ? Number(item.unit_cost)
        : undefined,
    quantity: Number(item.quantity) || 1,
    line_total: Number(item.line_total) || 0,
  };
}

function coerceOrder(row: AdminOrderWithItems): AdminOrderWithItems {
  return {
    ...row,
    subtotal: Number(row.subtotal) || 0,
    discount_amount: Number(row.discount_amount) || 0,
    shipping_fee: Number(row.shipping_fee) || 0,
    total: Number(row.total) || 0,
    total_cost:
      row.total_cost !== undefined && row.total_cost !== null
        ? Number(row.total_cost)
        : undefined,
    order_items: (row.order_items ?? []).map(coerceOrderItem),
  };
}

export async function listOrdersAdmin(limit = 150): Promise<AdminOrderWithItems[]> {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return ((data ?? []) as AdminOrderWithItems[]).map(coerceOrder);
}

export async function updateOrderStatusAdmin(
  orderId: string,
  status: OrderStatus,
): Promise<void> {
  if (!isSupabaseConfigured) throw new Error('Supabase não configurado.');
  const { error } = await supabase
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', orderId);

  if (error) throw new Error(error.message);
  if (status !== 'pending_payment') {
    triggerOrderEmailNotification(orderId, status === 'paid' ? 'payment_approved' : 'status_updated');
  }
}

export async function approveOrderPaymentManuallyAdmin(orderId: string): Promise<void> {
  if (!isSupabaseConfigured) throw new Error('Supabase não configurado.');
  const { error } = await supabase
    .from('orders')
    .update({
      payment_status: 'approved',
      status: 'paid',
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  if (error) throw new Error(error.message);
  triggerOrderEmailNotification(orderId, 'payment_approved');
}

export async function deleteOrderPermanentlyAdmin(orderId: string): Promise<void> {
  if (!isSupabaseConfigured) throw new Error('Supabase não configurado.');
  const { error } = await supabase.from('orders').delete().eq('id', orderId);
  if (error) throw new Error(error.message);
}

export async function createPosOrderAdmin(
  payload: CreateOrderPayload,
): Promise<CreateOrderResult> {
  if (!isSupabaseConfigured) throw new Error('Supabase não configurado.');
  const { data, error } = await supabase.rpc('create_order_atomic', {
    p_payload: payload,
  });

  if (error) throw new Error(error.message);
  const res = (Array.isArray(data) ? data[0] : data) as CreateOrderResult | null;
  if (!res?.order_id) {
    throw new Error('Não foi possível registrar a venda presencial.');
  }

  return {
    ...res,
    subtotal: Number(res.subtotal) || 0,
    discount_amount: Number(res.discount_amount) || 0,
    shipping_fee: Number(res.shipping_fee) || 0,
    total: Number(res.total) || 0,
  };
}

export async function fetchPosCatalogAdmin(): Promise<PosCatalogItem[]> {
  if (!isSupabaseConfigured) return [];

  const [productsRes, imagesRes, variantsRes] = await Promise.all([
    supabase
      .from('products')
      .select('id, name, brand, is_active')
      .eq('is_active', true)
      .order('name', { ascending: true }),
    supabase
      .from('product_images')
      .select('product_id, image_url, sort_order')
      .order('sort_order', { ascending: true }),
    supabase
      .from('product_variants')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true }),
  ]);

  if (productsRes.error) throw new Error(productsRes.error.message);
  if (imagesRes.error) throw new Error(imagesRes.error.message);
  if (variantsRes.error) throw new Error(variantsRes.error.message);

  const productsById = new Map<string, Pick<Product, 'id' | 'name' | 'brand'>>();
  for (const prod of (productsRes.data ?? []) as Array<Pick<Product, 'id' | 'name' | 'brand'>>) {
    productsById.set(prod.id, prod);
  }

  const coverByProduct = new Map<string, string>();
  for (const img of (imagesRes.data ?? []) as Array<Pick<ProductImage, 'product_id' | 'image_url'>>) {
    if (!coverByProduct.has(img.product_id) && img.image_url) {
      coverByProduct.set(img.product_id, img.image_url);
    }
  }

  const items: PosCatalogItem[] = [];
  for (const variant of (variantsRes.data ?? []) as ProductVariant[]) {
    const product = productsById.get(variant.product_id);
    if (!product) continue;

    const price = Number(variant.price) || 0;
    const promo =
      variant.promo_price !== null && variant.promo_price !== undefined
        ? Number(variant.promo_price)
        : null;
    const effectivePrice = promo !== null && promo > 0 && promo < price ? promo : price;

    items.push({
      variantId: variant.id,
      productId: product.id,
      productName: product.name,
      brand: product.brand,
      variantName: variant.name,
      colorName: variant.color_name,
      colorHex: variant.color_hex,
      sizeLabel: variant.size_label,
      sku: variant.sku,
      eanBarcode: variant.ean_barcode,
      price,
      promoPrice: promo,
      effectivePrice,
      stockQty: Number(variant.stock_qty) || 0,
      imageUrl: variant.variant_image_url || coverByProduct.get(product.id) || null,
    });
  }

  return items;
}
