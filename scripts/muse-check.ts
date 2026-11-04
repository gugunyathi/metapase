import { museChat, museMerchantCounter, museParseIntent, museStatus, readMuseConfig } from '../server/muse.js';

// Run with: npm run muse:check   (reads MODEL_API_KEY, MUSE_API_BASE, MUSE_MODEL from .env)
try {
  process.loadEnvFile('.env');
} catch {
  /* no .env file */
}

const config = readMuseConfig();
if (!config) {
  console.error('MODEL_API_KEY is not set. Copy .env.example to .env and paste your key.');
  process.exit(1);
}
console.log(`Endpoint: ${config.baseUrl}/chat/completions`);
console.log(`Model:    ${config.model}`);

const started = Date.now();
try {
  const answer = await museChat('Reply with exactly the word: ready', 'ping', { config, temperature: 0.2 });
  console.log(`1. Connection OK in ${Date.now() - started} ms. Muse said: ${JSON.stringify(answer.trim().slice(0, 80))}`);
} catch (error) {
  console.error(`1. Connection FAILED: ${error instanceof Error ? error.message : error}`);
  console.error('   Check MODEL_API_KEY, MUSE_API_BASE and MUSE_MODEL against the Meta developer console.');
  process.exit(2);
}

const counter = await museMerchantCounter({ storeName: 'Zara', itemName: 'Linen Blazer', stickerZAR: 1299, floorZAR: 1013, offerZAR: 974, lastCounterZAR: 1299, round: 1, maxRounds: 5, stock: 40 }, config);
console.log(`2. Store agent counter: R${counter.counterZAR} via ${counter.engine}: "${counter.message}"`);
const wish = await museParseIntent('a smart blazer for a wedding under R1500, buy it automatically', config);
console.log(`3. Wish parsing via ${wish.engine}: ${JSON.stringify(wish)}`);
const status = museStatus(config);
console.log(`Result: ${status.state}. ${status.fallbacks} of ${status.calls + status.fallbacks} steps fell back to the rules.`);
process.exit(status.fallbacks > 0 ? 3 : 0);
