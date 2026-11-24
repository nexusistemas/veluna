import { daysUntilDate } from '../lib/formatters';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { OrderItem, Product, ProductVariant } from '../types/database';
import type { AdminOrderWithItems } from './ordersAdminService';
import {
  EMPTY_DASHBOARD_SUMMARY,
  type DashboardPeriod,
  type DashboardSummary,
  type ExpiringBatchAlertItem,
  type LowStockAlertItem,
  type TopSoldProduct,
} from './dashboardStatsTypes';

export { EMPTY_DASHBOARD_SUMMARY };
export type {
  DashboardPeriod,
  DashboardSummary,
  ExpiringBatchAlertItem,
  LowStockAlertItem,
  TopSoldProduct,
};

function getPeriodStartIso(period: DashboardPeriod): string | null {
  const now = new Date();
  if (period === 'all') return null;
  if (period === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  if (period === '7d') return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6).toISOString();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

function isOrderPending(order: AdminOrderWithItems): boolean {
  return (order.status === 'pending_payment' || order.status === 'pending') && order.payment_status !== 'approved';
}

function resolveOrderCost(order: AdminOrderWithItems, variantCostMap: Map<string, number>): number {
  if (order.total_cost !== undefined && order.total_cost !== null && Number.isFinite(Number(order.total_cost))) {
    return Number(order.total_cost);
  }
  return (order.order_items ?? []).reduce((acc, item) => {
    const unitCost =
      item.unit_cost !== undefined && item.unit_cost !== null
        ? Number(item.unit_cost)
        : item.variant_id
          ? (variantCostMap.get(item.variant_id) ?? 0)
          : 0;
    return acc + unitCost * (Number(item.quantity) || 0);
  }, 0);
}

export async function fetchDashboardSummary(period: DashboardPeriod): Promise<DashboardSummary> {
  if (!isSupabaseConfigured) return EMPTY_DASHBOARD_SUMMARY;

  const startIso = getPeriodStartIso(period);
  let ordersQuery = supabase
    .from('orders')
    .select('*, order_items(*)')
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false });
  if (startIso) ordersQuery = ordersQuery.gte('created_at', startIso);

  const [ordersRes, actionCountRes, productsRes, variantsRes] = await Promise.all([
    ordersQuery,
    supabase.from('orders').select('id', { count: 'exact', head: true }).in('status', ['paid', 'preparing', 'confirmed']),
    supabase.from('products').select('id, name, is_active').eq('is_active', true),
    supabase.from('product_variants').select('id, product_id, name, stock_qty, cost_price, batch_expiry_date, is_active').eq('is_active', true),
  ]);

  if (ordersRes.error) throw new Error(ordersRes.error.message);
  if (productsRes.error) throw new Error(productsRes.error.message);
  if (variantsRes.error) throw new Error(variantsRes.error.message);

  const productsMap = new Map<string, string>(
    ((productsRes.data ?? []) as Array<Pick<Product, 'id' | 'name'>>).map((p) => [p.id, p.name]),
  );

  const variantCostMap = new Map<string, number>();
  const lowStockAll: LowStockAlertItem[] = [];
  const expiringAll: ExpiringBatchAlertItem[] = [];

  for (const v of (variantsRes.data ?? []) as Array<
    Pick<ProductVariant, 'id' | 'product_id' | 'name' | 'stock_qty' | 'cost_price' | 'batch_expiry_date'>
  >) {
    if (v.cost_price !== null && v.cost_price !== undefined) variantCostMap.set(v.id, Number(v.cost_price) || 0);
    const productName = productsMap.get(v.product_id);
    if (!productName) continue;

    const stockQty = Number(v.stock_qty) || 0;
    if (stockQty <= 3) {
      lowStockAll.push({ variantId: v.id, productId: v.product_id, productName, variantName: v.name, stockQty });
    }
    const daysLeft = daysUntilDate(v.batch_expiry_date);
    if (daysLeft !== null && daysLeft <= 60 && v.batch_expiry_date) {
      expiringAll.push({
        variantId: v.id,
        productId: v.product_id,
        productName,
        variantName: v.name,
        expiryDate: v.batch_expiry_date,
        daysLeft,
      });
    }
  }

  lowStockAll.sort((a, b) => a.stockQty - b.stockQty);
  expiringAll.sort((a, b) => a.daysLeft - b.daysLeft);

  let grossRevenue = 0;
  let pendingRevenue = 0;
  let pendingCount = 0;
  let productRevenueTotal = 0;
  let netProfit = 0;
  let ordersCount = 0;
  let onlineRevenue = 0;
  let onlineCount = 0;
  let posRevenue = 0;
  let posCount = 0;
  const byPaymentMethod = { pix: 0, card: 0, cash: 0, whatsapp: 0 };
  const topMap = new Map<string, TopSoldProduct>();

  for (const order of (ordersRes.data ?? []) as AdminOrderWithItems[]) {
    const total = Number(order.total) || 0;
    if (isOrderPending(order)) {
      pendingRevenue += total;
      pendingCount += 1;
      continue;
    }

    ordersCount += 1;
    grossRevenue += total;

    const productNetRev = Math.max(0, (Number(order.subtotal) || 0) - (Number(order.discount_amount) || 0));
    productRevenueTotal += productNetRev;
    netProfit += productNetRev - resolveOrderCost(order, variantCostMap);

    if (order.channel === 'online') {
      onlineRevenue += total;
      onlineCount += 1;
    } else {
      posRevenue += total;
      posCount += 1;
    }

    if (order.payment_method === 'pix_mp' || order.payment_method === 'pos_pix_mp' || order.payment_method === 'pix') {
      byPaymentMethod.pix += total;
    } else if (
      order.payment_method === 'card_mp' ||
      order.payment_method === 'pos_card_presential' ||
      order.payment_method === 'credit_card' ||
      order.payment_method === 'debit_card'
    ) {
      byPaymentMethod.card += total;
    } else if (order.payment_method === 'pos_cash' || order.payment_method === 'cash') {
      byPaymentMethod.cash += total;
    } else {
      byPaymentMethod.whatsapp += total;
    }

    for (const item of (order.order_items ?? []) as OrderItem[]) {
      const key = item.product_id || item.product_name;
      const cur = topMap.get(key) ?? { productId: item.product_id, productName: item.product_name, quantity: 0, revenue: 0 };
      cur.quantity += Number(item.quantity) || 0;
      cur.revenue += Number(item.line_total) || 0;
      topMap.set(key, cur);
    }
  }

  return {
    grossRevenue,
    pendingRevenue,
    pendingCount,
    netProfit,
    profitMarginPercent: productRevenueTotal > 0 ? (netProfit / productRevenueTotal) * 100 : 0,
    ordersCount,
    averageTicket: ordersCount > 0 ? grossRevenue / ordersCount : 0,
    onlineRevenue,
    onlineCount,
    posRevenue,
    posCount,
    byPaymentMethod,
    topProducts: Array.from(topMap.values()).sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue).slice(0, 5),
    awaitingActionCount: actionCountRes.count ?? 0,
    lowStockItems: lowStockAll.slice(0, 6),
    lowStockTotal: lowStockAll.length,
    expiringItems: expiringAll.slice(0, 6),
    expiringTotal: expiringAll.length,
  };
}
