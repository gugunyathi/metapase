import { BargainRequest, BargainResponse, DataSource, DealClient, ProximityPingPayload, ProximityResponse, SettleRequest, SettleResponse } from '../types/metapase';
import { demoClient } from './demoBackend';
import { timeoutSignal } from './device';
import { authorizePayment, forgetPasskey } from './metaPay';
import type { JsonResult } from './metaPay';
import { demoActivity, demoAnalytics, demoCreateAgent, demoGetAgent, demoInventory, demoMerchants, demoRecordSale, demoRedeem, demoTransactions, demoUpdateStock } from './demoStore';

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

export interface ApiInstallmentScheduleItem {
  month: number;
  dueDate: string;
  amountZAR: number;
  status: 'PAID' | 'PENDING';
  paidAt?: string;
}

export interface ApiInstallmentPlan {
  planId: string;
  userId: string;
  storeId: string;
  storeName: string;
  mallName: string;
  sku: string;
  itemName: string;
  totalPurchaseZAR: number;
  walletContributionZAR: number;
  financedAmountZAR: number;
  remainingBalanceZAR: number;
  monthlyInstallmentZAR: number;
  termMonths: 12;
  monthsPaid: number;
  aprPercent: 0;
  status: 'ACTIVE' | 'PAID_OFF';
  voucherCode: string;
  startDate: string;
  nextDueDate: string;
  schedule: ApiInstallmentScheduleItem[];
  createdAt: number;
  updatedAt: number;
}

export interface ApiCreditSummary {
  ok: boolean;
  userId: string;
  creditLimitZAR: number;
  totalFinancedZAR: number;
  remainingDebtZAR: number;
  availableCreditZAR: number;
  activePlansCount: number;
  plans: ApiInstallmentPlan[];
}

export interface ApiUserSession {
  userId: string;
  userName?: string;
  email?: string;
  agentId?: string;
  agentName?: string;
  agentCreditBalanceZAR?: number;
  currentIntent: string;
  maxBudgetZAR: number;
  activeMallId?: string;
  deviceProfile?: string;
  parkedItems?: Array<{
    id: string;
    storeId: string;
    campaignId: string;
    sku: string;
    itemName: string;
    outletName: string;
    category: string;
    priceZAR: number;
    reason?: string;
    parkedAt: number;
  }>;
  bagItems?: Array<{
    id: string;
    storeId: string;
    campaignId: string;
    sku: string;
    itemName: string;
    outletName: string;
    category: string;
    priceZAR: number;
    addedAt: number;
  }>;
  matches?: Array<{
    storeId: string;
    campaignId: string;
    sku: string;
    itemName: string;
    outletName: string;
    status: string;
    negotiatedPriceZAR?: number | null;
  }>;
  updatedAt?: number;
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
  financing?: {
    isFinanced: boolean;
    planId: string;
    walletUsedZAR: number;
    financedAmountZAR: number;
    monthlyInstallmentZAR: number;
    termMonths: 12;
  };
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

const liveApi = {
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
  },

  // Point of Sale Auto-Financing & 12-Month Installment Plans
  getCreditPlans: (userId = 'user_shopper_01') =>
    getJson<ApiCreditSummary>(`/api/user/credit-plans?userId=${encodeURIComponent(userId)}`),
  payInstallment: (planId: string) =>
    postJson<{ ok: boolean; message: string; plan: ApiInstallmentPlan }>(`/api/user/credit-plans/${planId}/pay`, {}),

  // User & Agent Shopping Sessions
  getUserSession: (userId = 'user_shopper_01') =>
    getJson<{ ok: boolean; session: ApiUserSession }>(`/api/user/session?userId=${encodeURIComponent(userId)}`),
  saveUserSession: (session: ApiUserSession) =>
    postJson<{ success: boolean; session: ApiUserSession }>('/api/user/session', session),
  getUserSessions: () =>
    getJson<{ ok: boolean; count: number; sessions: ApiUserSession[] }>('/api/user/sessions')
};

// ==========================================
// DEMO FALLBACK
// ==========================================
// With the Node server and MongoDB running, the app uses them. If they are not reachable (a hosted preview, a
// judge's phone, an offline laptop) the same calls are answered by the in-browser store, so every screen still works.

export type ApiSource = 'live' | 'demo';
let lastSource: ApiSource = 'live';

/** Where the most recent merchant-data call was answered: the real backend, or the in-browser demo store. */
export const getApiSource = (): ApiSource => lastSource;

const answered = <T>(source: ApiSource, value: T): T => {
  lastSource = source;
  return value;
};

const viaLive = async <T>(live: () => Promise<T | null>, demo: () => T): Promise<T> => {
  const result = await live().catch(() => null);
  return result !== null && result !== undefined ? answered('live', result) : answered('demo', demo());
};

const viaLivePost = async <T>(live: () => Promise<JsonResult<T>>, demo: () => JsonResult<T>): Promise<JsonResult<T>> => {
  try {
    return answered('live', await live());
  } catch {
    return answered('demo', demo());
  }
};

const okResult = <T>(data: T): JsonResult<T> => ({ ok: true, status: 200, data });

const demoUserId = (userId?: string): string => userId ?? 'user_shopper_01';

