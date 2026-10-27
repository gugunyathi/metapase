import { useCallback, useEffect, useRef, useState } from 'react';
import { BuyResult, DataSource, Deal, DealCategory, EngineEvent, ItemSnapshot, EngineStats, GeoFix, IntentFilter, LogEntry, NegotiationRound, NodeReading, ResolvedMode, WiFiNode } from '../types/metapase';
import { MATCH_RADIUS_M, MAX_ROUNDS, OPENING_OFFER_RATIO, SCAN_INTERVAL_MS, STALE_AFTER_MS } from '../config/venue';
import { getClient } from '../lib/api';
import { formatZAR } from '../lib/format';
import { buzz } from '../lib/device';
import { snapshotOf } from '../lib/commerce';

export type LogFn = (source: LogEntry['source'], message: string, type?: LogEntry['type']) => void;

export interface DealEngineOptions {
  readings: NodeReading[];
  mode: ResolvedMode;
  fix: GeoFix | null;
  intent: IntentFilter;
  maxBudgetZAR: number;
  autopilot: boolean;
  dataSource: DataSource;
  matchRadiusM?: number;
  proximityZone?: string;
  onLog: LogFn;
  onEvent?: (event: EngineEvent) => void;
}

export interface DealEngine {
  deals: Record<string, Deal>;
  isScanning: boolean;
  lastScanAt: number | null;
  stats: EngineStats;
  serviceOnline: boolean | null;
  scan: () => Promise<void>;
  negotiate: (storeId: string) => Promise<void>;
  pay: (storeId: string) => Promise<void>;
  buyAtPrice: (item: ItemSnapshot, priceZAR: number) => Promise<BuyResult>;
  reset: () => void;
  refresh: () => void;
}

export const matchesIntent = (category: DealCategory, intent: IntentFilter): boolean => intent === 'any' || category === intent;

const makeId = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

const describeError = (error: unknown): string => (error instanceof Error ? error.message : 'Unknown error');

const NO_WIFI: WiFiNode[] = [];

const LOCKED_STATUSES: Deal['status'][] = ['negotiating', 'agreed', 'paying', 'paid'];

const EMPTY_STATS: EngineStats = { spentZAR: 0, savedZAR: 0, purchases: 0 };

