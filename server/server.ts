import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { createHash, createPublicKey, randomBytes, verify as verifySignature } from 'node:crypto';

type Category = 'apparel' | 'footwear' | 'groceries' | 'electronics' | 'beauty';

interface BLEBeacon { uuid: string; rssi: number; txPower?: number; }
interface WiFiNode { bssid: string; rssi: number; }

interface ProximityPayload {
  deviceId: string;
  timestamp: string;
  telemetry: { ble: BLEBeacon[]; wifi?: WiFiNode[]; gps?: { lat: number; lng: number; accuracyM: number } | null };
  positioning?: { mode?: string; estimatedDistanceM?: number; matchRadiusM?: number; proximityZone?: string };
  userContext: { currentIntent: string; maxBudgetZAR: number };
}

interface AdCampaign {
  campaignId: string;
  mallId: string;
  mallName: string;
  outletId: string;
  outletName: string;
  category: Category;
  sku: string;
  itemName: string;
  stickerPriceZAR: number;
  floorPriceZAR: number;
  imageUrl?: string;
}

interface BargainPayload { sessionId: string; campaignId: string; agentOfferZAR: number; rationale: string; }

interface AuthPayload {
  mechanism: string;
  signature: string;
  credentialId?: string;
  clientDataJSON?: string;
  authenticatorData?: string;
}

interface SettlePayload { transactionToken: string; authPayload: AuthPayload; }

interface RegisterPayload { challenge: string; credentialId: string; publicKeySpki: string; algorithm: number; clientDataJSON: string; }

const PORT = Number(process.env.PORT ?? 3000);
const MATCH_RADIUS_M = Number(process.env.METAPASE_MATCH_RADIUS_M ?? 50);
const MEASURED_POWER_DBM = -59;
const PATH_LOSS_EXPONENT = 2.5;
const RP_ID = process.env.METAPASE_RP_ID ?? 'localhost';
const ALLOWED_ORIGINS = new Set(
  (process.env.METAPASE_ALLOWED_ORIGINS ?? 'http://localhost:5173,https://localhost:5173,http://127.0.0.1:5173,http://localhost:4173')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)
);
const ALLOW_SANDBOX_PAY = process.env.METAPASE_ALLOW_SANDBOX_PAY !== 'false';
const TOKEN_TTL_MS = 10 * 60 * 1000;
const CHALLENGE_TTL_MS = 2 * 60 * 1000;
const SESSION_TTL_MS = 15 * 60 * 1000;
const MAX_BODY_BYTES = 64 * 1024;
const COUNTER_STEP = 0.4;
const SUPPORTED_ALGORITHMS = new Set([-7, -8, -257]);

