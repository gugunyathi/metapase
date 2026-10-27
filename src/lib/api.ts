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

export interface ApiTransactionReceipt {
  voucherCode: string;
  storeId: string;
  storeName: string;
  productId: string;
  productName: string;
  originalPriceZAR: number;
  finalPriceZAR: number;
  discountZAR: number;
  discountPercentage: number;
  buyerType: 'AUTONOMOUS_AGENT' | 'HUMAN_MANUAL';
  cardMasked: string;
  status: 'AUTHORIZED' | 'PAID' | 'REDEEMED';
  qrVoucherPayload: string;
  timestamp: string;
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

  // 31 Meta Merchant Agents
  getMerchants: () => getJson<{ ok: boolean; count: number; merchants: ApiMerchant[] }>('/api/merchants'),
  getMerchant: (storeId: string) => getJson<{ ok: boolean; merchant: ApiMerchant }>(`/api/merchants/${storeId}`),

  // Transactions: Buy
  autonomousBuy: (payload: { storeId: string; productId: string; offerPriceZAR: number; notes?: string; userId?: string }) =>
    postJson<{ ok: boolean; message: string; receipt: ApiTransactionReceipt; remainingAgentCreditZAR: number }>('/api/merchants/autonomous-buy', payload),

  manualBuy: (payload: { storeId: string; productId: string; customerName?: string; customerEmail?: string; userId?: string }) =>
    postJson<{ ok: boolean; message: string; receipt: ApiTransactionReceipt }>('/api/merchants/manual-buy', payload),

  // Personal Agent & Promo Credit
  getUserAgent: (userId = 'usr_guest') => getJson<{ ok: boolean; agent: ApiUserAgent }>(`/api/user/agent?userId=${encodeURIComponent(userId)}`),
  topUpAgentCredit: (userId: string, amountZAR: number) => postJson<{ ok: boolean; balanceZAR: number }>('/api/user/agent/credit', { userId, amountZAR }),

  // Wishlist
  getWishlist: (userId = 'usr_guest') => getJson<{ ok: boolean; items: ApiWishlistItem[] }>(`/api/user/wishlist?userId=${encodeURIComponent(userId)}`),
  addWishlistItem: (payload: { userId?: string; query: string; category?: string; maxBudgetZAR?: number; autoBuy?: boolean }) =>
    postJson<{ ok: boolean; item: ApiWishlistItem }>('/api/user/wishlist', payload),
  deleteWishlistItem: (id: string, userId = 'usr_guest') =>
    fetch(`${API_BASE}/api/user/wishlist/${id}?userId=${encodeURIComponent(userId)}`, { method: 'DELETE' }).then(r => r.json()).catch(() => ({ ok: false })),
  toggleWishlistAutoBuy: (id: string, autoBuy: boolean, userId = 'usr_guest') =>
    postJson<{ ok: boolean; autoBuy: boolean }>(`/api/user/wishlist/${id}/toggle`, { userId, autoBuy }),

  // Transactions / Receipts / QR Redemption
  getTransactions: (userId = 'usr_guest') => getJson<{ ok: boolean; count: number; transactions: ApiTransactionReceipt[] }>(`/api/transactions?userId=${encodeURIComponent(userId)}`),
  getTransaction: (voucherCode: string) => getJson<{ ok: boolean; transaction: ApiTransactionReceipt }>(`/api/transactions/${voucherCode}`),
  redeemVoucher: (voucherCode: string) => postJson<{ ok: boolean; message: string; transaction: ApiTransactionReceipt }>(`/api/transactions/${voucherCode}/redeem`, {})
};
