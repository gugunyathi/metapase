import { MongoClient, Db, Collection } from 'mongodb';
import { MALLS_DATABASE } from '../src/config/malls.js';
import { REAL_PRODUCTS } from '../src/config/products.js';

/**
 * Metapase Database Layer
 * Connects to MongoDB Atlas when MONGODB_URI is provided in .env,
 * with a high-performance in-memory fallback for local/offline testing.
 */

export interface DbUser {
  userId: string;
  userName: string;
  email: string;
  createdAt: number;
  updatedAt: number;
}

export interface DbPasskey {
  credentialId: string;
  userId: string;
  publicKeySpki: string;
  algorithm: number;
  createdAt: number;
}

export interface DbPersonalAgent {
  agentId: string;
  userId: string;
  agentName: string;
  creditBalanceZAR: number;
  promoCode: string;
  delegationScope: string[];
  createdAt: number;
  updatedAt: number;
}

export interface DbWishlistItem {
  id: string;
  userId: string;
  query: string;
  category?: string;
  targetMaxPriceZAR: number;
  autoBuy: boolean;
  addedAt: number;
  status: 'active' | 'bought' | 'parked';
  matchedItemName?: string;
  matchedPriceZAR?: number;
  matchedStoreName?: string;
  voucherCode?: string;
}

export interface DbTransactionReceipt {
  receiptId: string;
  voucherCode: string;
  userId?: string;
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
}

export interface DbNegotiationSession {
  sessionId: string;
  storeId: string;
  campaignId: string;
  sku: string;
  lastCounterZAR: number;
  rounds: number;
  transactionToken?: string;
  updatedAt: number;
}

export interface DbMerchantStore {
  storeId: string;
  storeName: string;
  category: string;
  mallId: string;
  mallName: string;
  maxDiscountPercent: number;
  floorRatio: number;
  inventoryCount: number;
  isActive: boolean;
  updatedAt: number;
}

export interface DbProductInventory {
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

export interface DbActivityLog {
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

// In-Memory Database Store
class InMemoryDb {
  public users = new Map<string, DbUser>();
  public passkeys = new Map<string, DbPasskey>();
  public agents = new Map<string, DbPersonalAgent>();
  public wishlists = new Map<string, DbWishlistItem>();
  public transactions = new Map<string, DbTransactionReceipt>();
  public negotiations = new Map<string, DbNegotiationSession>();
  public stores = new Map<string, DbMerchantStore>();
  public inventory = new Map<string, DbProductInventory>();
  public activities: DbActivityLog[] = [];

