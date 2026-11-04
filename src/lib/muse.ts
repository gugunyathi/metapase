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

/** Specific suggestions for a store manager. Muse writes them when available; otherwise simple stock rules do. */
export const getMuseInsights = async (input: InsightInput): Promise<MuseInsights> => {
  const viaMuse = await call<MuseInsights>('insights', input, 8000);
  return viaMuse && Array.isArray(viaMuse.insights) ? viaMuse : { insights: ruleInsights(input), engine: 'rules' };
};
