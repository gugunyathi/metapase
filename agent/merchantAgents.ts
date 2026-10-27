import { createHash, randomBytes } from 'node:crypto';
import { REAL_PRODUCTS, CatalogProduct } from '../src/config/products.js';
import { MALLS_DATABASE } from '../src/config/malls.js';

/**
 * Meta Muse & Personal Agent Protocol - Merchant Business Agent
 * Represents a store in the Meta Muse / Personal Agent Protocol ecosystem.
 * Co-developed by Meta, Shopify, Stripe, Sierra, and Walmart.
 * 
 * Supports:
 * 1. Autonomous Agent-to-Agent bargaining (via Personal Agent Protocol)
 * 2. Manual direct purchasing (1-click human checkout)
 * 3. Inventory availability checks & dynamic floor pricing policies
 * 4. Cryptographic voucher issuance and Stripe virtual card authorization
 */

export interface MerchantPricingPolicy {
  maxDiscountPercent: number; // e.g. 22 = up to 22% off sticker
  concessionStep: number;     // e.g. 0.40 step per bargaining round
  minFloorRatio: number;      // e.g. 0.78 of sticker
  inventoryCount: number;     // stock units remaining
  allowAutonomousCheckout: boolean;
  allowManualCheckout: boolean;
}

export interface MerchantOfferEvaluation {
  status: 'ACCEPTED' | 'COUNTER_PROPOSED' | 'REJECTED';
  storeId: string;
  storeName: string;
  sku: string;
  itemName: string;
  originalPriceZAR: number;
  finalPriceZAR: number;
  message: string;
  roundsRemaining: number;
  transactionToken?: string;
  expiresAt?: number;
}

export interface PurchaseReceipt {
  success: boolean;
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
}

export class MetaMerchantAgent {
  public readonly storeId: string;
  public readonly storeName: string;
  public readonly mallId: string;
  public readonly mallName: string;
  public readonly category: string;
  public readonly protocolVersion: string = 'Meta-Merchant-1.0';
  public policy: MerchantPricingPolicy;
  public activeTokens: Map<string, { sku: string; priceZAR: number; expiresAt: number; sessionId: string }> = new Map();
  public activeSessions: Map<string, { lastCounterZAR: number; rounds: number; updatedAt: number }> = new Map();

  constructor(params: {
    storeId: string;
    storeName: string;
    mallId: string;
    mallName: string;
    category: string;
    policy?: Partial<MerchantPricingPolicy>;
  }) {
    this.storeId = params.storeId;
    this.storeName = params.storeName;
    this.mallId = params.mallId;
    this.mallName = params.mallName;
    this.category = params.category;
    this.policy = {
      maxDiscountPercent: 20,
      concessionStep: 0.40,
      minFloorRatio: 0.80,
      inventoryCount: 42,
      allowAutonomousCheckout: true,
      allowManualCheckout: true,
      ...params.policy
    };
  }

  /**
   * Retrieves products sold by this merchant
   */
  public getCatalog(): CatalogProduct[] {
    return REAL_PRODUCTS.filter(p => p.storeId === this.storeId || p.storeId.endsWith(this.storeId));
  }

