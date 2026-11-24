import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Loader2, ShoppingBag } from 'lucide-react';
import CheckoutCustomerBanner from '../../components/store/CheckoutCustomerBanner';
import CustomerAuthGateCard from '../../components/store/CustomerAuthGateCard';
import CheckoutCustomerSection, { type CheckoutCustomerFields } from '../../components/store/CheckoutCustomerSection';
import CheckoutShippingForm, { type CheckoutAddressFields } from '../../components/store/CheckoutShippingForm';
import CheckoutSummaryCard from '../../components/store/CheckoutSummaryCard';
import StoreHeader from '../../components/store/StoreHeader';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useStoreSettings } from '../../contexts/StoreSettingsContext';
import { formatPhoneBR, onlyDigits } from '../../lib/formatters';
import { cleanCep, formatCep } from '../../lib/geoCep';
import type { ResolvedGpsLocation } from '../../lib/geoMaps';
import { buildCheckoutCustomerProfilePayload, buildOnlineOrderPayload } from '../../lib/checkoutPayload';
import { saveMyCustomerProfile } from '../../services/customerAccountService';
import { listActiveDeliveryZonesPublic } from '../../services/logisticsAdminService';
import { calculateShippingQuote, type ShippingCalculationResult } from '../../services/shippingService';
import { submitStoreOrder } from '../../services/storePublicService';
import { triggerAutoWhatsappNotification } from '../../services/whatsappService';
import type { CustomerProfile } from '../../types/customer';
import type { DeliveryZone, FulfillmentType, PaymentMethod } from '../../types/database';