const CAMPAIGNS: AdCampaign[] = [
  // Sandton City
  {
    campaignId: 'camp_sc_zara_01',
    mallId: 'sandton_city',
    mallName: 'Sandton City',
    outletId: 'sc_zara',
    outletName: 'Zara Sandton',
    category: 'apparel',
    sku: 'ZA-BLZ-9912',
    itemName: 'Tailored Relaxed Linen Blazer',
    stickerPriceZAR: 1299,
    floorPriceZAR: 1013,
    imageUrl: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&auto=format&fit=crop&q=80'
  },
  {
    campaignId: 'camp_sc_hoka_02',
    mallId: 'sandton_city',
    mallName: 'Sandton City',
    outletId: 'sc_hoka',
    outletName: 'HOKA Flagship',
    category: 'footwear',
    sku: 'HK-CLF-0009',
    itemName: 'HOKA Clifton 9 Road Running Shoes',
    stickerPriceZAR: 2999,
    floorPriceZAR: 2459,
    imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80'
  },
  {
    campaignId: 'camp_sc_wool_03',
    mallId: 'sandton_city',
    mallName: 'Sandton City',
    outletId: 'sc_woolworths',
    outletName: 'Woolworths Food & Home',
    category: 'groceries',
    sku: 'WW-ET-0500',
    itemName: 'Ethiopian Yirgacheffe Single-Origin Beans 500g',
    stickerPriceZAR: 199,
    floorPriceZAR: 167,
    imageUrl: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800&auto=format&fit=crop&q=80'
  },
  {
    campaignId: 'camp_sc_istore_04',
    mallId: 'sandton_city',
    mallName: 'Sandton City',
    outletId: 'sc_istore',
    outletName: 'iStore Sandton City',
    category: 'electronics',
    sku: 'AP-AIR-4ANC',
    itemName: 'Apple AirPods 4 with Active Noise Cancellation',
    stickerPriceZAR: 3999,
    floorPriceZAR: 3559,
    imageUrl: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=800&auto=format&fit=crop&q=80'
  },
  {
    campaignId: 'camp_sc_mcqueen_05',
    mallId: 'sandton_city',
    mallName: 'Sandton City',
    outletId: 'sc_alexander_mcqueen',
    outletName: 'Alexander McQueen',
    category: 'apparel',
    sku: 'AM-SNK-001',
    itemName: 'Alexander McQueen Oversized Leather Sneaker',
    stickerPriceZAR: 9850,
    floorPriceZAR: 8668,
    imageUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&auto=format&fit=crop&q=80'
  },

  // Fourways Mall
  {
    campaignId: 'camp_fw_zara_01',
    mallId: 'fourways_mall',
    mallName: 'Fourways Mall',
    outletId: 'fw_zara',
    outletName: 'Zara Fourways',
    category: 'apparel',
    sku: 'ZA-DNM-8820',
    itemName: 'Wide-Leg Selvedge Denim Trousers',
    stickerPriceZAR: 899,
    floorPriceZAR: 710,
    imageUrl: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800&auto=format&fit=crop&q=80'
  },
  {
    campaignId: 'camp_fw_nike_02',
    mallId: 'fourways_mall',
    mallName: 'Fourways Mall',
    outletId: 'fw_nike',
    outletName: 'Nike Live Fourways',
    category: 'footwear',
    sku: 'NK-PGS-4100',
    itemName: 'Nike Air Zoom Pegasus 41 Road Shoes',
    stickerPriceZAR: 2499,
    floorPriceZAR: 2049,
    imageUrl: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&auto=format&fit=crop&q=80'
  },
  {
    campaignId: 'camp_fw_checkers_03',
    mallId: 'fourways_mall',
    mallName: 'Fourways Mall',
    outletId: 'fw_checkers',
    outletName: 'Checkers Hyper Fourways',
    category: 'groceries',
    sku: 'CK-RIB-0800',
    itemName: 'Forage & Feast 28-Day Dry-Aged Ribeye Steak 500g',
    stickerPriceZAR: 219,
    floorPriceZAR: 186,
    imageUrl: 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?w=800&auto=format&fit=crop&q=80'
  },

  // Northgate Shopping Centre
  {
    campaignId: 'camp_ng_pnp_01',
    mallId: 'northgate',
    mallName: 'Northgate Shopping Centre',
    outletId: 'ng_picknpay',
    outletName: 'Pick n Pay Hyper Northgate',
    category: 'groceries',
    sku: 'PNP-SLM-0400',
    itemName: 'Fresh Norwegian Atlantic Salmon Portions 400g',
    stickerPriceZAR: 229,
    floorPriceZAR: 195,
    imageUrl: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&auto=format&fit=crop&q=80'
  },
  {
    campaignId: 'camp_ng_sportscene_02',
    mallId: 'northgate',
    mallName: 'Northgate Shopping Centre',
    outletId: 'ng_sportscene',
    outletName: 'Sportscene Northgate',
    category: 'footwear',
    sku: 'SS-AF1-007',
    itemName: 'Nike Air Force 1 \'07 Triple White',
    stickerPriceZAR: 2199,
    floorPriceZAR: 1825,
    imageUrl: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&auto=format&fit=crop&q=80'
  },

  // Bel Air Shopping Centre
  {
    campaignId: 'camp_ba_wool_01',
    mallId: 'bel_air',
    mallName: 'Bel Air Shopping Centre',
    outletId: 'ba_woolworths',
    outletName: 'Woolworths Food & Café',
    category: 'groceries',
    sku: 'WW-ROT-0120',
    itemName: 'Free-Range Herb Roasted Rotisserie Chicken',
    stickerPriceZAR: 159,
    floorPriceZAR: 139,
    imageUrl: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=800&auto=format&fit=crop&q=80'
  },
  {
    campaignId: 'camp_ba_uniq_02',
    mallId: 'bel_air',
    mallName: 'Bel Air Shopping Centre',
    outletId: 'ba_uniq',
    outletName: 'UNIQ Clothing by Checkers',
    category: 'apparel',
    sku: 'UQ-SHR-1002',
    itemName: 'UNIQ Pure French Linen Resort Shirt',
    stickerPriceZAR: 449,
    floorPriceZAR: 359,
    imageUrl: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&auto=format&fit=crop&q=80'
  },

  // Legacy fallback outlets
  {
    campaignId: 'camp_zara_01',
    mallId: 'sandton_city',
    mallName: 'Sandton City',
    outletId: 'zara',
    outletName: 'Zara Fashion',
    category: 'apparel',
    sku: 'ZARA-BLAZER-01',
    itemName: 'Tailored Linen Blazer',
    stickerPriceZAR: 650,
    floorPriceZAR: 490,
    imageUrl: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&auto=format&fit=crop&q=80'
  },
  {
    campaignId: 'camp_wool_02',
    mallId: 'bel_air',
    mallName: 'Bel Air Shopping Centre',
    outletId: 'woolworths',
    outletName: 'Woolworths Food',
    category: 'groceries',
    sku: 'WOOL-PLATTER-02',
    itemName: 'Artisan Sourdough Platter',
    stickerPriceZAR: 220,
    floorPriceZAR: 170,
    imageUrl: 'https://images.unsplash.com/photo-1631451095765-2c91616fc9e6?w=800&auto=format&fit=crop&q=80'
  },
  {
    campaignId: 'camp_nike_03',
    mallId: 'fourways_mall',
    mallName: 'Fourways Mall',
    outletId: 'nike',
    outletName: 'Nike Performance',
    category: 'footwear',
    sku: 'NIKE-PEGASUS-40',
    itemName: 'Air Zoom Pegasus 40',
    stickerPriceZAR: 2499,
    floorPriceZAR: 1850,
    imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80'
  }
];

