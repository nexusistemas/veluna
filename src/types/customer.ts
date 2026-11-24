import type { FulfillmentType, OrderStatus, PaymentMethod, PaymentStatus } from './database';

export interface CustomerProfile {
  user_id: string;
  full_name: string;
  email: string;
  whatsapp: string;
  cpf: string;
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  created_at?: string;
  updated_at?: string;
}

export interface CustomerOrderItemSummary {
  product_id: string | null;
  variant_id: string | null;
  product_name: string;
  variant_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface CustomerOrderSummary {
  id: string;
  order_number: number;
  public_access_token: string;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  fulfillment_type: FulfillmentType;
  shipping_street: string;
  shipping_number: string;
  shipping_neighborhood: string;
  shipping_city: string;
  shipping_state: string;
  subtotal: number;
  discount_amount: number;
  shipping_fee: number;
  total: number;
  created_at: string;
  items: CustomerOrderItemSummary[];
}