const EMPTY_CUSTOMER: CheckoutCustomerFields = { name: '', phone: '', email: '', cpf: '', notes: '' };
const EMPTY_ADDR: CheckoutAddressFields = { street: '', number: '', complement: '', neighborhood: '', city: '', state: '' };

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { settings } = useStoreSettings();
  const {
    items, subtotal, discountAmount, appliedCoupon,
    applyCouponCode, removeCoupon, isFreeShippingCoupon, clearCart,
  } = useCart();

  const [customer, setCustomer] = useState<CheckoutCustomerFields>(EMPTY_CUSTOMER);
  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType>(
    settings.delivery_enabled ? 'delivery' : 'pickup',
  );
  const [cep, setCep] = useState('');
  const [address, setAddress] = useState<CheckoutAddressFields>(EMPTY_ADDR);
  const [activeZones, setActiveZones] = useState<DeliveryZone[]>([]);
  const [zonesLoaded, setZonesLoaded] = useState(false);
  const [pendingAutoCep, setPendingAutoCep] = useState<string | null>(null);
  const [shippingResult, setShippingResult] = useState<ShippingCalculationResult | null>(null);
  const [calculatingCep, setCalculatingCep] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);

  const [couponInput, setCouponInput] = useState('');
  const [couponMsg, setCouponMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix_mp');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    listActiveDeliveryZonesPublic()
      .then(setActiveZones)
      .catch(() => {})
      .finally(() => setZonesLoaded(true));
  }, []);

  const handleCalculateCep = useCallback(
    async (overrideCep?: string, gpsLoc?: ResolvedGpsLocation) => {
      const targetCep = overrideCep ?? cep;
      setShippingError(null);
      setCalculatingCep(true);
      try {
        const gpsAddress = gpsLoc
          ? { cep: gpsLoc.cep, street: gpsLoc.street, neighborhood: gpsLoc.neighborhood, city: gpsLoc.city, state: gpsLoc.state, lat: gpsLoc.lat, lng: gpsLoc.lng }
          : null;
        const quote = await calculateShippingQuote({ rawCep: targetCep, gpsAddress, subtotal, settings, activeZones });
        setShippingResult(quote);
        if (quote.address) {
          setAddress((prev) => ({
            ...prev,
            street: gpsLoc ? (gpsLoc.street || prev.street) : (prev.street || quote.address?.street || ''),
            number: gpsLoc ? (gpsLoc.number || prev.number) : prev.number,
            neighborhood: gpsLoc ? (gpsLoc.neighborhood || prev.neighborhood) : (prev.neighborhood || quote.address?.neighborhood || ''),
            city: gpsLoc ? (gpsLoc.city || prev.city) : (prev.city || quote.address?.city || ''),
            state: gpsLoc ? (gpsLoc.state || prev.state) : (prev.state || quote.address?.state || ''),
          }));
        }
      } catch (err) {
        setShippingResult(null);
        setShippingError(err instanceof Error ? err.message : 'Erro ao consultar CEP.');
      } finally {
        setCalculatingCep(false);
      }
    },
    [cep, subtotal, settings, activeZones],
  );

  const handleGpsConfirmed = useCallback(
    (loc: ResolvedGpsLocation) => {
      if (loc.cep) setCep(formatCep(loc.cep));
      void handleCalculateCep(loc.cep ? formatCep(loc.cep) : undefined, loc);
    },
    [handleCalculateCep],
  );

  useEffect(() => {
    if (!zonesLoaded || !pendingAutoCep) return;
    const cepToRun = pendingAutoCep;
    setPendingAutoCep(null);
    if (fulfillmentType === 'delivery') {
      void handleCalculateCep(cepToRun);
    }
  }, [zonesLoaded, pendingAutoCep, fulfillmentType, handleCalculateCep]);

  const handleProfileLoaded = useCallback((profile: CustomerProfile) => {
    setCustomer((prev) => ({
      ...prev,
      name: prev.name || profile.full_name, phone: prev.phone || formatPhoneBR(profile.whatsapp),
      email: prev.email || profile.email, cpf: prev.cpf || profile.cpf,
    }));
    setAddress((prev) => ({
      street: prev.street || profile.street, number: prev.number || profile.number,
      complement: prev.complement || profile.complement, neighborhood: prev.neighborhood || profile.neighborhood,
      city: prev.city || profile.city, state: prev.state || profile.state,
    }));
    const savedCep = cleanCep(profile.cep);
    if (savedCep.length === 8) {
      const formatted = formatCep(savedCep);
      setCep((prev) => prev || formatted);
      setPendingAutoCep(formatted);
    }
  }, []);

  const deliveryOption = shippingResult?.options.find((o) => o.fulfillmentType === 'delivery');
  const effectiveShippingFee = fulfillmentType === 'pickup' ? 0 : deliveryOption ? (deliveryOption.isFreeShipping || isFreeShippingCoupon ? 0 : deliveryOption.fee) : 0;
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
    if (!user) {
      setSubmitError('Conecte-se com sua conta Google ou CPF e senha para finalizar o pedido.');
      return;
    }
    if (!customer.name.trim() || onlyDigits(customer.phone).length < 10) {
      setSubmitError('Informe seu nome completo e um WhatsApp válido com DDD.');
      return;
    }
    if (fulfillmentType === 'delivery' && !deliveryOption) {
      setSubmitError('Calcule o frete pelo GPS ou CEP atendido para entrega, ou escolha Retirar na Loja.');
      return;
    }
    if (fulfillmentType === 'delivery' && (!address.street.trim() || !address.number.trim() || !address.neighborhood.trim())) {
      setSubmitError('Preencha rua, número e bairro para a entrega.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await submitStoreOrder(
        buildOnlineOrderPayload({
          fulfillmentType, paymentMethod, customer, cep, address,
          shippingFee: effectiveShippingFee, couponCode: appliedCoupon?.code ?? null, items,
        }),
      );
      if (user) {
        void saveMyCustomerProfile(
          buildCheckoutCustomerProfilePayload({ userId: user.id, fallbackEmail: user.email || '', customer, cep, address }),
        ).catch(() => {});
      }
      triggerAutoWhatsappNotification(created.order_id, created.public_access_token, 'order_created');
      clearCart();
      navigate(`/pedido/${created.order_id}?token=${encodeURIComponent(created.public_access_token)}`, { replace: true });
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
        {authLoading ? (
          <div className="flex justify-center rounded-3xl border border-stone-200 bg-white py-16 text-brand">
            <Loader2 className="h-7 w-7 animate-spin" />
          </div>
        ) : !user ? (
          <CustomerAuthGateCard
            redirectHashRoute="/checkout"
            title="Entre ou cadastre-se para finalizar"
            subtitle="É obrigatório estar conectada com sua conta Google ou cadastro por Nome, CPF e Senha para fechar pedidos e acompanhar entregas."
          />
        ) : (
          <>
            <CheckoutCustomerBanner onProfileLoaded={handleProfileLoaded} />
            {submitError && (
              <div role="alert" className="mb-4 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <CheckoutCustomerSection customer={customer} onChange={(p) => setCustomer((prev) => ({ ...prev, ...p }))} />
              <CheckoutShippingForm
                settings={settings} fulfillmentType={fulfillmentType} onFulfillmentChange={setFulfillmentType}
                cep={cep} onCepChange={setCep} address={address} onAddressChange={(p) => setAddress((prev) => ({ ...prev, ...p }))}
                shippingResult={shippingResult} calculating={calculatingCep} shippingError={shippingError}
                onCalculateCep={(c) => void handleCalculateCep(c)} onGpsLocationConfirmed={handleGpsConfirmed} isFreeShippingCoupon={isFreeShippingCoupon}
              />
              <CheckoutSummaryCard
                items={items} subtotal={subtotal} discountAmount={discountAmount} shippingFee={effectiveShippingFee}
                grandTotal={grandTotal} fulfillmentType={fulfillmentType} paymentMethod={paymentMethod} onPaymentChange={setPaymentMethod}
                appliedCoupon={appliedCoupon} couponInput={couponInput} onCouponInputChange={setCouponInput}
                onApplyCoupon={() => void handleApplyCoupon()} onRemoveCoupon={removeCoupon} couponMsg={couponMsg} submitting={submitting}
              />
            </form>
          </>
        )}
      </main>
    </div>
  );
}