const KNOWN_BLE_BEACONS: Record<string, { outletId: string; mallId: string }> = {
  // Fourways Mall
  'b9407f30-f5f8-466e-aff9-25556b57fe6e': { outletId: 'fw_zara', mallId: 'fourways_mall' },
  'a3217f30-f5f8-466e-aff9-25556b57fe6f': { outletId: 'fw_woolworths', mallId: 'fourways_mall' },
  'c8107f30-f5f8-466e-aff9-25556b57fe70': { outletId: 'fw_nike', mallId: 'fourways_mall' },
  'c0770f30-f5f8-466e-aff9-25556b57fe73': { outletId: 'fw_cottonon', mallId: 'fourways_mall' },
  'd4417f30-f5f8-466e-aff9-25556b57fe71': { outletId: 'fw_dischem', mallId: 'fourways_mall' },
  'e5527f30-f5f8-466e-aff9-25556b57fe72': { outletId: 'fw_istore', mallId: 'fourways_mall' },
  'cf210f30-f5f8-466e-aff9-25556b57fe74': { outletId: 'fw_checkers', mallId: 'fourways_mall' },

  // Sandton City
  'sc107f30-f5f8-466e-aff9-25556b57fe01': { outletId: 'sc_zara', mallId: 'sandton_city' },
  'sc207f30-f5f8-466e-aff9-25556b57fe02': { outletId: 'sc_hoka', mallId: 'sandton_city' },
  'sc307f30-f5f8-466e-aff9-25556b57fe03': { outletId: 'sc_adidas', mallId: 'sandton_city' },
  'sc407f30-f5f8-466e-aff9-25556b57fe04': { outletId: 'sc_woolworths', mallId: 'sandton_city' },
  'sc507f30-f5f8-466e-aff9-25556b57fe05': { outletId: 'sc_istore', mallId: 'sandton_city' },
  'sc607f30-f5f8-466e-aff9-25556b57fe06': { outletId: 'sc_alexander_mcqueen', mallId: 'sandton_city' },
  'sc707f30-f5f8-466e-aff9-25556b57fe07': { outletId: 'sc_sephora_arc', mallId: 'sandton_city' },

  // Northgate
  'ng107f30-f5f8-466e-aff9-25556b57fe11': { outletId: 'ng_picknpay', mallId: 'northgate' },
  'ng207f30-f5f8-466e-aff9-25556b57fe12': { outletId: 'ng_sportscene', mallId: 'northgate' },
  'ng307f30-f5f8-466e-aff9-25556b57fe13': { outletId: 'ng_edgars', mallId: 'northgate' },
  'ng407f30-f5f8-466e-aff9-25556b57fe14': { outletId: 'ng_cottonon', mallId: 'northgate' },
  'ng507f30-f5f8-466e-aff9-25556b57fe15': { outletId: 'ng_dischem', mallId: 'northgate' },
  'ng607f30-f5f8-466e-aff9-25556b57fe16': { outletId: 'ng_crazy_store', mallId: 'northgate' },

  // Bel Air
  'ba107f30-f5f8-466e-aff9-25556b57fe21': { outletId: 'ba_woolworths', mallId: 'bel_air' },
  'ba207f30-f5f8-466e-aff9-25556b57fe22': { outletId: 'ba_clicks', mallId: 'bel_air' },
  'ba307f30-f5f8-466e-aff9-25556b57fe23': { outletId: 'ba_uniq', mallId: 'bel_air' },
  'ba407f30-f5f8-466e-aff9-25556b57fe24': { outletId: 'ba_mrprice', mallId: 'bel_air' },
  'ba507f30-f5f8-466e-aff9-25556b57fe25': { outletId: 'ba_spar', mallId: 'bel_air' },
  'ba607f30-f5f8-466e-aff9-25556b57fe26': { outletId: 'ba_cellshack', mallId: 'bel_air' }
};

