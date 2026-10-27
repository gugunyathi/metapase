import { BargainRequest, BargainResponse, DealClient, ProximityPingPayload, ProximityResponse, SettleRequest, SettleResponse, StoreNode } from '../types/metapase';
import { MATCH_RADIUS_M, STORE_NODES } from '../config/venue';
import { MALLS_DATABASE } from '../config/malls';
import { REAL_PRODUCTS } from '../config/products';

export interface DemoProduct {
  sku: string;
  itemName: string;
  stickerPriceZAR: number;
  floorRatio: number;
  imageUrl?: string;
  category?: string;
}

// Combine all store nodes from all malls + legacy default store nodes
export const ALL_STORE_NODES: StoreNode[] = [
  ...STORE_NODES,
  ...MALLS_DATABASE.flatMap(m => m.stores)
];

// Build CATALOG from REAL_PRODUCTS + legacy fallbacks
const buildCatalog = (): Record<string, DemoProduct[]> => {
  const map: Record<string, DemoProduct[]> = {
    zara: [
      { sku: 'ZA-BLZ-9912', itemName: 'Tailored Relaxed Linen Blazer', stickerPriceZAR: 1299, floorRatio: 0.78, imageUrl: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&auto=format&fit=crop&q=80', category: 'apparel' },
      { sku: 'ZA-KNT-4411', itemName: 'Textured Ribbed Knit Cardigan', stickerPriceZAR: 799, floorRatio: 0.80, imageUrl: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800&auto=format&fit=crop&q=80', category: 'apparel' },
      { sku: 'ZA-DNM-8820', itemName: 'Wide-Leg Selvedge Denim Trousers', stickerPriceZAR: 899, floorRatio: 0.79, imageUrl: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800&auto=format&fit=crop&q=80', category: 'apparel' },
      { sku: 'ZA-TEE-0318', itemName: 'Heavyweight Cotton Essential Tee', stickerPriceZAR: 299, floorRatio: 0.80, imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80', category: 'apparel' }
    ],
    woolworths: [
      { sku: 'WW-ET-0500', itemName: 'Ethiopian Yirgacheffe Single-Origin Beans 500g', stickerPriceZAR: 199, floorRatio: 0.84, imageUrl: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800&auto=format&fit=crop&q=80', category: 'groceries' },
      { sku: 'WW-CHS-0042', itemName: 'Handcrafted Charcuterie & Cheese Platter', stickerPriceZAR: 389, floorRatio: 0.85, imageUrl: 'https://images.unsplash.com/photo-1631451095765-2c91616fc9e6?w=800&auto=format&fit=crop&q=80', category: 'groceries' },
      { sku: 'WW-ROT-0120', itemName: 'Free-Range Herb Roasted Rotisserie Chicken', stickerPriceZAR: 159, floorRatio: 0.88, imageUrl: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=800&auto=format&fit=crop&q=80', category: 'groceries' },
      { sku: 'WW-CHC-0712', itemName: 'Dark Swiss Truffle Chocolate Gift Box', stickerPriceZAR: 249, floorRatio: 0.82, imageUrl: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=800&auto=format&fit=crop&q=80', category: 'groceries' }
    ],
    nike: [
      { sku: 'NK-PGS-4100', itemName: 'Nike Air Zoom Pegasus 41 Running Shoes', stickerPriceZAR: 2499, floorRatio: 0.82, imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80', category: 'footwear' },
      { sku: 'NK-DFT-7721', itemName: 'Nike Dri-FIT UV Active Training Crew', stickerPriceZAR: 699, floorRatio: 0.80, imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80', category: 'footwear' },
      { sku: 'NK-CAP-3310', itemName: 'Featherlight Aerobill Running Cap', stickerPriceZAR: 499, floorRatio: 0.80, imageUrl: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=800&auto=format&fit=crop&q=80', category: 'footwear' },
      { sku: 'NK-SCK-1044', itemName: 'Everyday Cushioned Training Socks 3-Pack', stickerPriceZAR: 299, floorRatio: 0.80, imageUrl: 'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=800&auto=format&fit=crop&q=80', category: 'footwear' }
    ],
    dischem: [
      { sku: 'DC-VIT-C30', itemName: 'Skin Republic 10% Vitamin C Serum 30ml', stickerPriceZAR: 349, floorRatio: 0.82, imageUrl: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&auto=format&fit=crop&q=80', category: 'beauty' },
      { sku: 'DC-SPF-50MIN', itemName: 'Bioderma Photoderm Max SPF 50+ Sun Fluid', stickerPriceZAR: 299, floorRatio: 0.84, imageUrl: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=800&auto=format&fit=crop&q=80', category: 'beauty' },
      { sku: 'DC-COL-0350', itemName: 'Harvest Table Pure Collagen Granules 350g', stickerPriceZAR: 489, floorRatio: 0.84, imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&auto=format&fit=crop&q=80', category: 'beauty' },
      { sku: 'DC-LIP-0420', itemName: 'Intense Hydrating Lip Repair Treatment', stickerPriceZAR: 159, floorRatio: 0.85, imageUrl: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=800&auto=format&fit=crop&q=80', category: 'beauty' }
    ],
    istore: [
      { sku: 'AP-AIR-4ANC', itemName: 'Apple AirPods 4 with Active Noise Cancellation', stickerPriceZAR: 3999, floorRatio: 0.89, imageUrl: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=800&auto=format&fit=crop&q=80', category: 'electronics' },
      { sku: 'AP-CSE-16PRO', itemName: 'iPhone 16 Pro Clear Case with MagSafe', stickerPriceZAR: 999, floorRatio: 0.82, imageUrl: 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=800&auto=format&fit=crop&q=80', category: 'electronics' },
      { sku: 'AP-PWR-35W', itemName: 'Apple 35W Dual USB-C Port Compact Power Adapter', stickerPriceZAR: 1199, floorRatio: 0.85, imageUrl: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800&auto=format&fit=crop&q=80', category: 'electronics' },
      { sku: 'IS-CBL-0099', itemName: 'Braided Reinforced USB-C Charge Cable 2m', stickerPriceZAR: 399, floorRatio: 0.82, imageUrl: 'https://images.unsplash.com/photo-1588508065123-287b28e013da?w=800&auto=format&fit=crop&q=80', category: 'electronics' }
    ]
  };

  // Populate from REAL_PRODUCTS for each store
  for (const product of REAL_PRODUCTS) {
    if (!map[product.storeId]) map[product.storeId] = [];
    map[product.storeId].push({
      sku: product.sku,
      itemName: product.itemName,
      stickerPriceZAR: product.stickerPriceZAR,
      floorRatio: product.floorRatio,
      imageUrl: product.imageUrl,
      category: product.category
    });
  }

  return map;
};

export const CATALOG: Record<string, DemoProduct[]> = buildCatalog();

const ROTATION_MS = 5 * 60 * 1000;
const COUNTER_STEP = 0.4;

const campaigns = new Map<string, DemoProduct>();
let slotOffset = 0;

export const rotateDemoCatalog = (): void => {
  slotOffset += 1;
};

const sessions = new Map<string, number>();
const tokens = new Map<string, number>();

const wait = (): Promise<void> => new Promise(resolve => window.setTimeout(resolve, 200 + Math.random() * 300));
const randomCode = (): string => Math.random().toString(36).slice(2, 8).toUpperCase();

const ping = async (payload: ProximityPingPayload): Promise<ProximityResponse | null> => {
  await wait();
  const beacon = payload.telemetry.ble[0];
  const effectiveRadiusM = payload.positioning.matchRadiusM ?? MATCH_RADIUS_M;

  const node = ALL_STORE_NODES.find(item => item.beaconUuid.toLowerCase() === beacon?.uuid?.toLowerCase());
  if (!node || payload.positioning.estimatedDistanceM > effectiveRadiusM) return null;

  const products = CATALOG[node.id] ?? CATALOG[node.id.split('_').slice(1).join('_')] ?? CATALOG['zara'];
  if (!products || products.length === 0) return null;

  const slot = Math.floor(Date.now() / ROTATION_MS) + slotOffset;
  const product = products[slot % products.length];
  const campaignId = `demo_${node.id}_${slot}`;
  campaigns.set(campaignId, product);

  return {
    resolvedLocation: {
      mallId: node.id.startsWith('sc_') ? 'sandton_city' : node.id.startsWith('fw_') ? 'fourways_mall' : node.id.startsWith('ng_') ? 'northgate' : node.id.startsWith('ba_') ? 'bel_air' : 'sandton_city',
      outletId: `outlet_${node.id}`,
      outletName: node.name
    },
    adContext: {
      campaignId,
      sku: product.sku,
      itemName: product.itemName,
      stickerPriceZAR: product.stickerPriceZAR,
      imageUrl: product.imageUrl
    }
  };
};

const bargain = async (request: BargainRequest): Promise<BargainResponse> => {
  await wait();
  const product = campaigns.get(request.campaignId);
  if (!product) throw new Error('This demo campaign has expired. Scan again.');
  const floor = Math.round(product.stickerPriceZAR * product.floorRatio);
  if (request.agentOfferZAR >= floor) {
    sessions.delete(request.sessionId);
    const token = `demo_tok_${randomCode()}`;
    tokens.set(token, request.agentOfferZAR);
    return { status: 'OFFER_ACCEPTED', finalPriceZAR: request.agentOfferZAR, transactionToken: token };
  }
  const lastCounter = sessions.get(request.sessionId) ?? product.stickerPriceZAR;
  const counter = Math.max(floor, Math.round(lastCounter - (lastCounter - request.agentOfferZAR) * COUNTER_STEP));
  sessions.set(request.sessionId, counter);
  return { status: 'COUNTER_OFFER_PROPOSED', finalPriceZAR: counter };
};

const settle = async (request: SettleRequest): Promise<SettleResponse> => {
  await wait();
  if (!tokens.has(request.transactionToken)) return { success: false };
  tokens.delete(request.transactionToken);
  return { success: true, referenceId: `DEMO-${randomCode()}` };
};

export const demoClient: DealClient = { label: 'demo stores', ping, bargain, settle };