export function useDealEngine(options: DealEngineOptions): DealEngine {
  const optionsRef = useRef<DealEngineOptions>(options);
  useEffect(() => {
    optionsRef.current = options;
  });

  const deviceIdRef = useRef<string>(`dev_${makeId().slice(0, 8)}`);
  const dealsRef = useRef<Record<string, Deal>>({});
  const scanningRef = useRef<boolean>(false);
  const negotiatingRef = useRef<Set<string>>(new Set());
  const rangeKeyRef = useRef<string | null>(null);
  const serviceOnlineRef = useRef<boolean | null>(null);

  const [deals, setDeals] = useState<Record<string, Deal>>({});
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [lastScanAt, setLastScanAt] = useState<number | null>(null);
  const [stats, setStats] = useState<EngineStats>(EMPTY_STATS);
  const [serviceOnline, setServiceOnline] = useState<boolean | null>(null);

  const commit = useCallback((update: (prev: Record<string, Deal>) => Record<string, Deal>) => {
    const next = update(dealsRef.current);
    dealsRef.current = next;
    setDeals(next);
  }, []);

  const patch = useCallback((storeId: string, changes: Partial<Deal>) => {
    commit(prev => (prev[storeId] ? { ...prev, [storeId]: { ...prev[storeId], ...changes } } : prev));
  }, [commit]);

  const markService = useCallback((online: boolean, detail: string) => {
    const { onLog, dataSource } = optionsRef.current;
    if (serviceOnlineRef.current === online) return;
    if (!online) onLog('SYSTEM', `Can't reach the deal service at ${getClient(dataSource).label}: ${detail}`, 'error');
    else if (serviceOnlineRef.current === false) onLog('SYSTEM', 'Deal service is reachable again.', 'success');
    serviceOnlineRef.current = online;
    setServiceOnline(online);
  }, []);

  const scan = useCallback(async () => {
    if (scanningRef.current) return;
    scanningRef.current = true;
    setIsScanning(true);
    const { readings, mode, fix, intent, maxBudgetZAR, onLog, dataSource, matchRadiusM = MATCH_RADIUS_M, proximityZone } = optionsRef.current;
    const client = getClient(dataSource);
    const inRange = readings.filter(reading => reading.inRange);
    const rangeKey = `${mode}:${matchRadiusM}:${inRange.map(reading => reading.node.id).sort().join(',')}`;
    if (rangeKey !== rangeKeyRef.current) {
      rangeKeyRef.current = rangeKey;
      onLog(
        'BLE_RADIO',
        inRange.length
          ? `${inRange.length} store${inRange.length === 1 ? '' : 's'} within ${matchRadiusM} m (${proximityZone ?? 'scanning'}).`
          : `No stores within ${matchRadiusM} m (${proximityZone ?? 'scanning'}).`
      );
    }
    try {
      const results = await Promise.all(
        inRange.map(async reading => {
          try {
            const response = await client.ping({
              deviceId: deviceIdRef.current,
              timestamp: new Date().toISOString(),
              telemetry: {
                ble: [{ uuid: reading.node.beaconUuid, rssi: reading.rssi }],
                wifi: NO_WIFI,
                gps: fix ? { lat: fix.lat, lng: fix.lng, accuracyM: fix.accuracyM } : null
              },
              positioning: {
                mode,
                estimatedDistanceM: Math.round(reading.distanceM * 10) / 10,
                matchRadiusM,
                proximityZone
              },
              userContext: { currentIntent: intent, maxBudgetZAR }
            });
            return { reading, response, error: null as string | null };
          } catch (error) {
            return { reading, response: null, error: describeError(error) };
          }
        })
      );

      const failures = results.filter(result => result.error !== null);
      if (results.length > 0 && failures.length === results.length) markService(false, failures[0].error ?? 'Network error');
      else if (results.length > failures.length) markService(true, '');

      const now = Date.now();
      const discovered: Deal[] = [];
      commit(prev => {
        const next: Record<string, Deal> = { ...prev };
        const seen = new Set<string>();
        for (const { reading, response } of results) {
          if (!response) continue;
          const storeId = reading.node.id;
          seen.add(storeId);
          const existing = next[storeId];
          if (existing && existing.ad.campaignId === response.adContext.campaignId) {
            next[storeId] = { ...existing, location: response.resolvedLocation, ad: response.adContext, lastSeen: now };
          } else {
            const fresh: Deal = {
              storeId,
              category: reading.node.category,
              location: response.resolvedLocation,
              ad: response.adContext,
              status: 'discovered',
              negotiatedPriceZAR: null,
              transactionToken: null,
              rounds: [],
              referenceId: null,
              firstSeen: now,
              lastSeen: now,
              note: null
            };
            next[storeId] = fresh;
            discovered.push(fresh);
          }
        }
        for (const storeId of Object.keys(next)) {
          const deal = next[storeId];
          if (!seen.has(storeId) && now - deal.lastSeen > STALE_AFTER_MS && !LOCKED_STATUSES.slice(0, 3).includes(deal.status)) delete next[storeId];
        }
        return next;
      });
      for (const deal of discovered) {
        onLog('SYSTEM', `New deal at ${deal.location.outletName}: ${deal.ad.itemName} for ${formatZAR(deal.ad.stickerPriceZAR)}.`, 'success');
        optionsRef.current.onEvent?.({ type: 'discovered', deal });
      }
      setLastScanAt(now);
    } finally {
      scanningRef.current = false;
      setIsScanning(false);
    }
  }, [commit, markService]);

  const negotiate = useCallback(async (storeId: string) => {
    const deal = dealsRef.current[storeId];
    if (!deal || negotiatingRef.current.has(storeId) || LOCKED_STATUSES.includes(deal.status)) return;
    const { maxBudgetZAR, readings, onLog, dataSource } = optionsRef.current;
    const client = getClient(dataSource);
    const outlet = deal.location.outletName;
    const sticker = deal.ad.stickerPriceZAR;
    let offer = Math.round(sticker * OPENING_OFFER_RATIO);

    if (offer > maxBudgetZAR) {
      patch(storeId, { status: 'over_budget', note: `Opening offer ${formatZAR(offer)} is above your ${formatZAR(maxBudgetZAR)} budget.` });
      onLog('LLAMA_AGENT', `Skipped ${outlet}: even the opening offer is over budget. Parked for later.`, 'warning');
      optionsRef.current.onEvent?.({ type: 'parked', deal, lastStorePriceZAR: sticker, bestOfferZAR: null, reason: `Your ${formatZAR(maxBudgetZAR)} budget is below the opening offer of ${formatZAR(offer)}.` });
      return;
    }

    negotiatingRef.current.add(storeId);
    const sessionId = `sess_${storeId}_${makeId().slice(0, 8)}`;
    const rounds: NegotiationRound[] = [];
    let outcome: Partial<Deal> | null = null;
    patch(storeId, { status: 'negotiating', rounds: [], note: null, negotiatedPriceZAR: null, transactionToken: null, referenceId: null });
    onLog('LLAMA_AGENT', `Negotiating ${deal.ad.itemName} at ${outlet}, sticker price ${formatZAR(sticker)}.`);

    try {
      for (let round = 1; round <= MAX_ROUNDS; round++) {
        const reading = readings.find(item => item.node.id === storeId);
        const distanceText = reading && Number.isFinite(reading.distanceM) ? `${Math.round(reading.distanceM)} m away` : 'nearby';
        onLog('LLAMA_AGENT', `Round ${round}: offering ${formatZAR(offer)} to ${outlet}.`);
        let response;
        try {
          response = await client.bargain({
            sessionId,
            campaignId: deal.ad.campaignId,
            agentOfferZAR: offer,
            rationale: `Shopper is ${distanceText} with a ${formatZAR(maxBudgetZAR)} budget. Round ${round} of ${MAX_ROUNDS}.`
          });
        } catch (error) {
          outcome = { status: 'failed', note: describeError(error) };
          onLog('LLAMA_AGENT', `Negotiation with ${outlet} failed: ${describeError(error)}`, 'error');
          break;
        }

        if (response.status === 'OFFER_ACCEPTED') {
          rounds.push({ round, agentOfferZAR: offer, storeResponse: 'accepted', storePriceZAR: response.finalPriceZAR });
          if (!response.transactionToken) {
            outcome = { status: 'failed', note: 'The store accepted but sent no payment token.' };
            onLog('LLAMA_AGENT', `${outlet} accepted without a payment token.`, 'error');
            break;
          }
          outcome = { status: 'agreed', negotiatedPriceZAR: response.finalPriceZAR, transactionToken: response.transactionToken, note: null };
          onLog('LLAMA_AGENT', `Deal agreed with ${outlet}: ${formatZAR(response.finalPriceZAR)}, saving ${formatZAR(sticker - response.finalPriceZAR)}.`, 'success');
          buzz(100);
          break;
        }

        if (response.status === 'COUNTER_OFFER_PROPOSED') {
          const counter = response.finalPriceZAR;
          rounds.push({ round, agentOfferZAR: offer, storeResponse: 'countered', storePriceZAR: counter });
          patch(storeId, { rounds: [...rounds] });
          onLog('LLAMA_AGENT', `${outlet} countered at ${formatZAR(counter)}.`, 'warning');
          const nextOffer = counter <= offer ? counter : Math.max(offer + 1, Math.round((offer + counter) / 2));
          if (nextOffer > maxBudgetZAR) {
            outcome = { status: 'over_budget', note: `The next step, ${formatZAR(nextOffer)}, would pass your ${formatZAR(maxBudgetZAR)} budget. Store's last price was ${formatZAR(counter)}.` };
            onLog('LLAMA_AGENT', `Stopped with ${outlet}: the next offer would exceed your budget.`, 'error');
            break;
          }
          offer = nextOffer;
          continue;
        }

        rounds.push({ round, agentOfferZAR: offer, storeResponse: 'ended', storePriceZAR: null });
        outcome = { status: 'no_deal', note: `The store ended the negotiation (${String(response.status)}).` };
        onLog('LLAMA_AGENT', `${outlet} ended the negotiation.`, 'error');
        break;
      }
      if (!outcome) {
        outcome = { status: 'no_deal', note: `No agreement after ${MAX_ROUNDS} rounds.` };
        onLog('LLAMA_AGENT', `No agreement with ${outlet} after ${MAX_ROUNDS} rounds.`, 'error');
      }
    } finally {
      negotiatingRef.current.delete(storeId);
      const finalOutcome: Partial<Deal> = outcome ?? { status: 'failed', note: 'The negotiation stopped unexpectedly.' };
      patch(storeId, { ...finalOutcome, rounds: [...rounds] });
      if (finalOutcome.status === 'agreed' && finalOutcome.negotiatedPriceZAR !== null && finalOutcome.negotiatedPriceZAR !== undefined) {
        const agreedDeal = dealsRef.current[storeId] ?? deal;
        optionsRef.current.onEvent?.({ type: 'agreed', deal: agreedDeal, priceZAR: finalOutcome.negotiatedPriceZAR });
      }
      if (finalOutcome.status === 'over_budget' || finalOutcome.status === 'no_deal') {
        const lastCounter = [...rounds].reverse().find(item => item.storeResponse === 'countered' && item.storePriceZAR !== null);
        const lastOffer = rounds.length ? rounds[rounds.length - 1].agentOfferZAR : null;
        optionsRef.current.onEvent?.({
          type: 'parked',
          deal,
          lastStorePriceZAR: lastCounter?.storePriceZAR ?? sticker,
          bestOfferZAR: lastOffer,
          reason: finalOutcome.note ?? 'The agent couldn’t reach your price.'
        });
      }
    }
  }, [patch]);

  const pay = useCallback(async (storeId: string) => {
    const deal = dealsRef.current[storeId];
    if (!deal || deal.status !== 'agreed' || !deal.transactionToken || deal.negotiatedPriceZAR === null) return;
    const { onLog, dataSource } = optionsRef.current;
    const client = getClient(dataSource);
    const price = deal.negotiatedPriceZAR;
    const outlet = deal.location.outletName;
    patch(storeId, { status: 'paying', note: null });
    onLog('META_PAY', `Requesting biometric confirmation for ${formatZAR(price)} at ${outlet}.`);
    try {
      const result = await client.settle({
        transactionToken: deal.transactionToken,
        authPayload: { mechanism: 'biometric_passkey', signature: 'sig_valid' }
      });
      if (result.success) {
        patch(storeId, { status: 'paid', referenceId: result.referenceId ?? null, transactionToken: null });
        setStats(prev => ({
          spentZAR: prev.spentZAR + price,
          savedZAR: prev.savedZAR + (deal.ad.stickerPriceZAR - price),
          purchases: prev.purchases + 1
        }));
        onLog('META_PAY', `Paid ${formatZAR(price)} at ${outlet}.${result.referenceId ? ` Reference ${result.referenceId}.` : ''}`, 'success');
        buzz(300);
        optionsRef.current.onEvent?.({ type: 'paid', snapshot: snapshotOf(deal), priceZAR: price, referenceId: result.referenceId ?? null });
      } else {
        patch(storeId, { status: 'agreed', note: 'Meta Pay declined the payment. Try again.' });
        onLog('META_PAY', `Meta Pay declined the payment at ${outlet}.`, 'error');
      }
    } catch (error) {
      patch(storeId, { status: 'agreed', note: `Couldn't reach Meta Pay: ${describeError(error)}` });
      onLog('META_PAY', `Couldn't reach Meta Pay: ${describeError(error)}`, 'error');
    }
  }, [patch]);

  const buyAtPrice = useCallback(async (item: ItemSnapshot, priceZAR: number): Promise<BuyResult> => {
    const { onLog, dataSource } = optionsRef.current;
    const client = getClient(dataSource);
    onLog('LLAMA_AGENT', `Buying ${item.itemName} at ${item.outletName} for ${formatZAR(priceZAR)}.`);
    try {
      const response = await client.bargain({
        sessionId: `sess_buy_${makeId().slice(0, 8)}`,
        campaignId: item.campaignId,
        agentOfferZAR: priceZAR,
        rationale: 'Accepting the store’s last price for an item the shopper saved for later.'
      });
      if (response.status !== 'OFFER_ACCEPTED' || !response.transactionToken) {
        const note = response.status === 'COUNTER_OFFER_PROPOSED'
          ? `The store now wants ${formatZAR(response.finalPriceZAR)}.`
          : 'The store didn’t accept this price.';
        onLog('LLAMA_AGENT', `${item.outletName}: ${note}`, 'warning');
        return { ok: false, note };
      }
      const finalPrice = response.finalPriceZAR;
      onLog('META_PAY', `Requesting biometric confirmation for ${formatZAR(finalPrice)} at ${item.outletName}.`);
      const result = await client.settle({
        transactionToken: response.transactionToken,
        authPayload: { mechanism: 'biometric_passkey', signature: 'sig_valid' }
      });
      if (!result.success) {
        onLog('META_PAY', `Meta Pay declined the payment at ${item.outletName}.`, 'error');
        return { ok: false, note: 'Meta Pay declined the payment.' };
      }
      setStats(prev => ({
        spentZAR: prev.spentZAR + finalPrice,
        savedZAR: prev.savedZAR + Math.max(0, item.stickerPriceZAR - finalPrice),
        purchases: prev.purchases + 1
      }));
      const existing = dealsRef.current[item.storeId];
      if (existing && existing.ad.campaignId === item.campaignId) {
        patch(item.storeId, { status: 'paid', negotiatedPriceZAR: finalPrice, referenceId: result.referenceId ?? null, transactionToken: null, note: null });
      }
      onLog('META_PAY', `Paid ${formatZAR(finalPrice)} at ${item.outletName}.${result.referenceId ? ` Reference ${result.referenceId}.` : ''}`, 'success');
      buzz(300);
      optionsRef.current.onEvent?.({ type: 'paid', snapshot: item, priceZAR: finalPrice, referenceId: result.referenceId ?? null });
      return { ok: true, note: null };
    } catch (error) {
      onLog('LLAMA_AGENT', `Couldn’t buy ${item.itemName}: ${describeError(error)}`, 'error');
      return { ok: false, note: describeError(error) };
    }
  }, [patch]);

  const refresh = useCallback(() => {
    commit(prev => Object.fromEntries(Object.entries(prev).filter(([storeId]) => negotiatingRef.current.has(storeId))));
    rangeKeyRef.current = null;
  }, [commit]);

  const reset = useCallback(() => {
    commit(() => ({}));
    setStats(EMPTY_STATS);
    setLastScanAt(null);
    setServiceOnline(null);
    serviceOnlineRef.current = null;
    rangeKeyRef.current = null;
  }, [commit]);

  useEffect(() => {
    if (!options.autopilot) return;
    void scan();
    const timer = window.setInterval(() => void scan(), SCAN_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [options.autopilot, scan]);

  useEffect(() => {
    if (!options.autopilot || negotiatingRef.current.size > 0) return;
    const { readings } = optionsRef.current;
    const distanceOf = (storeId: string): number => readings.find(reading => reading.node.id === storeId)?.distanceM ?? Number.POSITIVE_INFINITY;
    const candidate = Object.values(deals)
      .filter(deal => deal.status === 'discovered' && matchesIntent(deal.category, options.intent) && distanceOf(deal.storeId) <= MATCH_RADIUS_M)
      .sort((a, b) => distanceOf(a.storeId) - distanceOf(b.storeId))[0];
    if (candidate) void negotiate(candidate.storeId);
  }, [deals, options.autopilot, options.intent, negotiate]);

  return { deals, isScanning, lastScanAt, stats, serviceOnline, scan, negotiate, pay, buyAtPrice, reset, refresh };
}
