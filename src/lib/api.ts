import { BargainRequest, BargainResponse, DataSource, DealClient, ProximityPingPayload, ProximityResponse, SettleRequest, SettleResponse } from '../types/metapase';
import { demoClient } from './demoBackend';
import { timeoutSignal } from './device';
import { authorizePayment, forgetPasskey } from './metaPay';
import type { JsonResult } from './metaPay';

export const API_BASE: string = (import.meta.env.VITE_METAPASE_API_BASE as string | undefined) ?? 'http://localhost:3000';

const REQUEST_TIMEOUT_MS = 8000;

const postJson = async <T>(path: string, body: unknown): Promise<JsonResult<T>> => {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: timeoutSignal(REQUEST_TIMEOUT_MS)
  });
  let data: T | null = null;
  try {
    data = (await response.json()) as T;
  } catch {
    data = null;
  }
  return { ok: response.ok, status: response.status, data };
};

export const pingProximity = async (payload: ProximityPingPayload): Promise<ProximityResponse | null> => {
  const result = await postJson<ProximityResponse>('/api/proximity/ping', payload);
  if (!result.ok || !result.data || !result.data.adContext || !result.data.resolvedLocation) return null;
  return result.data;
};

export const submitBargain = async (payload: BargainRequest): Promise<BargainResponse> => {
  const result = await postJson<BargainResponse>('/api/agent/bargain', payload);
  if (!result.ok || !result.data) throw new Error(`Bargain request failed (HTTP ${result.status})`);
  return result.data;
};

type SettleReply = SettleResponse & { error?: string; message?: string };

const settleOnce = async (transactionToken: string): Promise<JsonResult<SettleReply>> => {
  const authPayload = await authorizePayment(postJson, transactionToken);
  return postJson<SettleReply>('/api/pay/settle', { transactionToken, authPayload });
};

export const settlePayment = async (payload: SettleRequest): Promise<SettleResponse> => {
  let result = await settleOnce(payload.transactionToken);
  if (!result.ok && result.data?.error === 'UNKNOWN_CREDENTIAL') {
    forgetPasskey();
    result = await settleOnce(payload.transactionToken);
  }
  if (result.status === 401) return { success: false };
  if (!result.ok || !result.data) throw new Error(result.data?.message ?? `Settlement failed (HTTP ${result.status})`);
  return result.data;
};

export const liveClient: DealClient = {
  label: API_BASE,
  ping: pingProximity,
  bargain: submitBargain,
  settle: settlePayment
};

export const getClient = (source: DataSource): DealClient => (source === 'demo' ? demoClient : liveClient);

export const DEFAULT_DATA_SOURCE: DataSource = import.meta.env.VITE_METAPASE_DATA_SOURCE === 'demo' ? 'demo' : 'live';

// ==========================================
// FULL REST BACKEND API METHODS
// ==========================================

export interface ApiMall {
  id: string;
  name: string;
  city: string;
  suburb: string;
  tagline: string;
  storesCount: number;
  center: { lat: number; lng: number };
}

export interface ApiMerchant {
  storeId: string;
  storeName: string;
  category: string;
  mallId: string;
  mallName: string;
  protocolSupport: string[];
  maxDiscountPercent: number;
  inventoryCount: number;
  featuredCatalog: Array<{
    id: string;
    name: string;
    category: string;
    basePriceZAR: number;
    stock: number;
  }>;
}

export interface ApiUserAgent {
  userId: string;
  agentId: string;
  agentName: string;
  creditBalanceZAR: number;
  promoApplied: boolean;
  activeWishlistCount: number;
}

export interface ApiWishlistItem {
  id: string;
  userId: string;
  query: string;
  category: string;
  maxBudgetZAR: number;
  autoBuy: boolean;
  status: 'searching' | 'matched' | 'bought' | 'parked';
  matchedStoreId?: string;
  matchedDealPriceZAR?: number;
  matchedDealTitle?: string;
  createdAt: number;
}

export interface ApiProductInventory {
  productId: string;
  storeId: string;
  storeName: string;
  mallId: string;
  mallName: string;
  sku: string;
  name: string;
  category: string;
  basePriceZAR: number;
  floorPriceZAR: number;
  stockQuantity: number;
  inStock: boolean;
  imageUrl?: string;
  description?: string;
  tag?: string;
  updatedAt: number;
}

export interface ApiMerchantAnalytics {
  storeId: string;
  totalSalesCount: number;
  grossRevenueZAR: number;
  totalSavingsZAR: number;
  autonomousSalesCount: number;
  manualSalesCount: number;
  redeemedCount: number;
  pendingRedemptionCount: number;
}

export interface ApiActivityLog {
  activityId: string;
  timestamp: string;
  type: 'AUTONOMOUS_PURCHASE' | 'MANUAL_PURCHASE' | 'BARGAIN_EVALUATION' | 'VOUCHER_REDEEMED' | 'WISHLIST_CREATED' | 'CREDIT_ADJUSTMENT' | 'INVENTORY_UPDATED' | 'PROXIMITY_PING';
  actor: 'USER' | 'PERSONAL_AGENT' | 'MERCHANT_AGENT' | 'SYSTEM';
  userId?: string;
  storeId?: string;
  storeName?: string;
  mallId?: string;
  summary: string;
  details: Record<string, unknown>;
}

export interface ApiTransactionReceipt {
  receiptId: string;
  voucherCode: string;
  storeId: string;
  storeName: string;
  mallId: string;
  mallName: string;
  sku: string;
  itemName: string;
  amountZAR: number;
  savingsZAR: number;
  purchasedBy: 'autonomous_personal_agent' | 'manual_user_checkout';
  timestamp: string;
  authorizationRef: string;
  qrPayload: string;
  status: 'ISSUED' | 'REDEEMED' | 'EXPIRED';
  userId?: string;
}

