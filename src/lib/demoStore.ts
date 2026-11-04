import { MALLS_DATABASE } from '../config/malls';
import { REAL_PRODUCTS } from '../config/products';
import type { ApiActivityLog, ApiMerchant, ApiMerchantAnalytics, ApiProductInventory, ApiTransactionReceipt, ApiUserAgent } from './api';

/**
 * A complete merchant backend that runs in the browser: stock for every product in every store, checkout that
 * really decrements that stock, receipts with redeemable vouchers, per-store analytics and an audit trail.
 * It is what makes the app fully demoable with no server and no database. When the Node server and MongoDB are
 * reachable, the app uses those instead and this store is not touched.
 */

const STORAGE_KEY = 'metapase:demo-store:v1';
const ACTIVITY_LIMIT = 200;

interface DemoState {
  stock: Record<string, number>;
  receipts: ApiTransactionReceipt[];
  activity: ApiActivityLog[];
  agents: Record<string, ApiUserAgent>;
}

export class OutOfStockError extends Error {
  constructor(itemName: string, storeName: string) {
    super(`${itemName} is sold out at ${storeName}.`);
  }
}

const hash = (text: string): number => {
  let value = 0;
  for (let index = 0; index < text.length; index++) value = (value * 31 + text.charCodeAt(index)) >>> 0;
  return value;
};

/** Stock is seeded from the SKU so every device starts with the same shelves. A few lines are low, to show alerts. */
const seedStock = (): Record<string, number> => {
  const stock: Record<string, number> = {};
  for (const product of REAL_PRODUCTS) {
    const base = 4 + (hash(product.sku) % 11);
    stock[product.sku] = hash(`${product.sku}:low`) % 7 === 0 ? 2 : base;
  }
  return stock;
};

const fresh = (): DemoState => ({ stock: seedStock(), receipts: [], activity: [], agents: {} });

let state: DemoState = fresh();

const load = (): void => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Partial<DemoState>;
    const seeded = seedStock();
    state = {
      stock: { ...seeded, ...(parsed.stock ?? {}) },
      receipts: Array.isArray(parsed.receipts) ? parsed.receipts : [],
      activity: Array.isArray(parsed.activity) ? parsed.activity : [],
      agents: parsed.agents && typeof parsed.agents === 'object' ? parsed.agents : {}
    };
  } catch {
    state = fresh();
  }
};

const save = (): void => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable: the demo keeps working for this session */
  }
};

load();

