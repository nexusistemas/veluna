import { useCallback, useEffect, useMemo, useState } from 'react';
import { onlyDigits } from '../../../lib/formatters';
import {
  createPosOrderAdmin,
  fetchPosCatalogAdmin,
  type PosCatalogItem,
} from '../../../services/ordersAdminService';
import { validateCouponStore } from '../../../services/storePublicService';
import { triggerAutoWhatsappNotification } from '../../../services/whatsappService';
import type { PosCartItem, PosPaymentMethod } from './PosCheckoutDrawer';
import type { CompletedPosSale } from './PosSaleSuccessModal';

export function usePosController() {
  const [catalog, setCatalog] = useState<PosCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  const [cart, setCart] = useState<PosCartItem[]>([]);
  const [manualDiscountInput, setManualDiscountInput] = useState('');
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountAmount: number } | null>(null);
  const [couponMsg, setCouponMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PosPaymentMethod>('pos_pix_mp');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [completedSale, setCompletedSale] = useState<CompletedPosSale | null>(null);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    try {
      setCatalog(await fetchPosCatalogAdmin());
    } catch (err) {
      setScanFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao carregar catálogo do PDV.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const cartQuantities = useMemo(() => {
    const map: Record<string, number> = {};
    for (const entry of cart) map[entry.item.variantId] = entry.quantity;
    return map;
  }, [cart]);

  const totalItemsCount = useMemo(() => cart.reduce((acc, e) => acc + e.quantity, 0), [cart]);
  const subtotal = useMemo(
    () => cart.reduce((acc, e) => acc + e.item.effectivePrice * e.quantity, 0),
    [cart],
  );

  const manualDiscountValue = Math.max(0, Number(manualDiscountInput.replace(',', '.')) || 0);
  const effectiveDiscount = Math.min(subtotal, Math.max(0, appliedCoupon ? appliedCoupon.discountAmount : manualDiscountValue));
  const grandTotal = Math.max(0, subtotal - effectiveDiscount);

  const handleAddItem = useCallback((item: PosCatalogItem) => {
    if (item.stockQty <= 0) {
      setScanFeedback({ type: 'error', text: `Sem estoque: ${item.productName} (${item.variantName}).` });
      return;
    }
    setCart((prev) => {
      const idx = prev.findIndex((e) => e.item.variantId === item.variantId);
      if (idx === -1) return [...prev, { item, quantity: 1 }];
      if (prev[idx].quantity >= item.stockQty) return prev;
      const next = [...prev];
      next[idx] = { ...prev[idx], quantity: prev[idx].quantity + 1 };
      return next;
    });
    setScanFeedback({ type: 'ok', text: `Adicionado: ${item.productName} — ${item.variantName}` });
  }, []);

  const handleBarcodeLookup = useCallback(
    (rawCode: string) => {
      const clean = rawCode.trim();
      setScannerOpen(false);
      if (!clean) return;
      const matches = catalog.filter(
        (it) =>
          (it.eanBarcode && it.eanBarcode.trim() === clean) ||
          (it.sku && it.sku.trim().toLowerCase() === clean.toLowerCase()),
      );
      if (matches.length === 1) {
        const match = matches[0];
        if (match.stockQty <= 0 || (cartQuantities[match.variantId] ?? 0) >= match.stockQty) {
          setScanFeedback({ type: 'error', text: `Estoque esgotado para ${match.productName} (${match.variantName}).` });
          return;
        }
        handleAddItem(match);
        setSearch('');
        return;
      }
      setSearch(clean);
      setScanFeedback({
        type: 'error',
        text:
          matches.length > 1
            ? `Encontramos ${matches.length} variantes com o código ${clean}. Selecione abaixo.`
            : `Código "${clean}" não encontrado no catálogo ativo.`,
      });
    },
    [catalog, cartQuantities, handleAddItem],
  );

  const handleUpdateQty = (variantId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((e) => (e.item.variantId === variantId ? { ...e, quantity: Math.min(e.item.stockQty, e.quantity + delta) } : e))
        .filter((e) => e.quantity > 0),
    );
  };

  const resetSaleForm = () => {
    setCart([]);
    setManualDiscountInput('');
    setCouponInput('');
    setAppliedCoupon(null);
    setCouponMsg(null);
    setCustomerName('');
    setCustomerPhone('');
    setNotes('');
    setSubmitError(null);
    setDrawerOpen(false);
  };

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    try {
      const res = await validateCouponStore(couponInput, subtotal);
      if (res.valid && res.code) {
        setAppliedCoupon({ code: res.code, discountAmount: res.discount_amount });
        setManualDiscountInput('');
        setCouponInput('');
        setCouponMsg({ ok: true, text: res.message });
      } else {
        setCouponMsg({ ok: false, text: res.message });
      }
    } catch (err) {
      setCouponMsg({ ok: false, text: err instanceof Error ? err.message : 'Erro ao validar cupom.' });
    }
  };

  const handleFinalizeSale = async () => {
    if (cart.length === 0) return;
    setSubmitError(null);
    setSubmitting(true);
    const cleanPhone = onlyDigits(customerPhone);
    const finalName = customerName.trim() || 'Cliente Balcão';

    try {
      const created = await createPosOrderAdmin({
        channel: 'pos',
        fulfillment_type: 'in_store',
        payment_method: paymentMethod,
        customer_name: finalName,
        customer_phone: cleanPhone || null,
        shipping_fee: 0,
        coupon_code: appliedCoupon?.code ?? null,
        manual_discount: !appliedCoupon && effectiveDiscount > 0 ? effectiveDiscount : undefined,
        notes: notes.trim() || null,
        items: cart.map((e) => ({ variant_id: e.item.variantId, quantity: e.quantity })),
      });

      if (cleanPhone.length >= 10) {
        triggerAutoWhatsappNotification(created.order_id, created.public_access_token, 'order_created');
      }

      setCompletedSale({
        orderId: created.order_id,
        orderNumber: created.order_number,
        publicToken: created.public_access_token,
        customerName: finalName,
        customerPhone: cleanPhone,
        paymentMethod,
        paymentStatus: created.payment_status,
        status: created.status,
        subtotal: created.subtotal,
        discountAmount: created.discount_amount,
        total: created.total,
        notes: notes.trim(),
        items: cart.map((e) => ({
          product_name: e.item.productName,
          variant_name: e.item.variantName,
          quantity: e.quantity,
          line_total: e.item.effectivePrice * e.quantity,
        })),
      });
      resetSaleForm();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Erro ao registrar venda presencial.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNewSale = () => {
    setCompletedSale(null);
    setScanFeedback(null);
    void loadCatalog();
  };

  return {
    catalog, loading, search, setSearch, scannerOpen, setScannerOpen, drawerOpen, setDrawerOpen,
    scanFeedback, cart, cartQuantities, totalItemsCount, subtotal, effectiveDiscount, grandTotal,
    manualDiscountInput, setManualDiscountInput, couponInput, setCouponInput, appliedCoupon,
    setAppliedCoupon, couponMsg, setCouponMsg, customerName, setCustomerName, customerPhone,
    setCustomerPhone, notes, setNotes, paymentMethod, setPaymentMethod, submitting, submitError,
    completedSale, loadCatalog, handleAddItem, handleBarcodeLookup, handleUpdateQty, resetSaleForm,
    handleApplyCoupon, handleFinalizeSale, handleNewSale,
  };
}
