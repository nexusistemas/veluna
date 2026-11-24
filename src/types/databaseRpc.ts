import type {
  DiscountType,
  FulfillmentType,
  OrderChannel,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from './database';

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
  customer_phone?: string | null;
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
  manual_discount?: number;
  notes?: string | null;
  items: Array<{ variant_id: string; quantity: number }>;
}

export interface CreateOrderResult {
  order_id: string;
  order_number: string | number;
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
  order_number: string | number;
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
  items: Array<{
    product_name: string;
    variant_name: string | null;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
}