  constructor() {
    // Seed default human user and agent with R1,000 credit
    const defaultUser: DbUser = {
      userId: 'user_shopper_01',
      userName: 'Gugu Nyathi',
      email: 'gugu@metapase.app',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    this.users.set(defaultUser.userId, defaultUser);

    const defaultAgent: DbPersonalAgent = {
      agentId: 'agent_personal_shopper_01',
      userId: defaultUser.userId,
      agentName: "Gugu's Personal Muse Agent",
      creditBalanceZAR: 1000,
      promoCode: 'WELCOME-R1000-ACTIVE',
      delegationScope: ['browse', 'bargain', 'transact'],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    this.agents.set(defaultAgent.agentId, defaultAgent);

    // Seed initial wishlist
    const wish1: DbWishlistItem = {
      id: 'wish_seed_01',
      userId: defaultUser.userId,
      query: 'Linen Blazer',
      targetMaxPriceZAR: 1100,
      autoBuy: true,
      addedAt: Date.now(),
      status: 'active'
    };
    const wish2: DbWishlistItem = {
      id: 'wish_seed_02',
      userId: defaultUser.userId,
      query: 'Nike Pegasus',
      targetMaxPriceZAR: 2200,
      autoBuy: true,
      addedAt: Date.now(),
      status: 'active'
    };
    this.wishlists.set(wish1.id, wish1);
    this.wishlists.set(wish2.id, wish2);

    // Seed initial demo transaction receipts
    const tx1: DbTransactionReceipt = {
      receiptId: 'rcpt_seed_01',
      voucherCode: 'MP-VOUCHER-ZA-BLZ-9912-A1',
      userId: defaultUser.userId,
      storeId: 'sc_zara',
      storeName: 'Zara Sandton',
      mallId: 'sandton_city',
      mallName: 'Sandton City',
      sku: 'ZA-BLZ-9912',
      itemName: 'Tailored Relaxed Linen Blazer',
      amountZAR: 1013,
      savingsZAR: 286,
      purchasedBy: 'autonomous_personal_agent',
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      authorizationRef: 'AUTH_ZARA_AUTO_9912',
      qrPayload: 'https://metapase.vercel.app/redeem/MP-VOUCHER-ZA-BLZ-9912-A1',
      status: 'ISSUED'
    };
    const tx2: DbTransactionReceipt = {
      receiptId: 'rcpt_seed_02',
      voucherCode: 'MP-VOUCHER-NK-PEG-0041-M2',
      userId: defaultUser.userId,
      storeId: 'fw_nike',
      storeName: 'Nike Fourways',
      mallId: 'fourways_mall',
      mallName: 'Fourways Mall',
      sku: 'NK-PEG-0041',
      itemName: 'Nike Air Zoom Pegasus 41',
      amountZAR: 1999,
      savingsZAR: 400,
      purchasedBy: 'manual_user_checkout',
      timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
      authorizationRef: 'AUTH_NIKE_MAN_41',
      qrPayload: 'https://metapase.vercel.app/redeem/MP-VOUCHER-NK-PEG-0041-M2',
      status: 'REDEEMED'
    };
    this.transactions.set(tx1.voucherCode, tx1);
    this.transactions.set(tx2.voucherCode, tx2);

    // Seed activity logs
    this.activities.push(
      {
        activityId: 'act_init_01',
        timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
        type: 'MANUAL_PURCHASE',
        actor: 'USER',
        userId: defaultUser.userId,
        storeId: 'fw_nike',
        storeName: 'Nike Fourways',
        mallId: 'fourways_mall',
        summary: 'Gugu Nyathi purchased Nike Air Zoom Pegasus 41 for R1,999 (Saved R400)',
        details: { voucherCode: tx2.voucherCode, sku: 'NK-PEG-0041', amountZAR: 1999 }
      },
      {
        activityId: 'act_init_02',
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        type: 'AUTONOMOUS_PURCHASE',
        actor: 'PERSONAL_AGENT',
        userId: defaultUser.userId,
        storeId: 'sc_zara',
        storeName: 'Zara Sandton',
        mallId: 'sandton_city',
        summary: 'Personal Muse Agent negotiated Tailored Relaxed Linen Blazer down to R1,013 and auto-purchased',
        details: { voucherCode: tx1.voucherCode, sku: 'ZA-BLZ-9912', amountZAR: 1013, promoCreditUsed: true }
      },
      {
        activityId: 'act_init_03',
        timestamp: new Date().toISOString(),
        type: 'CREDIT_ADJUSTMENT',
        actor: 'SYSTEM',
        userId: defaultUser.userId,
        summary: 'Welcome Promo R1,000 Credit active on Personal Shopping Agent',
        details: { promoCode: 'WELCOME-R1000-ACTIVE', balanceZAR: 1000 }
      }
    );

    // Seed all 31 stores
    for (const mall of MALLS_DATABASE) {
      for (const store of mall.stores) {
        this.stores.set(store.id, {
          storeId: store.id,
          storeName: store.name,
          category: store.category,
          mallId: mall.id,
          mallName: mall.shortName,
          maxDiscountPercent: 22,
          floorRatio: 0.78,
          inventoryCount: 35,
          isActive: true,
          updatedAt: Date.now()
        });
      }
    }
    const legacyStores = [
      { id: 'zara', name: 'Zara Fashion', mallId: 'sandton_city', mallName: 'Sandton City', category: 'apparel' },
      { id: 'woolworths', name: 'Woolworths Food', mallId: 'bel_air', mallName: 'Bel Air Shopping Centre', category: 'groceries' },
      { id: 'nike', name: 'Nike Performance', mallId: 'fourways_mall', mallName: 'Fourways Mall', category: 'footwear' },
      { id: 'dischem', name: 'Dis-Chem Pharmacy', mallId: 'fourways_mall', mallName: 'Fourways Mall', category: 'beauty' },
      { id: 'istore', name: 'iStore Apple Reseller', mallId: 'sandton_city', mallName: 'Sandton City', category: 'electronics' }
    ];
    for (const s of legacyStores) {
      if (!this.stores.has(s.id)) {
        this.stores.set(s.id, {
          storeId: s.id,
          storeName: s.name,
          category: s.category,
          mallId: s.mallId,
          mallName: s.mallName,
          maxDiscountPercent: 20,
          floorRatio: 0.80,
          inventoryCount: 25,
          isActive: true,
          updatedAt: Date.now()
        });
      }
    }

    // Seed inventory from REAL_PRODUCTS
    for (const p of REAL_PRODUCTS) {
      const mall = MALLS_DATABASE.find(m => m.id === p.mallId);
      const floorRatio = p.floorRatio ?? 0.80;
      const basePriceZAR = p.stickerPriceZAR;
      const floorPriceZAR = Math.round(basePriceZAR * floorRatio);

      this.inventory.set(p.sku, {
        productId: p.id,
        storeId: p.storeId,
        storeName: p.storeName,
        mallId: p.mallId,
        mallName: mall?.shortName ?? p.mallId,
        sku: p.sku,
        name: p.itemName,
        category: p.category,
        basePriceZAR,
        floorPriceZAR,
        stockQuantity: 28,
        inStock: true,
        imageUrl: p.imageUrl,
        description: p.description,
        tag: p.tag,
        updatedAt: Date.now()
      });
    }
  }
}

export const inMemoryDb = new InMemoryDb();

let mongoClient: MongoClient | null = null;
let mongoDb: Db | null = null;
let isConnected = false;

export async function initDatabase(): Promise<{ mode: 'mongodb' | 'in_memory'; dbName?: string }> {
  const uri = process.env.MONGODB_URI;

  if (uri && !uri.includes('<username>') && !uri.includes('xxxxxxx') && uri.startsWith('mongodb')) {
    try {
      console.log('[Database] Connecting to MongoDB Atlas...');
      mongoClient = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
      await mongoClient.connect();
      mongoDb = mongoClient.db('metapase');
      isConnected = true;
      console.log('[Database] Connected successfully to MongoDB Atlas (database: metapase)');

      // Create indexes
      await mongoDb.collection('users').createIndex({ userId: 1 }, { unique: true });
      await mongoDb.collection('passkeys').createIndex({ credentialId: 1 }, { unique: true });
      await mongoDb.collection('agents').createIndex({ agentId: 1 }, { unique: true });
      await mongoDb.collection('wishlists').createIndex({ id: 1 }, { unique: true });
      await mongoDb.collection('transactions').createIndex({ voucherCode: 1 }, { unique: true });
      await mongoDb.collection('transactions').createIndex({ storeId: 1 });
      await mongoDb.collection('transactions').createIndex({ userId: 1 });
      await mongoDb.collection('stores').createIndex({ storeId: 1 }, { unique: true });
      await mongoDb.collection('inventory').createIndex({ sku: 1 }, { unique: true });
      await mongoDb.collection('inventory').createIndex({ storeId: 1 });
      await mongoDb.collection('activities').createIndex({ timestamp: -1 });

      // Seed stores and inventory if empty
      const storeCount = await mongoDb.collection('stores').countDocuments();
      if (storeCount === 0) {
        const storeDocs = Array.from(inMemoryDb.stores.values());
        if (storeDocs.length > 0) {
          await mongoDb.collection('stores').insertMany(storeDocs);
        }
      }

      const invCount = await mongoDb.collection('inventory').countDocuments();
      if (invCount === 0) {
        const invDocs = Array.from(inMemoryDb.inventory.values());
        if (invDocs.length > 0) {
          await mongoDb.collection('inventory').insertMany(invDocs);
        }
      }

      return { mode: 'mongodb', dbName: 'metapase' };
    } catch (err) {
      console.warn('[Database] MongoDB connection attempt failed, switching to in-memory store:', err);
      isConnected = false;
    }
  } else {
    console.log('[Database] No live MongoDB URI configured. Running on in-memory persistence store.');
  }

  return { mode: 'in_memory' };
}

export function isDbConnected(): boolean {
  return isConnected;
}

// -------------------------------------------------------------
// Database Access Layer (Unified API for MongoDB and In-Memory)
// -------------------------------------------------------------

export const db = {
  // USERS
  users: {
    async findById(userId: string): Promise<DbUser | null> {
      if (isConnected && mongoDb) {
        return (await mongoDb.collection('users').findOne({ userId })) as DbUser | null;
      }
      return inMemoryDb.users.get(userId) ?? null;
    },
    async upsert(user: DbUser): Promise<DbUser> {
      user.updatedAt = Date.now();
      if (isConnected && mongoDb) {
        await mongoDb.collection('users').updateOne({ userId: user.userId }, { $set: user }, { upsert: true });
      }
      inMemoryDb.users.set(user.userId, user);
      return user;
    }
  },

  // PASSKEYS
  passkeys: {
    async findById(credentialId: string): Promise<DbPasskey | null> {
      if (isConnected && mongoDb) {
        return (await mongoDb.collection('passkeys').findOne({ credentialId })) as DbPasskey | null;
      }
      return inMemoryDb.passkeys.get(credentialId) ?? null;
    },
    async save(passkey: DbPasskey): Promise<DbPasskey> {
      if (isConnected && mongoDb) {
        await mongoDb.collection('passkeys').updateOne({ credentialId: passkey.credentialId }, { $set: passkey }, { upsert: true });
      }
      inMemoryDb.passkeys.set(passkey.credentialId, passkey);
      return passkey;
    }
  },

  // PERSONAL AGENTS & R1,000 PROMO CREDIT
  agents: {
    async findByUserId(userId: string): Promise<DbPersonalAgent | null> {
      if (isConnected && mongoDb) {
        return (await mongoDb.collection('agents').findOne({ userId })) as DbPersonalAgent | null;
      }
      return Array.from(inMemoryDb.agents.values()).find(a => a.userId === userId) ?? null;
    },
    async upsert(agent: DbPersonalAgent): Promise<DbPersonalAgent> {
      agent.updatedAt = Date.now();
      if (isConnected && mongoDb) {
        await mongoDb.collection('agents').updateOne({ agentId: agent.agentId }, { $set: agent }, { upsert: true });
      }
      inMemoryDb.agents.set(agent.agentId, agent);
      return agent;
    },
    async deductCredit(agentId: string, amountZAR: number): Promise<number> {
      const agent = inMemoryDb.agents.get(agentId) ?? (isConnected && mongoDb ? ((await mongoDb.collection('agents').findOne({ agentId })) as DbPersonalAgent | null) : null);
      if (!agent) throw new Error(`Agent ${agentId} not found.`);

      const newBalance = Math.max(0, agent.creditBalanceZAR - amountZAR);
      agent.creditBalanceZAR = newBalance;
      agent.updatedAt = Date.now();

      if (isConnected && mongoDb) {
        await mongoDb.collection('agents').updateOne({ agentId }, { $set: { creditBalanceZAR: newBalance, updatedAt: Date.now() } });
      }
      inMemoryDb.agents.set(agentId, agent);
      return newBalance;
    }
  },

  // SHOPPING WISHLISTS
  wishlists: {
    async listByUser(userId: string): Promise<DbWishlistItem[]> {
      if (isConnected && mongoDb) {
        return (await mongoDb.collection('wishlists').find({ userId }).toArray()) as DbWishlistItem[];
      }
      return Array.from(inMemoryDb.wishlists.values()).filter(w => w.userId === userId);
    },
    async add(item: DbWishlistItem): Promise<DbWishlistItem> {
      if (isConnected && mongoDb) {
        await mongoDb.collection('wishlists').insertOne(item);
      }
      inMemoryDb.wishlists.set(item.id, item);
      return item;
    },
    async remove(id: string): Promise<boolean> {
      if (isConnected && mongoDb) {
        await mongoDb.collection('wishlists').deleteOne({ id });
      }
      return inMemoryDb.wishlists.delete(id);
    },
    async update(id: string, updates: Partial<DbWishlistItem>): Promise<DbWishlistItem | null> {
      const item = inMemoryDb.wishlists.get(id);
      if (!item) return null;
      const updated = { ...item, ...updates };
      if (isConnected && mongoDb) {
        await mongoDb.collection('wishlists').updateOne({ id }, { $set: updates });
      }
      inMemoryDb.wishlists.set(id, updated);
      return updated;
    }
  },

  // MERCHANT STORES (All 31 Stores)
  stores: {
    async list(): Promise<DbMerchantStore[]> {
      if (isConnected && mongoDb) {
        return (await mongoDb.collection('stores').find({}).toArray()) as DbMerchantStore[];
      }
      return Array.from(inMemoryDb.stores.values());
    },
    async findByStoreId(storeId: string): Promise<DbMerchantStore | null> {
      if (isConnected && mongoDb) {
        return (await mongoDb.collection('stores').findOne({ storeId })) as DbMerchantStore | null;
      }
      return inMemoryDb.stores.get(storeId) ?? Array.from(inMemoryDb.stores.values()).find(s => s.storeId.endsWith(storeId) || storeId.endsWith(s.storeId)) ?? null;
    },
    async upsert(store: DbMerchantStore): Promise<DbMerchantStore> {
      store.updatedAt = Date.now();
      if (isConnected && mongoDb) {
        await mongoDb.collection('stores').updateOne({ storeId: store.storeId }, { $set: store }, { upsert: true });
      }
      inMemoryDb.stores.set(store.storeId, store);
      return store;
    }
  },

  // INVENTORY & PRODUCTS (All Stores)
  inventory: {
    async listAll(): Promise<DbProductInventory[]> {
      if (isConnected && mongoDb) {
        return (await mongoDb.collection('inventory').find({}).toArray()) as DbProductInventory[];
      }
      return Array.from(inMemoryDb.inventory.values());
    },
    async listByStore(storeId: string): Promise<DbProductInventory[]> {
      if (isConnected && mongoDb) {
        return (await mongoDb.collection('inventory').find({
          $or: [{ storeId }, { storeId: { $regex: `${storeId}$` } }]
        }).toArray()) as DbProductInventory[];
      }
      return Array.from(inMemoryDb.inventory.values()).filter(p => p.storeId === storeId || p.storeId.endsWith(storeId) || storeId.endsWith(p.storeId));
    },
    async findBySku(sku: string): Promise<DbProductInventory | null> {
      if (isConnected && mongoDb) {
        return (await mongoDb.collection('inventory').findOne({ sku })) as DbProductInventory | null;
      }
      return inMemoryDb.inventory.get(sku) ?? null;
    },
    async updateStock(sku: string, newQuantity: number): Promise<DbProductInventory | null> {
      const item = inMemoryDb.inventory.get(sku);
      if (!item) return null;
      item.stockQuantity = Math.max(0, newQuantity);
      item.inStock = item.stockQuantity > 0;
      item.updatedAt = Date.now();

      if (isConnected && mongoDb) {
        await mongoDb.collection('inventory').updateOne(
          { sku },
          { $set: { stockQuantity: item.stockQuantity, inStock: item.inStock, updatedAt: item.updatedAt } }
        );
      }
      inMemoryDb.inventory.set(sku, item);
      return item;
    },
    async decrementStock(sku: string, count = 1): Promise<DbProductInventory | null> {
      const item = inMemoryDb.inventory.get(sku);
      if (!item) return null;
      item.stockQuantity = Math.max(0, item.stockQuantity - count);
      item.inStock = item.stockQuantity > 0;
      item.updatedAt = Date.now();

      if (isConnected && mongoDb) {
        await mongoDb.collection('inventory').updateOne(
          { sku },
          { $set: { stockQuantity: item.stockQuantity, inStock: item.inStock, updatedAt: item.updatedAt } }
        );
      }
      inMemoryDb.inventory.set(sku, item);
      return item;
    }
  },

  // TRANSACTIONS & RECEIPTS (Users & Merchants)
  transactions: {
    async list(): Promise<DbTransactionReceipt[]> {
      if (isConnected && mongoDb) {
        return (await mongoDb.collection('transactions').find({}).sort({ timestamp: -1 }).toArray()) as DbTransactionReceipt[];
      }
      return Array.from(inMemoryDb.transactions.values()).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    },
    async listByUser(userId: string): Promise<DbTransactionReceipt[]> {
      if (isConnected && mongoDb) {
        return (await mongoDb.collection('transactions').find({ userId }).sort({ timestamp: -1 }).toArray()) as DbTransactionReceipt[];
      }
      return Array.from(inMemoryDb.transactions.values())
        .filter(t => t.userId === userId)
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    },
    async listByStore(storeId: string): Promise<DbTransactionReceipt[]> {
      if (isConnected && mongoDb) {
        return (await mongoDb.collection('transactions').find({
          $or: [{ storeId }, { storeId: { $regex: `${storeId}$` } }]
        }).sort({ timestamp: -1 }).toArray()) as DbTransactionReceipt[];
      }
      return Array.from(inMemoryDb.transactions.values())
        .filter(t => t.storeId === storeId || t.storeId.endsWith(storeId) || storeId.endsWith(t.storeId))
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    },
    async findByVoucherCode(voucherCode: string): Promise<DbTransactionReceipt | null> {
      if (isConnected && mongoDb) {
        return (await mongoDb.collection('transactions').findOne({ voucherCode })) as DbTransactionReceipt | null;
      }
      return inMemoryDb.transactions.get(voucherCode) ?? null;
    },
    async save(receipt: DbTransactionReceipt): Promise<DbTransactionReceipt> {
      if (isConnected && mongoDb) {
        await mongoDb.collection('transactions').updateOne({ voucherCode: receipt.voucherCode }, { $set: receipt }, { upsert: true });
      }
      inMemoryDb.transactions.set(receipt.voucherCode, receipt);
      return receipt;
    },
    async getMerchantAnalytics(storeId: string) {
      const txs = await this.listByStore(storeId);
      const totalSalesCount = txs.length;
      const grossRevenueZAR = txs.reduce((acc, t) => acc + (t.amountZAR || 0), 0);
      const totalSavingsZAR = txs.reduce((acc, t) => acc + (t.savingsZAR || 0), 0);
      const autonomousSalesCount = txs.filter(t => t.purchasedBy === 'autonomous_personal_agent').length;
      const manualSalesCount = txs.filter(t => t.purchasedBy === 'manual_user_checkout').length;
      const redeemedCount = txs.filter(t => t.status === 'REDEEMED').length;
      const pendingRedemptionCount = txs.filter(t => t.status === 'ISSUED').length;

      return {
        storeId,
        totalSalesCount,
        grossRevenueZAR,
        totalSavingsZAR,
        autonomousSalesCount,
        manualSalesCount,
        redeemedCount,
        pendingRedemptionCount
      };
    }
  },

  // ACTIVITY AUDIT LOGS (Real-time system events)
  activities: {
    async log(activity: Omit<DbActivityLog, 'activityId' | 'timestamp'> & { activityId?: string; timestamp?: string }): Promise<DbActivityLog> {
      const entry: DbActivityLog = {
        activityId: activity.activityId || `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        timestamp: activity.timestamp || new Date().toISOString(),
        type: activity.type,
        actor: activity.actor,
        userId: activity.userId,
        storeId: activity.storeId,
        storeName: activity.storeName,
        mallId: activity.mallId,
        summary: activity.summary,
        details: activity.details
      };

      if (isConnected && mongoDb) {
        await mongoDb.collection('activities').insertOne(entry);
      }
      inMemoryDb.activities.unshift(entry);
      if (inMemoryDb.activities.length > 500) {
        inMemoryDb.activities.pop();
      }
      return entry;
    },
    async list(filters?: { limit?: number; storeId?: string; userId?: string; type?: string }): Promise<DbActivityLog[]> {
      const limit = filters?.limit ?? 50;
      if (isConnected && mongoDb) {
        const query: Record<string, unknown> = {};
        if (filters?.storeId) query.storeId = filters.storeId;
        if (filters?.userId) query.userId = filters.userId;
        if (filters?.type) query.type = filters.type;
        return (await mongoDb.collection('activities').find(query).sort({ timestamp: -1 }).limit(limit).toArray()) as DbActivityLog[];
      }
      return inMemoryDb.activities
        .filter(a => {
          if (filters?.storeId && a.storeId !== filters.storeId && !a.storeId?.endsWith(filters.storeId)) return false;
          if (filters?.userId && a.userId !== filters.userId) return false;
          if (filters?.type && a.type !== filters.type) return false;
          return true;
        })
        .slice(0, limit);
    }
  }
};
