import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { validateCouponStore } from '../services/storePublicService';
import type { DiscountType } from '../types/database';

const CART_STORAGE_KEY = 'veluna_cart_v1';

export interface CartItem {
  variantId: string;
  productId: string;
  slug: string;
  productName: string;
  brand: string;
  variantName: string;
  colorHex: string;
  sizeLabel: string;
  imageUrl: string;
  unitPrice: number;
  originalPrice: number;
  maxStock: number;
  quantity: number;
}

export interface AppliedCoupon {
  code: string;
  discountType: DiscountType;
  discountValue: number;
}

interface PersistedCart {
  items: CartItem[];
  appliedCoupon: AppliedCoupon | null;
}

interface CartContextValue {
  items: CartItem[];
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (item: Omit<CartItem, 'quantity'>, qty?: number, openDrawer?: boolean) => void;
  updateQuantity: (variantId: string, qty: number) => void;
  removeItem: (variantId: string) => void;
  clearCart: () => void;
  appliedCoupon: AppliedCoupon | null;
  applyCouponCode: (code: string) => Promise<{ ok: boolean; message: string }>;
  removeCoupon: () => void;
  totalItems: number;
  subtotal: number;
  discountAmount: number;
  isFreeShippingCoupon: boolean;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

function loadPersistedCart(): PersistedCart {
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return { items: [], appliedCoupon: null };
    const parsed = JSON.parse(raw) as Partial<PersistedCart>;
    return {
      items: Array.isArray(parsed.items) ? parsed.items : [],
      appliedCoupon: parsed.appliedCoupon ?? null,
    };
  } catch {
    return { items: [], appliedCoupon: null };
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const initial = useMemo(loadPersistedCart, []);
  const [items, setItems] = useState<CartItem[]>(initial.items);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(initial.appliedCoupon);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    try {
      const payload: PersistedCart = { items, appliedCoupon };
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignora erro de quota do localStorage
    }
  }, [items, appliedCoupon]);

  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);

  const addItem = useCallback(
    (incoming: Omit<CartItem, 'quantity'>, qty = 1, openDrawer = true) => {
      if (incoming.maxStock <= 0) return;
      const safeAdd = Math.max(1, Math.trunc(qty));
      setItems((prev) => {
        const existing = prev.find((i) => i.variantId === incoming.variantId);
        if (existing) {
          const nextQty = Math.min(incoming.maxStock, existing.quantity + safeAdd);
          return prev.map((i) =>
            i.variantId === incoming.variantId ? { ...incoming, quantity: nextQty } : i,
          );
        }
        return [...prev, { ...incoming, quantity: Math.min(incoming.maxStock, safeAdd) }];
      });
      if (openDrawer) setIsCartOpen(true);
    },
    [],
  );

  const updateQuantity = useCallback((variantId: string, qty: number) => {
    setItems((prev) => {
      if (qty <= 0) return prev.filter((i) => i.variantId !== variantId);
      return prev.map((i) =>
        i.variantId === variantId
          ? { ...i, quantity: Math.min(Math.max(1, Math.trunc(qty)), Math.max(1, i.maxStock)) }
          : i,
      );
    });
  }, []);

  const removeItem = useCallback((variantId: string) => {
    setItems((prev) => prev.filter((i) => i.variantId !== variantId));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setAppliedCoupon(null);
  }, []);

  const removeCoupon = useCallback(() => setAppliedCoupon(null), []);

  const totalItems = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);
  const subtotal = useMemo(
    () => round2(items.reduce((sum, item) => sum + Number(item.unitPrice) * item.quantity, 0)),
    [items],
  );

  const applyCouponCode = useCallback(
    async (code: string): Promise<{ ok: boolean; message: string }> => {
      try {
        const res = await validateCouponStore(code, subtotal);
        if (!res.valid || !res.discount_type || !res.code) {
          return { ok: false, message: res.message || 'Cupom inválido.' };
        }
        setAppliedCoupon({
          code: res.code,
          discountType: res.discount_type,
          discountValue: Number(res.discount_value) || 0,
        });
        return { ok: true, message: res.message || `Cupom ${res.code} aplicado!` };
      } catch (err) {
        return {
          ok: false,
          message: err instanceof Error ? err.message : 'Não foi possível validar o cupom.',
        };
      }
    },
    [subtotal],
  );

  const discountAmount = useMemo(() => {
    if (!appliedCoupon || subtotal <= 0) return 0;
    if (appliedCoupon.discountType === 'percentage') {
      return round2(Math.min(subtotal, (subtotal * Number(appliedCoupon.discountValue)) / 100));
    }
    if (appliedCoupon.discountType === 'fixed') {
      return round2(Math.min(subtotal, Number(appliedCoupon.discountValue)));
    }
    return 0;
  }, [appliedCoupon, subtotal]);

  const isFreeShippingCoupon = appliedCoupon?.discountType === 'free_shipping';

  return (
    <CartContext.Provider
      value={{
        items,
        isCartOpen,
        openCart,
        closeCart,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        appliedCoupon,
        applyCouponCode,
        removeCoupon,
        totalItems,
        subtotal,
        discountAmount,
        isFreeShippingCoupon,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart deve ser utilizado dentro de CartProvider.');
  }
  return ctx;
}
