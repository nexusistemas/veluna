import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, ShoppingBag } from 'lucide-react';
import CheckoutCustomerSection, {
  type CheckoutCustomerFields,
} from '../../components/store/CheckoutCustomerSection';
import CheckoutShippingForm, {
  type CheckoutAddressFields,
} from '../../components/store/CheckoutShippingForm';
import CheckoutSummaryCard from '../../components/store/CheckoutSummaryCard';
import StoreHeader from '../../components/store/StoreHeader';
import { useCart } from '../../contexts/CartContext';
import { useStoreSettings } from '../../contexts/StoreSettingsContext';
import { onlyDigits } from '../../lib/formatters';
import { cleanCep } from '../../lib/geoCep';
import { listActiveDeliveryZonesPublic } from '../../services/logisticsAdminService';
import {
  calculateShippingQuote,
  type ShippingCalculationResult,
} from '../../services/shippingService';
import { submitStoreOrder } from '../../services/storePublicService';
import type { DeliveryZone, FulfillmentType, PaymentMethod } from '../../types/database';

const EMPTY_CUSTOMER: CheckoutCustomerFields = { name: '', phone: '', email: '', cpf: '', notes: '' };
const EMPTY_ADDR: CheckoutAddressFields = {
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
};

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { settings } = useStoreSettings();
  const {
    items,
    subtotal,
    discountAmount,
    appliedCoupon,
    applyCouponCode,
    removeCoupon,
    isFreeShippingCoupon,
    clearCart,
  } = useCart();

  const [customer, setCustomer] = useState<CheckoutCustomerFields>(EMPTY_CUSTOMER);
  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType>(
    settings.delivery_enabled ? 'delivery' : 'pickup',
  );
  const [cep, setCep] = useState('');
  const [address, setAddress] = useState<CheckoutAddressFields>(EMPTY_ADDR);
  const [activeZones, setActiveZones] = useState<DeliveryZone[]>([]);
  const [shippingResult, setShippingResult] = useState<ShippingCalculationResult | null>(null);
  const [calculatingCep, setCalculatingCep] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);

  const [couponInput, setCouponInput] = useState('');
  const [couponMsg, setCouponMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix_mp');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    listActiveDeliveryZonesPublic().then(setActiveZones).catch(() => {});
  }, []);

  const handleCalculateCep = async (overrideCep?: string) => {
    const targetCep = overrideCep ?? cep;
    setShippingError(null);
    setCalculatingCep(true);
    try {
      const quote = await calculateShippingQuote({
        rawCep: targetCep,
        subtotal,
        settings,
        activeZones,
      });
      setShippingResult(quote);
      if (quote.address) {
        setAddress((prev) => ({
          ...prev,
          street: quote.address?.street || prev.street,
          neighborhood: quote.address?.neighborhood || prev.neighborhood,
          city: quote.address?.city || prev.city,
          state: quote.address?.state || prev.state,
        }));
      }
    } catch (err) {
      setShippingResult(null);
      setShippingError(err instanceof Error ? err.message : 'Erro ao consultar CEP.');
    } finally {
      setCalculatingCep(false);
    }
  };

  const deliveryOption = shippingResult?.options.find((o) => o.fulfillmentType === 'delivery');
  const effectiveShippingFee =
    fulfillmentType === 'pickup'
      ? 0
      : deliveryOption
        ? deliveryOption.isFreeShipping || isFreeShippingCoupon
          ? 0
          : deliveryOption.fee
        : 0;
  const grandTotal = Math.max(0, subtotal - discountAmount + effectiveShippingFee);

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    const res = await applyCouponCode(couponInput);
    setCouponMsg({ ok: res.ok, text: res.message });
    if (res.ok) setCouponInput('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);

    if (!customer.name.trim() || onlyDigits(customer.phone).length < 10) {
      setSubmitError('Informe seu nome completo e um WhatsApp válido com DDD.');
      return;
    }

    if (fulfillmentType === 'delivery') {
      if (cleanCep(cep).length !== 8 || !deliveryOption) {
        setSubmitError('Calcule um CEP atendido para entrega ou escolha Retirar na Loja.');
        return;
      }
      if (!address.street.trim() || !address.number.trim() || !address.neighborhood.trim()) {
        setSubmitError('Preencha rua, número e bairro para a entrega.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const created = await submitStoreOrder({
        channel: 'online',
        fulfillment_type: fulfillmentType,
        payment_method: paymentMethod,
        customer_name: customer.name.trim(),
        customer_phone: onlyDigits(customer.phone),
        customer_email: customer.email.trim() || null,
        customer_cpf: onlyDigits(customer.cpf) || null,
        shipping_cep: fulfillmentType === 'delivery' ? cleanCep(cep) : null,
        shipping_street: fulfillmentType === 'delivery' ? address.street.trim() : null,
        shipping_number: fulfillmentType === 'delivery' ? address.number.trim() : null,
        shipping_complement: fulfillmentType === 'delivery' ? address.complement.trim() || null : null,
        shipping_neighborhood: fulfillmentType === 'delivery' ? address.neighborhood.trim() : null,
        shipping_city: fulfillmentType === 'delivery' ? address.city.trim() : null,
        shipping_state: fulfillmentType === 'delivery' ? address.state.trim().toUpperCase() : null,
        shipping_fee: effectiveShippingFee,
        coupon_code: appliedCoupon?.code ?? null,
        notes: customer.notes.trim() || null,
        items: items.map((item) => ({ variant_id: item.variantId, quantity: item.quantity })),
      });
      clearCart();
      navigate(`/pedido/${created.order_id}?token=${encodeURIComponent(created.public_access_token)}`, {
        replace: true,
      });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Não foi possível finalizar o pedido.');
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-stone-50">
        <StoreHeader hideSearch />
        <main className="mx-auto max-w-md px-4 py-16 text-center space-y-4">
          <ShoppingBag className="mx-auto h-12 w-12 text-brand-300" />
          <h1 className="text-xl font-bold text-stone-900">Sua sacola está vazia</h1>
          <p className="text-sm text-stone-500">Adicione seus cosméticos favoritos antes de finalizar o pedido.</p>
          <Link to="/" className="inline-flex min-h-[48px] items-center gap-2 rounded-2xl bg-brand px-6 text-sm font-bold text-white">
            <ArrowLeft className="h-4 w-4" /> Voltar para a loja
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <StoreHeader hideSearch />
      <main className="mx-auto max-w-3xl px-4 py-5 pb-16">
        <Link to="/" className="inline-flex min-h-[40px] items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-brand mb-3">
          <ArrowLeft className="h-4 w-4" /> Continuar comprando
        </Link>
        <h1 className="text-2xl font-extrabold text-stone-900 mb-4">Finalizar Pedido</h1>

        {submitError && (
          <div role="alert" className="mb-4 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <CheckoutCustomerSection
            customer={customer}
            onChange={(p) => setCustomer((prev) => ({ ...prev, ...p }))}
          />
          <CheckoutShippingForm
            settings={settings}
            fulfillmentType={fulfillmentType}
            onFulfillmentChange={setFulfillmentType}
            cep={cep}
            onCepChange={setCep}
            address={address}
            onAddressChange={(p) => setAddress((prev) => ({ ...prev, ...p }))}
            shippingResult={shippingResult}
            calculating={calculatingCep}
            shippingError={shippingError}
            onCalculateCep={(c) => void handleCalculateCep(c)}
            isFreeShippingCoupon={isFreeShippingCoupon}
          />
          <CheckoutSummaryCard
            items={items}
            subtotal={subtotal}
            discountAmount={discountAmount}
            shippingFee={effectiveShippingFee}
            grandTotal={grandTotal}
            fulfillmentType={fulfillmentType}
            paymentMethod={paymentMethod}
            onPaymentChange={setPaymentMethod}
            appliedCoupon={appliedCoupon}
            couponInput={couponInput}
            onCouponInputChange={setCouponInput}
            onApplyCoupon={() => void handleApplyCoupon()}
            onRemoveCoupon={removeCoupon}
            couponMsg={couponMsg}
            submitting={submitting}
          />
        </form>
      </main>
    </div>
  );
}