const randomCode = (length: number): string => Array.from({ length }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');

const mallOf = (mallId: string): { id: string; name: string } => {
  const mall = MALLS_DATABASE.find(item => item.id === mallId);
  return { id: mallId, name: mall?.shortName ?? mallId };
};

const log = (entry: Omit<ApiActivityLog, 'activityId' | 'timestamp'>): void => {
  state.activity = [{ activityId: `act_${Date.now().toString(36)}${randomCode(3)}`, timestamp: new Date().toISOString(), ...entry }, ...state.activity].slice(0, ACTIVITY_LIMIT);
};

const toInventory = (product: (typeof REAL_PRODUCTS)[number]): ApiProductInventory => {
  const stock = state.stock[product.sku] ?? 0;
  return {
    productId: product.id,
    storeId: product.storeId,
    storeName: product.storeName,
    mallId: product.mallId,
    mallName: mallOf(product.mallId).name,
    sku: product.sku,
    name: product.itemName,
    category: product.category,
    basePriceZAR: product.stickerPriceZAR,
    floorPriceZAR: Math.round(product.stickerPriceZAR * product.floorRatio),
    stockQuantity: stock,
    inStock: stock > 0,
    imageUrl: product.imageUrl,
    description: product.description,
    tag: product.tag,
    updatedAt: Date.now()
  };
};

// ---------------------------------------------------------------------------
// Merchants and inventory
// ---------------------------------------------------------------------------

export const demoMerchants = (): ApiMerchant[] =>
  MALLS_DATABASE.flatMap(mall =>
    mall.stores.map(store => {
      const products = REAL_PRODUCTS.filter(product => product.storeId === store.id);
      return {
        storeId: store.id,
        storeName: store.name,
        category: store.category,
        mallId: mall.id,
        mallName: mall.shortName,
        protocolSupport: ['Meta-Merchant-1.0', 'MCP', 'Muse Spark negotiation'],
        maxDiscountPercent: products.length ? Math.round(Math.max(...products.map(product => (1 - product.floorRatio) * 100))) : 20,
        inventoryCount: products.reduce((total, product) => total + (state.stock[product.sku] ?? 0), 0),
        featuredCatalog: products.slice(0, 4).map(product => ({ id: product.id, name: product.itemName, category: product.category, basePriceZAR: product.stickerPriceZAR, stock: state.stock[product.sku] ?? 0 }))
      };
    })
  );

export const demoInventory = (storeId?: string): ApiProductInventory[] =>
  REAL_PRODUCTS.filter(product => !storeId || product.storeId === storeId).map(toInventory);

export const demoStockOf = (sku: string): number => state.stock[sku] ?? 0;

export const demoUpdateStock = (storeId: string, sku: string, quantity: number): ApiProductInventory | null => {
  const product = REAL_PRODUCTS.find(item => item.sku === sku && item.storeId === storeId);
  if (!product) return null;
  const next = Math.max(0, Math.min(9999, Math.round(quantity)));
  state.stock[sku] = next;
  log({ type: 'INVENTORY_UPDATED', actor: 'MERCHANT_AGENT', storeId, storeName: product.storeName, mallId: product.mallId, summary: `${product.storeName} set ${product.itemName} stock to ${next}.`, details: { sku, stockQuantity: next } });
  save();
  return toInventory(product);
};

// ---------------------------------------------------------------------------
// Checkout, receipts, redemption
// ---------------------------------------------------------------------------

export interface SaleInput {
  storeId?: string;
  sku: string;
  priceZAR: number;
  purchasedBy: ApiTransactionReceipt['purchasedBy'];
  userId?: string;
}

/** Sells one unit: checks stock, takes it off the shelf, and issues a receipt with a voucher the shopper shows in store. */
export const demoRecordSale = (input: SaleInput): ApiTransactionReceipt => {
  const product = REAL_PRODUCTS.find(item => item.sku === input.sku && (!input.storeId || item.storeId === input.storeId)) ?? REAL_PRODUCTS.find(item => item.sku === input.sku);
  if (!product) throw new Error(`Product ${input.sku} was not found.`);
  if ((state.stock[product.sku] ?? 0) <= 0) throw new OutOfStockError(product.itemName, product.storeName);
  const floor = Math.round(product.stickerPriceZAR * product.floorRatio);
  const price = Math.max(floor, Math.min(product.stickerPriceZAR, Math.round(input.priceZAR)));
  state.stock[product.sku] -= 1;
  const voucherCode = `MP-${product.storeId.toUpperCase()}-${randomCode(4)}`;
  const mall = mallOf(product.mallId);
  const receipt: ApiTransactionReceipt = {
    receiptId: `REC-${input.purchasedBy === 'autonomous_personal_agent' ? 'AUTO' : 'MAN'}-${randomCode(6)}`,
    voucherCode,
    storeId: product.storeId,
    storeName: product.storeName,
    mallId: mall.id,
    mallName: mall.name,
    sku: product.sku,
    itemName: product.itemName,
    amountZAR: price,
    savingsZAR: Math.max(0, product.stickerPriceZAR - price),
    purchasedBy: input.purchasedBy,
    timestamp: new Date().toISOString(),
    authorizationRef: `AUTH-DEMO-${randomCode(6)}`,
    qrPayload: `metapase://voucher?code=${voucherCode}&store=${product.storeId}&amount=${price}`,
    status: 'ISSUED',
    userId: input.userId
  };
  state.receipts = [receipt, ...state.receipts];
  log({
    type: input.purchasedBy === 'autonomous_personal_agent' ? 'AUTONOMOUS_PURCHASE' : 'MANUAL_PURCHASE',
    actor: input.purchasedBy === 'autonomous_personal_agent' ? 'PERSONAL_AGENT' : 'USER',
    userId: input.userId,
    storeId: product.storeId,
    storeName: product.storeName,
    mallId: product.mallId,
    summary: `${product.itemName} sold at ${product.storeName} for R${price}. ${state.stock[product.sku]} left in stock.`,
    details: { sku: product.sku, amountZAR: price, voucherCode }
  });
  save();
  return receipt;
};

export const demoRedeem = (voucherCode: string): { success: boolean; message: string; receipt: ApiTransactionReceipt } | null => {
  const receipt = state.receipts.find(item => item.voucherCode === voucherCode);
  if (!receipt) return null;
  if (receipt.status === 'REDEEMED') return { success: false, message: 'This voucher has already been redeemed.', receipt };
  receipt.status = 'REDEEMED';
  log({ type: 'VOUCHER_REDEEMED', actor: 'MERCHANT_AGENT', storeId: receipt.storeId, storeName: receipt.storeName, mallId: receipt.mallId, summary: `${receipt.storeName} redeemed voucher ${voucherCode}.`, details: { voucherCode } });
  save();
  return { success: true, message: `Voucher ${voucherCode} redeemed.`, receipt };
};

export const demoTransactions = (filters?: { storeId?: string; userId?: string }): ApiTransactionReceipt[] =>
  state.receipts.filter(receipt => (!filters?.storeId || receipt.storeId === filters.storeId) && (!filters?.userId || receipt.userId === filters.userId));

export const demoAnalytics = (storeId: string): ApiMerchantAnalytics => {
  const sales = state.receipts.filter(receipt => receipt.storeId === storeId);
  return {
    storeId,
    totalSalesCount: sales.length,
    grossRevenueZAR: sales.reduce((total, receipt) => total + receipt.amountZAR, 0),
    totalSavingsZAR: sales.reduce((total, receipt) => total + receipt.savingsZAR, 0),
    autonomousSalesCount: sales.filter(receipt => receipt.purchasedBy === 'autonomous_personal_agent').length,
    manualSalesCount: sales.filter(receipt => receipt.purchasedBy === 'manual_user_checkout').length,
    redeemedCount: sales.filter(receipt => receipt.status === 'REDEEMED').length,
    pendingRedemptionCount: sales.filter(receipt => receipt.status === 'ISSUED').length
  };
};

export const demoActivity = (filters?: { storeId?: string; userId?: string; type?: string; limit?: number }): ApiActivityLog[] =>
  state.activity
    .filter(entry => (!filters?.storeId || entry.storeId === filters.storeId) && (!filters?.userId || entry.userId === filters.userId) && (!filters?.type || entry.type === filters.type))
    .slice(0, filters?.limit ?? 50);

// ---------------------------------------------------------------------------
// Shopper agents
// ---------------------------------------------------------------------------

export const demoGetAgent = (userId: string): ApiUserAgent | null => state.agents[userId] ?? null;

export const demoCreateAgent = (input: { userId: string; agentName: string }): ApiUserAgent => {
  const agent: ApiUserAgent = { userId: input.userId, agentId: `agent_${input.userId}`, agentName: input.agentName, creditBalanceZAR: 1000, promoApplied: true, activeWishlistCount: 0 };
  state.agents[input.userId] = agent;
  log({ type: 'CREDIT_ADJUSTMENT', actor: 'SYSTEM', userId: input.userId, summary: `${input.agentName} was created with R1000 welcome credit.`, details: { creditZAR: 1000 } });
  save();
  return agent;
};

/** Puts every shelf back to its starting stock and clears sales. Used by "Reset demo". */
export const demoReset = (): void => {
  state = fresh();
  save();
};
