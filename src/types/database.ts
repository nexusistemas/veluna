export type DeliveryMode = 'zones' | 'radius' | 'both';
export type DiscountType = 'percentage' | 'fixed' | 'free_shipping';
export type OrderChannel = 'online' | 'pdv';
export type OrderStatus = 'pending' | 'pending_payment' | 'paid' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled';
export type FulfillmentType = 'delivery' | 'pickup';
export type PaymentMethod = 'pix_mp' | 'card_mp' | 'whatsapp_combine' | 'pix' | 'credit_card' | 'debit_card' | 'cash';
export type PaymentStatus = 'pending' | 'approved' | 'rejected' | 'refunded' | 'cancelled';

export interface AdminUser {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: 'owner' | 'staff';
  is_active: boolean;
  created_at: string;
}
export interface StoreSettings {
  id: number;
  store_name: string;
  tagline: string | null;
  logo_url: string | null;
  primary_color: string;
  whatsapp_number: string | null;
  instagram_handle: string | null;
  opening_hours: string | null;
  is_open: boolean;
  pickup_enabled: boolean;
  pickup_address: string | null;
  pickup_instructions: string | null;
  delivery_enabled: boolean;
  delivery_mode: DeliveryMode;
  store_cep: string | null;
  store_lat: number | null;
  store_lng: number | null;
  max_radius_km: number;
  radius_base_fee: number;
  radius_km_fee: number;
  free_shipping_min: number | null;
  pix_key: string | null;
  pix_receiver_name: string | null;
  mp_public_key: string | null;
  whatsapp_auto_enabled: boolean;
  updated_at: string;
}
export interface PrivateSecrets {
  id: number;
  mp_access_token: string | null;
  mp_webhook_secret: string | null;
  mp_point_device_id: string | null;
  whatsapp_webhook_url: string | null;
  whatsapp_webhook_token: string | null;
  updated_at: string;
}
export interface Category {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}
export interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  mobile_image_url: string | null;
  link_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}
export interface Product {
  id: string;
  category_id: string | null;
  name: string;
  slug: string;
  brand: string | null;
  description: string | null;
  is_featured: boolean;
  is_flash_sale: boolean;
  is_bestseller: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  sort_order: number;
  created_at: string;
}
export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  color_name: string | null;
  color_hex: string | null;
  size_label: string | null;
  ean_barcode: string | null;
  sku: string | null;
  cost_price: number | null;
  price: number;
  promo_price: number | null;
  stock_qty: number;
  batch_expiry_date: string | null;
  variant_image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
export interface PublicProductVariant extends Omit<ProductVariant, 'cost_price' | 'batch_expiry_date'> {}
export interface ProductKit {
  id: string;
  main_product_id: string;
  suggested_product_id: string;
  discount_percent: number;
  created_at: string;
}
export interface Coupon {
  id: string;
  code: string;
  discount_type: DiscountType;
  discount_value: number;
  min_order_value: number;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}
export interface DeliveryZone {
  id: string;
  city: string;
  state: string;
  neighborhood: string | null;
  delivery_fee: number;
  estimated_time: string | null;
  is_active: boolean;
  created_at: string;
}
export interface Order {
  id: string;
  order_number: string;
  public_access_token: string;
  channel: OrderChannel;
  status: OrderStatus;
  fulfillment_type: FulfillmentType;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  mp_payment_id: string | null;
  mp_pix_qr_base64: string | null;
  mp_pix_qr_code: string | null;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  customer_cpf: string | null;
  shipping_address: string | null;
  coupon_code: string | null;
  subtotal: number;
  discount_amount: number;
  shipping_fee: number;
  total: number;
  notes: string | null;
  whatsapp_notified?: boolean;
  created_at: string;
  updated_at: string;
}
export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  variant_id: string | null;
  product_name: string;
  variant_name: string | null;
  sku: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
  created_at: string;
}
export interface CouponValidationResult {
  valid: boolean;
  coupon_id: string | null;
  code: string | null;
  discount_type: DiscountType | null;
  discount_value: number;
  discount_amount: number;
  message: string;
}
export interface CreateOrderPayload {
  channel: OrderChannel;
  fulfillment_type: FulfillmentType;
  payment_method: PaymentMethod;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  customer_cpf?: string | null;
  shipping_cep?: string | null;
  shipping_street?: string | null;
  shipping_number?: string | null;
  shipping_complement?: string | null;
  shipping_neighborhood?: string | null;
  shipping_city?: string | null;
  shipping_state?: string | null;
  shipping_fee: number;
  coupon_code?: string | null;
  notes?: string | null;
  items: Array<{ variant_id: string; quantity: number }>;
}
export interface CreateOrderResult {
  order_id: string;
  order_number: string;
  public_access_token: string;
  subtotal: number;
  discount_amount: number;
  shipping_fee: number;
  total: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
}
export interface PublicOrderStatusResult {
  order_id: string;
  order_number: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod;
  fulfillment_type: FulfillmentType;
  customer_name: string;
  customer_phone: string | null;
  shipping_address: string | null;
  subtotal: number;
  discount_amount: number;
  shipping_fee: number;
  total: number;
  mp_pix_qr_base64: string | null;
  mp_pix_qr_code: string | null;
  created_at: string;
  updated_at: string;
  items: Array<{ product_name: string; variant_name: string | null; quantity: number; unit_price: number; line_total: number }>;
}