const NEGOTIATIONS = new Map<string, { campaignId: string; lastCounterZAR: number; rounds: number; updatedAt: number }>();
const TOKENS = new Map<string, { campaignId: string; priceZAR: number; expiresAt: number }>();
const CHALLENGES = new Map<string, { purpose: 'register' | 'pay'; transactionToken?: string; expiresAt: number }>();
const PASSKEYS = new Map<string, { publicKeySpki: Buffer; algorithm: number; createdAt: number }>();

class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

const rssiToMeters = (rssi: number, txPower: number = MEASURED_POWER_DBM): number =>
  Math.pow(10, (txPower - rssi) / (10 * PATH_LOSS_EXPONENT));

const resolveProximity = (ble: BLEBeacon[], maxRadiusM: number): { outletId: string; mallId: string; distanceM: number } | null => {
  let best: { outletId: string; mallId: string; distanceM: number } | null = null;
  for (const beacon of ble ?? []) {
    if (!beacon || typeof beacon.uuid !== 'string' || typeof beacon.rssi !== 'number') continue;
    const matched = KNOWN_BLE_BEACONS[beacon.uuid.toLowerCase()];
    if (!matched) continue;
    const distanceM = rssiToMeters(beacon.rssi, typeof beacon.txPower === 'number' ? beacon.txPower : MEASURED_POWER_DBM);
    if (distanceM <= maxRadiusM && (!best || distanceM < best.distanceM)) {
      best = { outletId: matched.outletId, mallId: matched.mallId, distanceM };
    }
  }
  return best;
};

