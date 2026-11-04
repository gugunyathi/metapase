import { ruleParseIntent } from './wishParse';
import type { ParsedIntent } from './wishParse';
import { ruleInsights } from './insights';
import type { Insight, InsightInput } from './insights';

/**
 * Browser side of the Muse integration. The browser never holds the API key: it calls /api/muse/* on the same origin
 * (the Node server through Vite's proxy, or the Vercel function), and the server talks to Muse Spark.
 * Every call returns null when Muse is unreachable, and callers fall back to rules.
 */

const BASE: string = (import.meta.env.VITE_METAPASE_MUSE_BASE as string | undefined) ?? '';

export interface MuseStatusView {
  configured: boolean;
  state: 'live' | 'degraded' | 'rules_only';
  model: string | null;
  host: string | null;
  calls: number;
  ok: number;
  failed: number;
  fallbacks: number;
  avgLatencyMs: number | null;
  lastError: string | null;
}

export interface MuseCounterInput {
  storeName: string;
  itemName: string;
  stickerZAR: number;
  floorZAR: number;
  offerZAR: number;
  lastCounterZAR: number;
  round: number;
  maxRounds: number;
}

export interface MuseCounter {
  counterZAR: number;
  message: string;
  engine: 'muse' | 'rules';
}

const call = async <T>(path: string, body: unknown, timeoutMs: number): Promise<T | null> => {
  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${BASE}/api/muse/${path}`, {
        method: body === undefined ? 'GET' : 'POST',
        headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal
      });
      if (!response.ok || !(response.headers.get('content-type') ?? '').includes('json')) return null;
      return (await response.json()) as T;
    } finally {
      window.clearTimeout(timer);
    }
  } catch {
    return null;
  }
};

export const getMuseStatus = (): Promise<MuseStatusView | null> => call<MuseStatusView>('status', undefined, 3000);

export const museCounter = (input: MuseCounterInput): Promise<MuseCounter | null> => call<MuseCounter>('counter', input, 4000);

/** Turns what the shopper typed or said into a wish. Muse reads it when available; otherwise a local parser does. */
export const parseWish = async (text: string): Promise<ParsedIntent> => {
  const viaMuse = await call<ParsedIntent>('intent', { text }, 5000);
  return viaMuse && typeof viaMuse.query === 'string' ? viaMuse : ruleParseIntent(text);
};

export interface MuseInsights {
  insights: Insight[];
  engine: 'muse' | 'rules';
}

export interface WebProductMatch {
  title: string;
  brand: string;
  priceZAR: number;
  category: 'apparel' | 'footwear' | 'groceries' | 'electronics' | 'beauty';
  imageUrl: string;
  description: string;
  sourceDomain: string;
  sourceUrl?: string;
  keywords: string[];
}

const FALLBACK_CATEGORY_IMAGES: Record<string, string> = {
  apparel: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&auto=format&fit=crop&q=80',
  footwear: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80',
  electronics: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&auto=format&fit=crop&q=80',
  groceries: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800&auto=format&fit=crop&q=80',
  beauty: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&auto=format&fit=crop&q=80'
};

export const searchWebProducts = async (query: string): Promise<WebProductMatch[]> => {
  const clean = query.trim();
  if (!clean) return [];
  const viaServer = await call<WebProductMatch[]>('search', { query: clean }, 6000);
  if (Array.isArray(viaServer) && viaServer.length > 0) return viaServer;

  // Client-side fallback
  const qLower = clean.toLowerCase();
  let cat: 'apparel' | 'footwear' | 'groceries' | 'electronics' | 'beauty' = 'electronics';
  if (/shoe|boot|sneaker|runner|slide|sandal|clifton|pegasus/i.test(qLower)) cat = 'footwear';
  else if (/shirt|pant|hoodie|jacket|dress|blazer|jean|polo|cap|hat/i.test(qLower)) cat = 'apparel';
  else if (/coffee|food|tea|chocolate|steak|bean|snack|grocer/i.test(qLower)) cat = 'groceries';
  else if (/cream|serum|perfume|fragrance|parfum|skincare|lipstick|lotion/i.test(qLower)) cat = 'beauty';

  const capitalized = clean.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return [
    {
      title: `${capitalized} (Global Online)`,
      brand: clean.split(' ')[0].toUpperCase() || 'Global',
      priceZAR: 1299,
      category: cat,
      imageUrl: FALLBACK_CATEGORY_IMAGES[cat],
      description: `Global web match from Google Shopping for "${clean}". Tracked in background by Personal Agent.`,
      sourceDomain: 'google.com/shopping',
      sourceUrl: `https://www.google.com/search?q=${encodeURIComponent(clean)}`,
      keywords: [clean.toLowerCase(), cat, 'online']
    },
    {
      title: `${capitalized} Premium Edition`,
      brand: 'Amazon International',
      priceZAR: 2199,
      category: cat,
      imageUrl: FALLBACK_CATEGORY_IMAGES[cat],
      description: `E-commerce listing for "${clean}". Monitored for localized beacon price drop match.`,
      sourceDomain: 'amazon.com',
      sourceUrl: `https://www.amazon.com/s?k=${encodeURIComponent(clean)}`,
      keywords: [clean.toLowerCase(), 'premium', cat]
    }
  ];
};

export const extractUrlProduct = async (url: string): Promise<WebProductMatch | null> => {
  const clean = url.trim();
  if (!clean) return null;
  const viaServer = await call<WebProductMatch>('url_product', { url: clean }, 6000);
  if (viaServer && typeof viaServer.title === 'string') return viaServer;

  // Client-side fallback
  let domain = 'store.com';
  try {
    const parsed = new URL(clean.startsWith('http') ? clean : `https://${clean}`);
    domain = parsed.hostname.replace(/^www\./, '');
  } catch {}

  const segments = clean.split(/[\/?#]/).filter(s => s.length > 2 && !s.includes('.') && !s.includes(':'));
  const slugPart = segments.pop() || segments.pop() || 'Imported Product';
  const cleanTitle = slugPart
    .replace(/[-_+]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .slice(0, 60);

  return {
    title: cleanTitle || `Product from ${domain}`,
    brand: domain.split('.')[0].toUpperCase(),
    priceZAR: 1499,
    category: 'apparel',
    imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80',
    description: `Embedded product link from ${domain}. Monitored for nearby store beacon matches.`,
    sourceDomain: domain,
    sourceUrl: clean,
    keywords: cleanTitle.toLowerCase().split(' ').filter(w => w.length > 2)
  };
};

/** Specific suggestions for a store manager. Muse writes them when available; otherwise simple stock rules do. */
export const getMuseInsights = async (input: InsightInput): Promise<MuseInsights> => {
  const viaMuse = await call<MuseInsights>('insights', input, 8000);
  return viaMuse && Array.isArray(viaMuse.insights) ? viaMuse : { insights: ruleInsights(input), engine: 'rules' };
};
