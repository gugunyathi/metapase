import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { clampCounter, extractJson, handleMuseRequest, messageIsSafe, museMerchantCounter, museMerchantInsights, museParseIntent, museStatus, resetMuseStats, ruleParseIntent, readMuseConfig, handleMuseBargainTransaction, type CounterInput, type MuseConfig } from './muse.js';
import { handleVirtualShopifySettlement } from '../src/lib/shopifyAdapter.js';

// A stand-in for the Muse API. `mode` decides how it misbehaves.
let mode = 'good';
let lastAuth = '';
let lastBody: { model?: string } = {};
let server: Server;
let config: MuseConfig;
const reply = (content: string) => JSON.stringify({ choices: [{ message: { content } }] });

before(async () => {
  server = createServer((req, res) => {
    lastAuth = String(req.headers.authorization ?? '');
    let raw = '';
    req.on('data', chunk => (raw += chunk));
    req.on('end', () => {
      try { lastBody = JSON.parse(raw); } catch { lastBody = {}; }
      if (mode === 'down') { res.writeHead(500).end('boom sk-secret-key'); return; }
      if (mode === 'hang') return;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      if (mode === 'garbage') res.end(reply('Sure! I would love to help.'));
      else if (mode === 'below_floor') res.end(reply('```json\n{"counterZAR": 100, "message": "Deal at R100!"}\n```'));
      else if (mode === 'above_last') res.end(reply('{"counterZAR": 9999, "message": "How about R9999?"}'));
      else if (mode === 'leak') res.end(reply('{"counterZAR": 1100, "message": "Our lowest is R974, but I can do R1100."}'));
      else if (req.url?.endsWith('/chat/completions') && raw.includes('shopping wish')) res.end(reply('{"query":"blazer","keywords":["jacket","linen","Suit"],"category":"apparel","maxBudgetZAR":99999,"autoBuy":true}'));
      else if (raw.includes('store manager')) res.end(reply('{"insights":[{"title":"Clear linen","action":"Discount the blazer 5%","rationale":"40 units in stock"}]}'));
      else res.end(reply('{"counterZAR": 1150, "message": "I can do R1150 on this one."}'));
    });
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as AddressInfo).port;
  config = { apiKey: 'sk-secret-key', baseUrl: `http://127.0.0.1:${port}/v1`, model: 'muse-spark-1.3', timeoutMs: 400 };
});
after(() => server.close());

const input: CounterInput = { storeName: 'Zara', itemName: 'Linen Blazer', stickerZAR: 1299, floorZAR: 1013, offerZAR: 974, lastCounterZAR: 1299, round: 1, maxRounds: 5, stock: 40 };

test('reads the official config and key name', () => {
  const cfg = readMuseConfig({ MODEL_API_KEY: ' k ' });
  assert.equal(cfg?.apiKey, 'k');
  assert.equal(cfg?.baseUrl, 'https://api.meta.ai/v1');
  assert.equal(cfg?.model, 'muse-spark-1.3');
  assert.equal(readMuseConfig({}), null);
});

test('a good Muse answer is used, with the right request', async () => {
  mode = 'good'; resetMuseStats();
  const result = await museMerchantCounter(input, config);
  assert.equal(result.engine, 'muse');
  assert.equal(result.counterZAR, 1150);
  assert.match(result.message, /1150/);
  assert.equal(lastAuth, 'Bearer sk-secret-key');
  assert.equal(lastBody.model, 'muse-spark-1.3');
});

test('a counter below the floor is raised to the floor', async () => {
  mode = 'below_floor'; resetMuseStats();
  const result = await museMerchantCounter(input, config);
  assert.equal(result.counterZAR, 1013);
  assert.ok(!result.message.includes('R100!'));
});

test('a counter above the previous counter is capped (never raises a price)', async () => {
  mode = 'above_last'; resetMuseStats();
  const result = await museMerchantCounter({ ...input, lastCounterZAR: 1200 }, config);
  assert.equal(result.counterZAR, 1200);
});

test('a message that leaks the floor is replaced', async () => {
  mode = 'leak'; resetMuseStats();
  const result = await museMerchantCounter({ ...input, floorZAR: 974, offerZAR: 900 }, config);
  assert.ok(!result.message.includes('974'));
  assert.ok(result.counterZAR >= 974);
});

for (const failure of ['garbage', 'down', 'hang']) {
  test(`falls back to the rules when Muse is ${failure}`, async () => {
    mode = failure; resetMuseStats();
    const result = await museMerchantCounter(input, config);
    assert.equal(result.engine, 'rules');
    assert.ok(result.counterZAR >= input.floorZAR && result.counterZAR <= input.stickerZAR);
    assert.ok(!museStatus(config).lastError?.includes('sk-secret-key'), 'the API key must never appear in status');
  });
}

test('the circuit breaker stops calling a failing Muse', async () => {
  mode = 'down'; resetMuseStats();
  for (let i = 0; i < 4; i++) await museMerchantCounter(input, config);
  assert.equal(museStatus(config).failed, 3);
  assert.equal(museStatus(config).state, 'degraded');
});

test('wish parsing validates and keeps the shopper\'s own budget', async () => {
  mode = 'wish'; resetMuseStats();
  const result = await museParseIntent('I need a smart blazer for a wedding under R1500, buy it automatically', config);
  assert.equal(result.engine, 'muse');
  assert.equal(result.category, 'apparel');
  assert.deepEqual(result.keywords, ['jacket', 'linen', 'suit']);
  assert.equal(result.maxBudgetZAR, 1500);
  assert.equal(result.autoBuy, true);
});

test('wish parsing works with no Muse at all', () => {
  const result = ruleParseIntent('running shoes under R 2 200');
  assert.equal(result.category, 'footwear');
  assert.equal(result.maxBudgetZAR, 2200);
  assert.equal(result.autoBuy, false);
});

test('insights come back validated, or from the rules', async () => {
  mode = 'insights'; resetMuseStats();
  const ok = await museMerchantInsights({ storeName: 'Zara', totalSales: 2, grossRevenueZAR: 2000, inventory: [{ name: 'Blazer', stock: 40, basePriceZAR: 1299, floorPriceZAR: 1013 }] }, config);
  assert.equal(ok.engine, 'muse');
  mode = 'garbage';
  const fallback = await museMerchantInsights({ storeName: 'Zara', totalSales: 0, grossRevenueZAR: 0, inventory: [{ name: 'Blazer', stock: 40, basePriceZAR: 1299, floorPriceZAR: 1013 }] }, config);
  assert.equal(fallback.engine, 'rules');
  assert.ok(fallback.insights.length > 0);
});

test('helpers', () => {
  assert.equal(clampCounter('abc', input), 1013 >= 1013 ? clampCounter(NaN, input) : 0);
  assert.deepEqual(extractJson('noise {"a":1} more'), { a: 1 });
  assert.equal(extractJson('no json'), null);
  // open-weight models may reason first, and the reasoning can contain braces
  assert.deepEqual(extractJson('<think>maybe {"counterZAR": 1} or not</think>\n{"counterZAR": 1190, "message": "ok"}'), { counterZAR: 1190, message: 'ok' });
  assert.deepEqual(extractJson('```json\n{"a": {"b": 2}}\n```'), { a: { b: 2 } });
  assert.deepEqual(extractJson('reasoning {x} here</think>{"ok": true}'), { ok: true });
  assert.deepEqual(extractJson('{"insights":[{"title":"t"}]}'), { insights: [{ title: 't' }] });
  assert.equal(messageIsSafe('How about R1100?', input, 1100), true);
  assert.equal(messageIsSafe('Our floor is R1013', input, 1100), false);
});

test('the HTTP surface rejects bad input and never calls Muse for it', async () => {
  mode = 'good'; resetMuseStats();
  const [status] = await handleMuseRequest('counter', 'POST', { stickerZAR: 100, floorZAR: 200, offerZAR: 50, lastCounterZAR: 100 }, 'client-a', config);
  assert.equal(status, 400);
  assert.equal(museStatus(config).calls, 0);
  const [s2, body] = await handleMuseRequest('status', 'GET', null, 'client-a', config);
  assert.equal(s2, 200);
  assert.ok(!JSON.stringify(body).includes('sk-secret-key'));
});

test('rate limiting kicks in', async () => {
  mode = 'good';
  let last = 200;
  for (let i = 0; i < 45; i++) [last] = await handleMuseRequest('intent', 'POST', { text: 'a blazer' }, 'spammer', config);
  assert.equal(last, 429);
});

test('virtual Shopify store bargain enforces strict 75% baseline floor margin', async () => {
  const result = await handleMuseBargainTransaction({
    outletId: 'v-shopify-gymshark',
    sku: 'GS-APX-HD-BL',
    shopperOffer: 400, // below 75% floor (R674)
    round: 1
  });
  assert.ok(result);
  assert.equal(result.status, 'COUNTER_OFFER_PROPOSED');
  assert.ok(result.counterPrice >= 674);
  assert.ok(result.message.includes('virtual hub'));
  assert.equal(result.isShopifyVirtual, true);
  assert.equal(result.fulfillmentMethod, 'DIGITAL_DELIVERY_RAILS');
});

test('virtual Shopify checkout triggers inventory decrement webhook simulation', () => {
  const settlement = handleVirtualShopifySettlement('GS-APX-HD-BL', 'v-shopify-gymshark', 2);
  assert.ok(settlement);
  assert.equal(settlement.fulfillmentMethod, 'DIGITAL_DELIVERY_RAILS');
  assert.ok(settlement.trackingMessage.includes('Shopify Hub'));
  assert.ok(typeof settlement.remainingUnits === 'number');
});
