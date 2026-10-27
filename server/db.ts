import { MongoClient, Db, Collection } from 'mongodb';

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

// In-Memory Database Store
class InMemoryDb {
  public users = new Map<string, DbUser>();
  public passkeys = new Map<string, DbPasskey>();
  public agents = new Map<string, DbPersonalAgent>();
  public wishlists = new Map<string, DbWishlistItem>();
  public transactions = new Map<string, DbTransactionReceipt>();
  public negotiations = new Map<string, DbNegotiationSession>();

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

  // TRANSACTIONS & RECEIPTS
  transactions: {
    async list(): Promise<DbTransactionReceipt[]> {
      if (isConnected && mongoDb) {
        return (await mongoDb.collection('transactions').find({}).sort({ timestamp: -1 }).toArray()) as DbTransactionReceipt[];
      }
      return Array.from(inMemoryDb.transactions.values()).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
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
    }
  }
};