const matchesIntent = (campaign: AdCampaign, intent: string | undefined): boolean => {
  const normalized = (intent ?? 'any').toLowerCase().trim();
  return normalized === '' || normalized === 'any' || campaign.category === normalized || campaign.itemName.toLowerCase().includes(normalized);
};

const parseJsonBody = <T>(req: IncomingMessage): Promise<T> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new HttpError(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large.'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (chunks.length === 0) {
        resolve({} as T);
        return;
      }
      try {
        const text = Buffer.concat(chunks).toString('utf8');
        resolve(JSON.parse(text) as T);
      } catch {
        reject(new HttpError(400, 'INVALID_JSON', 'Request body is not valid JSON.'));
      }
    });
    req.on('error', err => reject(err));
  });

const sendJson = (res: ServerResponse, status: number, data: unknown, origin?: string): void => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store'
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type';
    headers['Vary'] = 'Origin';
  }
  res.writeHead(status, headers);
  res.end(JSON.stringify(data));
};

const sha256 = (input: Buffer | string): Buffer => createHash('sha256').update(input).digest();
const fromB64u = (value: string): Buffer => Buffer.from(value, 'base64url');
const makeToken = (prefix: string): string => `${prefix}_${randomBytes(12).toString('base64url')}`;

const issueChallenge = (purpose: 'register' | 'pay', transactionToken?: string): string => {
  const challenge = randomBytes(32).toString('base64url');
  CHALLENGES.set(challenge, { purpose, transactionToken, expiresAt: Date.now() + CHALLENGE_TTL_MS });
  return challenge;
};

const consumeChallenge = (challenge: string, purpose: 'register' | 'pay', transactionToken?: string): void => {
  const entry = CHALLENGES.get(challenge);
  CHALLENGES.delete(challenge);
  if (!entry || entry.expiresAt < Date.now() || entry.purpose !== purpose || (transactionToken !== undefined && entry.transactionToken !== transactionToken)) {
    throw new HttpError(401, 'CHALLENGE_INVALID', 'The security challenge has expired or does not match. Try again.');
  }
};

const readClientData = (encoded: string, expectedType: 'webauthn.create' | 'webauthn.get'): { raw: Buffer; challenge: string } => {
  const raw = fromB64u(encoded);
  let data: { type?: string; challenge?: string; origin?: string };
  try {
    data = JSON.parse(raw.toString('utf8'));
  } catch {
    throw new HttpError(400, 'INVALID_CLIENT_DATA', 'Passkey client data could not be read.');
  }
  if (data.type !== expectedType || typeof data.challenge !== 'string') throw new HttpError(401, 'INVALID_CLIENT_DATA', 'Passkey response has the wrong type.');
  if (!data.origin || !ALLOWED_ORIGINS.has(data.origin)) throw new HttpError(401, 'ORIGIN_NOT_ALLOWED', `Origin ${data.origin ?? 'unknown'} is not allowed. Add it to METAPASE_ALLOWED_ORIGINS.`);
  return { raw, challenge: data.challenge };
};

const verifyPasskeyAssertion = (transactionToken: string, auth: AuthPayload): void => {
  const { credentialId, clientDataJSON, authenticatorData, signature } = auth;
  if (!credentialId || !clientDataJSON || !authenticatorData || !signature) throw new HttpError(400, 'INCOMPLETE_ASSERTION', 'Passkey assertion is missing fields.');
  const passkey = PASSKEYS.get(credentialId);
  if (!passkey) throw new HttpError(401, 'UNKNOWN_CREDENTIAL', 'This passkey is not registered with the server.');
  const { raw, challenge } = readClientData(clientDataJSON, 'webauthn.get');
  consumeChallenge(challenge, 'pay', transactionToken);
  const authData = fromB64u(authenticatorData);
  if (authData.length < 37) throw new HttpError(401, 'AUTH_DATA_TOO_SHORT', 'Authenticator data is corrupted.');
  const clientHash = sha256(raw);
  const signedPayload = Buffer.concat([authData, clientHash]);
  const pub = createPublicKey({ key: passkey.publicKeySpki, format: 'der', type: 'spki' });
  const ok = verifySignature(undefined, signedPayload, pub, fromB64u(signature));
  if (!ok) throw new HttpError(401, 'SIGNATURE_INVALID', 'Passkey signature could not be verified.');
};

