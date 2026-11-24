export type DashboardPeriod = 'today' | '7d' | 'month' | 'all';

export interface TopSoldProduct {
  productId: string;
  productName: string;
  quantity: number;
  revenue: number;
}

export interface LowStockAlertItem {
  variantId: string;
  productId: string;
  productName: string;
  variantName: string;
  stockQty: number;
}

export interface ExpiringBatchAlertItem {
  variantId: string;
  productId: string;
  productName: string;
  variantName: string;
  expiryDate: string;
  daysLeft: number;
}

export interface DashboardSummary {
  grossRevenue: number;
  pendingRevenue: number;
  pendingCount: number;
  netProfit: number;
  profitMarginPercent: number;
  ordersCount: number;
  averageTicket: number;
  onlineRevenue: number;
  onlineCount: number;
  posRevenue: number;
  posCount: number;
  byPaymentMethod: {
    pix: number;
    card: number;
    cash: number;
    whatsapp: number;
  };
  topProducts: TopSoldProduct[];
  awaitingActionCount: number;
  lowStockItems: LowStockAlertItem[];
  lowStockTotal: number;
  expiringItems: ExpiringBatchAlertItem[];
  expiringTotal: number;
}

export const EMPTY_DASHBOARD_SUMMARY: DashboardSummary = {
  grossRevenue: 0,
  pendingRevenue: 0,
  pendingCount: 0,
  netProfit: 0,
  profitMarginPercent: 0,
  ordersCount: 0,
  averageTicket: 0,
  onlineRevenue: 0,
  onlineCount: 0,
  posRevenue: 0,
  posCount: 0,
  byPaymentMethod: { pix: 0, card: 0, cash: 0, whatsapp: 0 },
  topProducts: [],
  awaitingActionCount: 0,
  lowStockItems: [],
  lowStockTotal: 0,
  expiringItems: [],
  expiringTotal: 0,
};