const getJson = async <T>(path: string): Promise<T | null> => {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { 'Accept': 'application/json' },
      signal: timeoutSignal(REQUEST_TIMEOUT_MS)
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
};

export const api = {
  // Health & Info
  getHealth: () => getJson<{ ok: boolean; database: string; merchantsCount: number }>('/api/health'),
  getInfo: () => getJson<Record<string, unknown>>('/api/info'),

  // Malls & Stores
  getMalls: () => getJson<{ ok: boolean; count: number; malls: ApiMall[] }>('/api/malls'),
  getMallStores: (mallId: string) => getJson<{ ok: boolean; mallId: string; count: number; stores: unknown[] }>(`/api/malls/${mallId}/stores`),

  // 31 Meta Merchant Agents & Details
  getMerchants: () => getJson<{ ok: boolean; count: number; merchants: ApiMerchant[] }>('/api/merchants'),
  getMerchant: (storeId: string) => getJson<{ ok: boolean; merchant: ApiMerchant }>(`/api/merchants/${storeId}`),

  // Merchant Store Inventory (Products, stock levels)
  getStoreInventory: (storeId?: string) =>
    getJson<{ ok?: boolean; count: number; inventory: ApiProductInventory[]; storeId?: string; storeName?: string }>(storeId ? `/api/merchants/${storeId}/inventory` : '/api/merchants/inventory'),
  updateProductStock: (storeId: string, sku: string, stockQuantity: number) =>
    postJson<{ success: boolean; item: ApiProductInventory }>(`/api/merchants/${storeId}/inventory/${sku}/stock`, { stockQuantity }),

  // Merchant Store Transactions & Analytics
  getMerchantTransactions: (storeId: string) =>
    getJson<{ storeId: string; count: number; transactions: ApiTransactionReceipt[] }>(`/api/merchants/${storeId}/transactions`),
  getMerchantAnalytics: (storeId: string) =>
    getJson<{ ok: boolean; analytics: ApiMerchantAnalytics }>(`/api/merchants/${storeId}/analytics`),

  // Transactions: Buy
  autonomousBuy: (payload: { storeId: string; sku: string; maxBudgetZAR: number; userId?: string; virtualCard?: { cardId?: string; last4?: string } }) =>
    postJson<{ success: boolean; mode: string; receipt: ApiTransactionReceipt; agreedPriceZAR: number; roundsCompleted: number }>('/api/merchants/autonomous-buy', payload),

  manualBuy: (payload: { storeId: string; sku: string; priceZAR?: number; paymentMethod?: string; userId?: string }) =>
    postJson<{ success: boolean; mode: string; receipt: ApiTransactionReceipt }>('/api/merchants/manual-buy', payload),

  // Personal Agent & Promo Credit
  getUserAgent: (userId = 'user_shopper_01') => getJson<ApiUserAgent>(`/api/user/agent?userId=${encodeURIComponent(userId)}`),
  topUpAgentCredit: (userId: string, amountZAR: number) => postJson<{ success: boolean; balanceZAR: number }>('/api/user/agent/credit', { userId, amountZAR }),

  // Wishlist
  getWishlist: (userId = 'user_shopper_01') => getJson<{ count: number; wishlist: ApiWishlistItem[] }>(`/api/user/wishlist?userId=${encodeURIComponent(userId)}`),
  addWishlistItem: (payload: { userId?: string; query: string; category?: string; targetMaxPriceZAR?: number; autoBuy?: boolean }) =>
    postJson<{ success: boolean; item: ApiWishlistItem }>('/api/user/wishlist', payload),
  deleteWishlistItem: (id: string) =>
    fetch(`${API_BASE}/api/user/wishlist/${id}`, { method: 'DELETE' }).then(r => r.json()).catch(() => ({ success: false })),
  toggleWishlistAutoBuy: (id: string) =>
    postJson<{ success: boolean; item: ApiWishlistItem }>(`/api/user/wishlist/${id}/toggle`, {}),

  // Transactions / Receipts / QR Redemption
  getTransactions: (filters?: { userId?: string; storeId?: string }) => {
    const params = new URLSearchParams();
    if (filters?.userId) params.set('userId', filters.userId);
    if (filters?.storeId) params.set('storeId', filters.storeId);
    const queryStr = params.toString() ? `?${params.toString()}` : '';
    return getJson<{ count: number; transactions: ApiTransactionReceipt[] }>(`/api/transactions${queryStr}`);
  },
  getTransaction: (voucherCode: string) => getJson<ApiTransactionReceipt>(`/api/transactions/${voucherCode}`),
  redeemVoucher: (voucherCode: string) => postJson<{ success: boolean; message: string; receipt: ApiTransactionReceipt }>(`/api/transactions/${voucherCode}/redeem`, {}),

  // Live Activity Audit Trail
  getActivityLog: (filters?: { storeId?: string; userId?: string; type?: string; limit?: number }) => {
    const params = new URLSearchParams();
    if (filters?.storeId) params.set('storeId', filters.storeId);
    if (filters?.userId) params.set('userId', filters.userId);
    if (filters?.type) params.set('type', filters.type);
    if (filters?.limit) params.set('limit', String(filters.limit));
    const queryStr = params.toString() ? `?${params.toString()}` : '';
    return getJson<{ count: number; activities: ApiActivityLog[] }>(`/api/activity${queryStr}`);
  }
};