type RouteHandler = (req: IncomingMessage, origin?: string) => Promise<[number, unknown]>;

const ROUTES: Record<string, RouteHandler> = {
  'POST /api/proximity/ping': async req => {
    const payload = await parseJsonBody<ProximityPayload>(req);
    const maxRadius = typeof payload?.positioning?.matchRadiusM === 'number' && payload.positioning.matchRadiusM > 0
      ? payload.positioning.matchRadiusM
      : MATCH_RADIUS_M;

    const proximity = resolveProximity(payload?.telemetry?.ble ?? [], maxRadius);
    if (!proximity) {
      return [404, { error: 'OUT_OF_BOUNDS', message: `No known beacon within ${maxRadius} m (${payload?.positioning?.proximityZone ?? 'scanning'}).` }];
    }

    const campaign = CAMPAIGNS.find(item =>
      (item.outletId === proximity.outletId || item.outletId.endsWith(proximity.outletId)) &&
      matchesIntent(item, payload.userContext?.currentIntent)
    );

    if (!campaign) {
      return [404, { error: 'NO_CAMPAIGN_MATCH', message: 'No promotion at this store matches what the shopper is after.' }];
    }

    return [200, {
      resolvedLocation: {
        mallId: campaign.mallId,
        outletId: campaign.outletId,
        outletName: campaign.outletName
      },
      adContext: {
        campaignId: campaign.campaignId,
        sku: campaign.sku,
        itemName: campaign.itemName,
        stickerPriceZAR: campaign.stickerPriceZAR,
        imageUrl: campaign.imageUrl
      },
      distanceM: Math.round(proximity.distanceM * 10) / 10
    }];
  },

  'POST /api/agent/bargain': async req => {
    const payload = await parseJsonBody<BargainPayload>(req);
    const campaign = CAMPAIGNS.find(item => item.campaignId === payload.campaignId);
    if (!campaign) return [404, { error: 'INVALID_CAMPAIGN', message: 'Campaign not found.' }];
    const offer = Number(payload.agentOfferZAR);
    if (!Number.isFinite(offer) || offer <= 0) return [400, { error: 'INVALID_OFFER', message: 'Offer must be a positive number.' }];
    if (typeof payload.sessionId !== 'string' || payload.sessionId.length === 0) return [400, { error: 'INVALID_SESSION', message: 'A sessionId is required.' }];

    const session = NEGOTIATIONS.get(payload.sessionId);
    if (session && session.campaignId !== campaign.campaignId) return [409, { error: 'SESSION_MISMATCH', message: 'This session belongs to another campaign.' }];

    if (offer >= campaign.floorPriceZAR) {
      const priceZAR = Math.min(Math.round(offer), campaign.stickerPriceZAR);
      const transactionToken = makeToken('mp_token');
      TOKENS.set(transactionToken, { campaignId: campaign.campaignId, priceZAR, expiresAt: Date.now() + TOKEN_TTL_MS });
      NEGOTIATIONS.delete(payload.sessionId);
      return [200, { status: 'OFFER_ACCEPTED', finalPriceZAR: priceZAR, transactionToken }];
    }

    const lastCounter = session?.lastCounterZAR ?? campaign.stickerPriceZAR;
    const counter = Math.max(campaign.floorPriceZAR, Math.round(lastCounter - (lastCounter - offer) * COUNTER_STEP));
    NEGOTIATIONS.set(payload.sessionId, { campaignId: campaign.campaignId, lastCounterZAR: counter, rounds: (session?.rounds ?? 0) + 1, updatedAt: Date.now() });
    return [200, { status: 'COUNTER_OFFER_PROPOSED', finalPriceZAR: counter }];
  },

  'POST /api/pay/passkey/challenge': async () => [200, { challenge: issueChallenge('register'), rpId: RP_ID }],

  'POST /api/pay/passkey/register': async req => {
    const payload = await parseJsonBody<RegisterPayload>(req);
    if (!payload?.challenge || !payload.credentialId || !payload.publicKeySpki || !payload.clientDataJSON) {
      return [400, { error: 'INCOMPLETE_REGISTRATION', message: 'Passkey registration is missing fields.' }];
    }
    const { challenge } = readClientData(payload.clientDataJSON, 'webauthn.create');
    consumeChallenge(challenge, 'register');
    const spkiBuf = fromB64u(payload.publicKeySpki);
    createPublicKey({ key: spkiBuf, format: 'der', type: 'spki' });
    PASSKEYS.set(payload.credentialId, { publicKeySpki: spkiBuf, algorithm: payload.algorithm, createdAt: Date.now() });
    return [200, { status: 'REGISTERED', credentialId: payload.credentialId }];
  },

  'POST /api/pay/settle': async req => {
    const payload = await parseJsonBody<SettlePayload>(req);
    if (!payload?.transactionToken || !payload?.authPayload) {
      return [400, { error: 'INCOMPLETE_SETTLEMENT', message: 'Settlement payload is missing token or authorization.' }];
    }
    const tokenEntry = TOKENS.get(payload.transactionToken);
    if (!tokenEntry || tokenEntry.expiresAt < Date.now()) {
      return [401, { error: 'TOKEN_INVALID', message: 'Transaction token is expired or does not exist.' }];
    }

    const { mechanism } = payload.authPayload;
    let verified = false;

    if (mechanism === 'meta_pay_passkey') {
      verifyPasskeyAssertion(payload.transactionToken, payload.authPayload);
      verified = true;
    } else if (mechanism === 'meta_pay_sandbox') {
      if (!ALLOW_SANDBOX_PAY) throw new HttpError(403, 'SANDBOX_DISABLED', 'Sandbox payment is disabled on this server.');
    } else {
      throw new HttpError(400, 'UNSUPPORTED_AUTH', `Payment mechanism ${mechanism ?? 'unknown'} is not supported.`);
    }

    TOKENS.delete(payload.transactionToken);
    const referenceId = `MP-${randomBytes(6).toString('hex').toUpperCase()}`;
    return [200, {
      status: 'SETTLED',
      success: true,
      referenceId,
      amountZAR: tokenEntry.priceZAR,
      campaignId: tokenEntry.campaignId,
      verified
    }];
  }
};

const server = createServer(async (req, res) => {
  const origin = req.headers.origin;
  const key = `${req.method} ${req.url?.split('?')[0]}`;

  if (req.method === 'OPTIONS') {
    if (origin && ALLOWED_ORIGINS.has(origin)) {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Vary': 'Origin'
      });
      res.end();
      return;
    }
    res.writeHead(403);
    res.end();
    return;
  }

  const handler = ROUTES[key];
  if (!handler) {
    sendJson(res, 404, { error: 'NOT_FOUND', message: `Route ${key} not found.` }, origin);
    return;
  }

  try {
    const [status, data] = await handler(req, origin);
    sendJson(res, status, data, origin);
  } catch (err) {
    if (err instanceof HttpError) {
      sendJson(res, err.status, { error: err.code, message: err.message }, origin);
    } else {
      console.error('Unhandled server error:', err);
      sendJson(res, 500, { error: 'INTERNAL_ERROR', message: 'An unexpected server error occurred.' }, origin);
    }
  }
});

server.listen(PORT, () => {
  console.log(`[metapase-server] listening on http://localhost:${PORT}`);
});