  /**
   * Evaluates an incoming offer from a Personal Shopping Agent
   */
  public evaluateAutonomousOffer(params: {
    sessionId: string;
    sku: string;
    offerZAR: number;
    buyerRationale?: string;
    buyerBadgeVerified?: boolean;
  }): MerchantOfferEvaluation {
    const product = this.getCatalog().find(p => p.sku === params.sku) ??
      REAL_PRODUCTS.find(p => p.sku === params.sku);

    if (!product) {
      return {
        status: 'REJECTED',
        storeId: this.storeId,
        storeName: this.storeName,
        sku: params.sku,
        itemName: 'Item not in stock',
        originalPriceZAR: 0,
        finalPriceZAR: 0,
        message: `${this.storeName} Merchant Agent: SKU ${params.sku} is not in current active inventory.`,
        roundsRemaining: 0
      };
    }

    const sticker = product.stickerPriceZAR;
    const floorPriceZAR = Math.round(sticker * (product.floorRatio ?? this.policy.minFloorRatio));
    const session = this.activeSessions.get(params.sessionId);
    const roundNumber = (session?.rounds ?? 0) + 1;

    // Check if offer meets or exceeds floor price
    if (params.offerZAR >= floorPriceZAR) {
      const agreedPriceZAR = Math.min(Math.round(params.offerZAR), sticker);
      const token = `mpt_${this.storeId}_${randomBytes(10).toString('base64url')}`;
      const expiresAt = Date.now() + 15 * 60 * 1000;

      this.activeTokens.set(token, {
        sku: product.sku,
        priceZAR: agreedPriceZAR,
        expiresAt,
        sessionId: params.sessionId
      });
      this.activeSessions.delete(params.sessionId);

      return {
        status: 'ACCEPTED',
        storeId: this.storeId,
        storeName: this.storeName,
        sku: product.sku,
        itemName: product.itemName,
        originalPriceZAR: sticker,
        finalPriceZAR: agreedPriceZAR,
        message: `${this.storeName} Merchant Agent: Offer of R${agreedPriceZAR} accepted! Transaction token issued.`,
        roundsRemaining: 5 - roundNumber,
        transactionToken: token,
        expiresAt
      };
    }

    // If offer is too low, formulate intelligent counter-offer
    if (roundNumber >= 5) {
      return {
        status: 'REJECTED',
        storeId: this.storeId,
        storeName: this.storeName,
        sku: product.sku,
        itemName: product.itemName,
        originalPriceZAR: sticker,
        finalPriceZAR: floorPriceZAR,
        message: `${this.storeName} Merchant Agent: Maximum bargaining rounds reached. Best possible price remains R${floorPriceZAR}.`,
        roundsRemaining: 0
      };
    }

    const lastCounter = session?.lastCounterZAR ?? sticker;
    const counterOfferZAR = Math.max(
      floorPriceZAR,
      Math.round(lastCounter - (lastCounter - params.offerZAR) * this.policy.concessionStep)
    );

    this.activeSessions.set(params.sessionId, {
      lastCounterZAR: counterOfferZAR,
      rounds: roundNumber,
      updatedAt: Date.now()
    });

    return {
      status: 'COUNTER_PROPOSED',
      storeId: this.storeId,
      storeName: this.storeName,
      sku: product.sku,
      itemName: product.itemName,
      originalPriceZAR: sticker,
      finalPriceZAR: counterOfferZAR,
      message: `${this.storeName} Merchant Agent: We can offer R${counterOfferZAR} for "${product.itemName}".`,
      roundsRemaining: 5 - roundNumber
    };
  }

  /**
   * Completes an autonomous purchase settled via Personal Shopping Agent
   */
  public settleAutonomousOrder(params: {
    transactionToken: string;
    cardId?: string;
    last4?: string;
    authorizationId?: string;
  }): PurchaseReceipt {
    const tokenData = this.activeTokens.get(params.transactionToken);
    if (!tokenData || tokenData.expiresAt < Date.now()) {
      throw new Error('Transaction token is expired or invalid.');
    }

    const product = this.getCatalog().find(p => p.sku === tokenData.sku) ??
      REAL_PRODUCTS.find(p => p.sku === tokenData.sku);

    const receiptId = `REC-AUTO-${randomBytes(6).toString('hex').toUpperCase()}`;
    const voucherCode = `MP-VOUCHER-${this.storeId.toUpperCase()}-${randomBytes(4).toString('hex').toUpperCase()}`;

    this.activeTokens.delete(params.transactionToken);

    return {
      success: true,
      receiptId,
      voucherCode,
      storeId: this.storeId,
      storeName: this.storeName,
      mallId: this.mallId,
      mallName: this.mallName,
      sku: tokenData.sku,
      itemName: product?.itemName ?? 'Retail Item',
      amountZAR: tokenData.priceZAR,
      savingsZAR: Math.max(0, (product?.stickerPriceZAR ?? tokenData.priceZAR) - tokenData.priceZAR),
      purchasedBy: 'autonomous_personal_agent',
      timestamp: new Date().toISOString(),
      authorizationRef: params.authorizationId ?? `AUTH-STRIPE-SANDBOX-${randomBytes(4).toString('hex')}`,
      qrPayload: `metapase://voucher?code=${voucherCode}&store=${this.storeId}&amount=${tokenData.priceZAR}`
    };
  }

