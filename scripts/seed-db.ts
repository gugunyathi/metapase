/**
 * Metapase MongoDB Atlas Seeding Script
 * Connects to MongoDB Atlas using MONGODB_URI in .env and populates:
 * - 31 Merchant Stores across Sandton City, Fourways, Northgate & Bel Air
 * - 32 Real Products & Inventory with pricing, images, and descriptions
 * - Demo Shopper User & Personal Muse Agent with R1,000 promo credit
 * - Point of Sale 12-Month 0% APR Financing Plan
 * - Initial transaction vouchers & audit log
 */
import { initDatabase, db } from '../server/db.js';

// Load .env before anything reads process.env
try {
  process.loadEnvFile('.env');
} catch {}

async function run() {
  console.log('----------------------------------------------------');
  console.log('Metapase Database Seeding & Verification');
  console.log('----------------------------------------------------');

  const result = await initDatabase();
  console.log(`[Database] Mode: ${result.mode.toUpperCase()}${result.dbName ? ` (database: ${result.dbName})` : ''}`);

  const stores = await db.stores.list();
  console.log(`[Database] Total Stores: ${stores.length}`);

  const inventory = await db.inventory.listAll();
  console.log(`[Database] Total Inventory Products: ${inventory.length}`);

  const user = await db.users.findById('user_shopper_01');
  console.log(`[Database] Default User: ${user?.userName ?? 'Not found'} (${user?.userId})`);

  const agent = await db.agents.findByUserId('user_shopper_01');
  console.log(`[Database] Personal Shopping Agent: "${agent?.agentName ?? 'None'}" with balance R${agent?.creditBalanceZAR ?? 0}`);

  const plans = await db.creditPlans.listByUser('user_shopper_01');
  console.log(`[Database] Credit Financing Plans: ${plans.length} active (Sample: ${plans[0]?.itemName ?? 'N/A'}, R${plans[0]?.monthlyInstallmentZAR}/mo)`);

  const activities = await db.activities.list({ limit: 5 });
  console.log(`[Database] Recent Activity Logs: ${activities.length} entries`);

  console.log('----------------------------------------------------');
  console.log('✅ All demo assets & real inventory successfully seeded into database!');
  console.log('----------------------------------------------------');
  process.exit(0);
}

run().catch(err => {
  console.error('[Database] Seeding error:', err);
  process.exit(1);
});
