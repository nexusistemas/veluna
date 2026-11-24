import { onlyDigits } from './formatters';
import { cleanCep } from './geoCep';
import type { CheckoutCustomerFields } from '../components/store/CheckoutCustomerSection';
import type { CheckoutAddressFields } from '../components/store/CheckoutShippingForm';
import type { CartItem } from '../contexts/CartContext';
import type { CustomerProfile } from '../types/customer';
import type { CreateOrderPayload, FulfillmentType, PaymentMethod } from '../types/database';

export function buildOnlineOrderPayload(params: {
  fulfillmentType: FulfillmentType;
  paymentMethod: PaymentMethod;
  customer: CheckoutCustomerFields;
  cep: string;
  address: CheckoutAddressFields;
  shippingFee: number;
  couponCode: string | null;
  items: CartItem[];
}): CreateOrderPayload {
  const { fulfillmentType, paymentMethod, customer, cep, address, shippingFee, couponCode, items } = params;
  const isDelivery = fulfillmentType === 'delivery';

  return {
    channel: 'online',
    fulfillment_type: fulfillmentType,
    payment_method: paymentMethod,
    customer_name: customer.name.trim(),
    customer_phone: onlyDigits(customer.phone),
    customer_email: customer.email.trim() || null,
    customer_cpf: onlyDigits(customer.cpf) || null,
    shipping_cep: isDelivery ? cleanCep(cep) || null : null,
    shipping_street: isDelivery ? address.street.trim() : null,
    shipping_number: isDelivery ? address.number.trim() : null,
    shipping_complement: isDelivery ? address.complement.trim() || null : null,
    shipping_neighborhood: isDelivery ? address.neighborhood.trim() : null,
    shipping_city: isDelivery ? address.city.trim() : null,
    shipping_state: isDelivery ? address.state.trim().toUpperCase() : null,
    shipping_fee: shippingFee,
    coupon_code: couponCode,
    notes: customer.notes.trim() || null,
    items: items.map((item) => ({ variant_id: item.variantId, quantity: item.quantity })),
  };
}

export function buildCheckoutCustomerProfilePayload(params: {
  userId: string;
  fallbackEmail: string;
  customer: CheckoutCustomerFields;
  cep: string;
  address: CheckoutAddressFields;
}): Omit<CustomerProfile, 'created_at' | 'updated_at'> {
  const { userId, fallbackEmail, customer, cep, address } = params;
  return {
    user_id: userId,
    full_name: customer.name.trim(),
    email: customer.email.trim() || fallbackEmail,
    whatsapp: onlyDigits(customer.phone),
    cpf: onlyDigits(customer.cpf),
    cep: cleanCep(cep),
    street: address.street.trim(),
    number: address.number.trim(),
    complement: address.complement.trim(),
    neighborhood: address.neighborhood.trim(),
    city: address.city.trim(),
    state: address.state.trim().toUpperCase(),
  };
}