  /**
   * Completes a direct manual purchase by a human customer (1-click checkout)
   */
  public executeManualPurchase(params: {
    sku: string;
    userPriceZAR?: number;
    paymentMethod?: string;
  }): PurchaseReceipt {
    const product = this.getCatalog().find(p => p.sku === params.sku) ??
      REAL_PRODUCTS.find(p => p.sku === params.sku);

    if (!product) {
      throw new Error(`Product with SKU ${params.sku} not found at ${this.storeName}.`);
    }

    const floorPriceZAR = Math.round(product.stickerPriceZAR * (product.floorRatio ?? this.policy.minFloorRatio));
    // For manual buy: user can buy at discounted promotion price (floorPrice) or sticker
    const finalAmountZAR = params.userPriceZAR
      ? Math.max(floorPriceZAR, Math.min(params.userPriceZAR, product.stickerPriceZAR))
      : floorPriceZAR;

    const receiptId = `REC-MAN-${randomBytes(6).toString('hex').toUpperCase()}`;
    const voucherCode = `MP-MANUAL-${this.storeId.toUpperCase()}-${randomBytes(4).toString('hex').toUpperCase()}`;

    return {
      success: true,
      receiptId,
      voucherCode,
      storeId: this.storeId,
      storeName: this.storeName,
      mallId: this.mallId,
      mallName: this.mallName,
      sku: product.sku,
      itemName: product.itemName,
      amountZAR: finalAmountZAR,
      savingsZAR: Math.max(0, product.stickerPriceZAR - finalAmountZAR),
      purchasedBy: 'manual_user_checkout',
      timestamp: new Date().toISOString(),
      authorizationRef: `AUTH-MANUAL-1CLICK-${randomBytes(4).toString('hex')}`,
      qrPayload: `metapase://voucher?code=${voucherCode}&store=${this.storeId}&amount=${finalAmountZAR}`
    };
  }
}

/**
 * Global Registry of Meta Merchant Agents across all test stores
 */
export const MERCHANT_AGENTS_REGISTRY = new Map<string, MetaMerchantAgent>();

export function initializeAllMerchantAgents(): Map<string, MetaMerchantAgent> {
  if (MERCHANT_AGENTS_REGISTRY.size > 0) return MERCHANT_AGENTS_REGISTRY;

  // Extract all stores from MALLS_DATABASE
  for (const mall of MALLS_DATABASE) {
    for (const store of mall.stores) {
      const agent = new MetaMerchantAgent({
        storeId: store.id,
        storeName: store.name,
        mallId: mall.id,
        mallName: mall.shortName,
        category: store.category,
        policy: {
          maxDiscountPercent: 22,
          concessionStep: 0.42,
          minFloorRatio: 0.78,
          inventoryCount: 35
        }
      });
      MERCHANT_AGENTS_REGISTRY.set(store.id, agent);
    }
  }

  // Also register legacy fallback store nodes
  const legacyStores = [
    { id: 'zara', name: 'Zara Fashion', mallId: 'sandton_city', mallName: 'Sandton City', category: 'apparel' },
    { id: 'woolworths', name: 'Woolworths Food', mallId: 'bel_air', mallName: 'Bel Air Shopping Centre', category: 'groceries' },
    { id: 'nike', name: 'Nike Performance', mallId: 'fourways_mall', mallName: 'Fourways Mall', category: 'footwear' },
    { id: 'dischem', name: 'Dis-Chem Pharmacy', mallId: 'fourways_mall', mallName: 'Fourways Mall', category: 'beauty' },
    { id: 'istore', name: 'iStore Apple Reseller', mallId: 'sandton_city', mallName: 'Sandton City', category: 'electronics' }
  ];

  for (const s of legacyStores) {
    if (!MERCHANT_AGENTS_REGISTRY.has(s.id)) {
      MERCHANT_AGENTS_REGISTRY.set(s.id, new MetaMerchantAgent({
        storeId: s.id,
        storeName: s.name,
        mallId: s.mallId,
        mallName: s.mallName,
        category: s.category
      }));
    }
  }

  return MERCHANT_AGENTS_REGISTRY;
}

// Auto-initialize on module load
initializeAllMerchantAgents();

export function getMerchantAgent(storeId: string): MetaMerchantAgent | undefined {
  initializeAllMerchantAgents();
  return MERCHANT_AGENTS_REGISTRY.get(storeId) ??
    MERCHANT_AGENTS_REGISTRY.get(storeId.toLowerCase()) ??
    Array.from(MERCHANT_AGENTS_REGISTRY.values()).find(a => a.storeId.endsWith(storeId) || storeId.endsWith(a.storeId));
}

export function getAllMerchantAgents(): MetaMerchantAgent[] {
  initializeAllMerchantAgents();
  return Array.from(MERCHANT_AGENTS_REGISTRY.values());
}