export const api = {
  ...liveApi,

  getMerchants: () =>
    viaLive(liveApi.getMerchants, () => {
      const merchants = demoMerchants();
      return { ok: true, count: merchants.length, merchants };
    }),
  getStoreInventory: (storeId?: string) =>
    viaLive(
      () => liveApi.getStoreInventory(storeId),
      () => {
        const inventory = demoInventory(storeId);
        return { ok: true, count: inventory.length, inventory, storeId };
      }
    ),
  getMerchantAnalytics: (storeId: string) => viaLive(() => liveApi.getMerchantAnalytics(storeId), () => ({ ok: true, analytics: demoAnalytics(storeId) })),
  getMerchantTransactions: (storeId: string) =>
    viaLive(
      () => liveApi.getMerchantTransactions(storeId),
      () => {
        const transactions = demoTransactions({ storeId });
        return { storeId, count: transactions.length, transactions };
      }
    ),
  getTransactions: (filters?: { userId?: string; storeId?: string }) =>
    viaLive(
      () => liveApi.getTransactions(filters),
      () => {
        const transactions = demoTransactions(filters);
        return { count: transactions.length, transactions };
      }
    ),
  getActivityLog: (filters?: { storeId?: string; userId?: string; type?: string; limit?: number }) =>
    viaLive(
      () => liveApi.getActivityLog(filters),
      () => {
        const activities = demoActivity(filters);
        return { count: activities.length, activities };
      }
    ),
  getCreditPlans: (userId?: string) =>
    viaLive(
      () => liveApi.getCreditPlans(userId),
      () => ({ ok: true, userId: demoUserId(userId), creditLimitZAR: 5000, totalFinancedZAR: 0, remainingDebtZAR: 0, availableCreditZAR: 5000, activePlansCount: 0, plans: [] })
    ),

  updateProductStock: (storeId: string, sku: string, stockQuantity: number) =>
    viaLivePost(
      () => liveApi.updateProductStock(storeId, sku, stockQuantity),
      () => {
        const item = demoUpdateStock(storeId, sku, stockQuantity);
        return item ? okResult({ success: true, item }) : { ok: false, status: 404, data: null };
      }
    ),
  redeemVoucher: (voucherCode: string) =>
    viaLivePost(
      () => liveApi.redeemVoucher(voucherCode),
      () => {
        const result = demoRedeem(voucherCode);
        return result ? { ok: result.success, status: result.success ? 200 : 409, data: result } : { ok: false, status: 404, data: null };
      }
    ),

  /** Buys at the store's promotion price. Throws when the item is sold out (demo store) so the caller can say so. */
  manualBuy: (payload: { storeId: string; sku: string; priceZAR?: number; paymentMethod?: string; userId?: string }) =>
    viaLivePost(
      () => liveApi.manualBuy(payload),
      () => okResult({ success: true, mode: 'manual', receipt: demoRecordSale({ storeId: payload.storeId, sku: payload.sku, priceZAR: payload.priceZAR ?? 0, purchasedBy: 'manual_user_checkout', userId: payload.userId }) })
    ),
  autonomousBuy: (payload: { storeId: string; sku: string; maxBudgetZAR: number; userId?: string; virtualCard?: { cardId?: string; last4?: string } }) =>
    viaLivePost(
      () => liveApi.autonomousBuy(payload),
      () => {
        const floor = demoInventory(payload.storeId).find(item => item.sku === payload.sku)?.floorPriceZAR ?? 0;
        if (payload.maxBudgetZAR < floor) throw new Error(`The store won’t go below R${floor}, which is above your R${payload.maxBudgetZAR} budget.`);
        const receipt = demoRecordSale({ storeId: payload.storeId, sku: payload.sku, priceZAR: floor, purchasedBy: 'autonomous_personal_agent', userId: payload.userId });
        return okResult({ success: true, mode: 'autonomous', receipt, agreedPriceZAR: receipt.amountZAR, roundsCompleted: 3 });
      }
    ),

  getUserAgent: (userId?: string) =>
    viaLive(
      () => liveApi.getUserAgent(userId),
      () => demoGetAgent(demoUserId(userId)) ?? { userId: demoUserId(userId), agentId: `agent_${demoUserId(userId)}`, agentName: 'Personal Muse Agent', creditBalanceZAR: 1000, promoApplied: true, activeWishlistCount: 0 }
    ),

  /** One-click agent creation. The server stores the agent in MongoDB; with no server the browser keeps it. */
  createUserAgent: async (input: { userId: string; agentName: string; userName?: string }): Promise<{ agent: ApiUserAgent; source: ApiSource }> => {
    try {
      const response = await postJson<ApiUserAgent>('/api/user/agent/create', input);
      if (response.ok && response.data) return { agent: response.data, source: answered('live', 'live') };
    } catch {
      /* no server: fall through to the in-browser store */
    }
    return { agent: demoCreateAgent({ userId: input.userId, agentName: input.agentName }), source: answered('demo', 'demo') };
  },

  getUserSession: (userId?: string) =>
    viaLive(
      () => liveApi.getUserSession(userId),
      () => ({
        ok: true,
        session: {
          userId: demoUserId(userId),
          currentIntent: 'any',
          maxBudgetZAR: 1500,
          parkedItems: [],
          bagItems: [],
          matches: []
        }
      })
    ),
  saveUserSession: (session: ApiUserSession) =>
    viaLivePost(
      () => liveApi.saveUserSession(session),
      () => okResult({ success: true, session })
    )
};
