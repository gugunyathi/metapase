import { useCallback, useEffect, useRef } from 'react';
import { AppPreferences, CartLine, EngineEvent, ItemSnapshot, LogEntry, ParkedItem, Purchase, TimelineEvent, UserProfile, WatchItem } from '../types/metapase';
import { usePersistentState } from './usePersistentState';
import { makeLocalId, pickSnapshot, snapshotOf } from '../lib/commerce';
import { formatZAR } from '../lib/format';

type LogFn = (source: LogEntry['source'], message: string, type?: LogEntry['type']) => void;

const TIMELINE_LIMIT = 300;
const WATCH_DISCOUNT = 0.9;

export interface Commerce {
  parked: ParkedItem[];
  watchlist: WatchItem[];
  cartLines: CartLine[];
  purchases: Purchase[];
  timeline: TimelineEvent[];
  profile: UserProfile;
  prefs: AppPreferences;
  handleEvent: (event: EngineEvent) => void;
  moveParkedToCart: (id: string) => void;
  watchParked: (id: string) => void;
  watchItem: (item: ItemSnapshot, referencePriceZAR: number) => void;
  discardParked: (id: string) => void;
  moveParkedToCartMany: (ids: string[]) => void;
  watchParkedMany: (ids: string[]) => void;
  discardParkedMany: (ids: string[]) => void;
  clearParked: () => void;
  clearPurchases: () => void;
  removeWatch: (id: string) => void;
  addCartLine: (line: CartLine) => void;
  removeCartLine: (id: string) => void;
  updateCartLine: (id: string, changes: Partial<CartLine>) => void;
  setProfile: (profile: UserProfile) => void;
  setPrefs: (prefs: AppPreferences) => void;
  clearHistory: () => void;
}

export function useCommerce(onLog: LogFn): Commerce {
  const [parked, setParked] = usePersistentState<ParkedItem[]>('metapase:parked', []);
  const [watchlist, setWatchlist] = usePersistentState<WatchItem[]>('metapase:watchlist', []);
  const [cartLines, setCartLines] = usePersistentState<CartLine[]>('metapase:cart', []);
  const [purchases, setPurchases] = usePersistentState<Purchase[]>('metapase:purchases', []);
  const [timeline, setTimeline] = usePersistentState<TimelineEvent[]>('metapase:timeline', []);
  const [profile, setProfile] = usePersistentState<UserProfile>('metapase:profile', { name: '', email: '', memberSince: Date.now() });
  const [prefs, setPrefs] = usePersistentState<AppPreferences>('metapase:prefs', { haptics: true, voice: false, autoBuy: false });

  useEffect(() => {
    setCartLines(prev => (prev.some(line => line.origin === 'agreed') ? prev.filter(line => line.origin !== 'agreed') : prev));
  }, [setCartLines]);

  const watchRef = useRef<WatchItem[]>(watchlist);
  const cartRef = useRef<CartLine[]>(cartLines);
  const logRef = useRef<LogFn>(onLog);
  useEffect(() => {
    watchRef.current = watchlist;
    cartRef.current = cartLines;
    logRef.current = onLog;
  });

  const pushTimeline = useCallback((event: Omit<TimelineEvent, 'id'>, id?: string) => {
    const eventId = id ?? makeLocalId('evt');
    setTimeline(prev => (prev.some(existing => existing.id === eventId) ? prev : [{ ...event, id: eventId }, ...prev].slice(0, TIMELINE_LIMIT)));
  }, [setTimeline]);

  const handleEvent = useCallback((event: EngineEvent) => {
    const now = Date.now();
    if (event.type === 'discovered') {
      const item = snapshotOf(event.deal);
      const watched = watchRef.current.find(entry => entry.sku === item.sku);
      pushTimeline(
        { kind: 'promotion', at: now, item, priceZAR: item.stickerPriceZAR, note: watched ? `Back nearby. You’re watching for under ${formatZAR(watched.targetPriceZAR)}.` : `On offer at ${item.outletName}` },
        `promo_${item.campaignId}`
      );
      if (watched) {
        setWatchlist(prev => prev.map(entry => (entry.id === watched.id ? { ...entry, alertAt: now } : entry)));
        logRef.current('SYSTEM', `${item.itemName} from your watch list is back at ${item.outletName}.`, 'success');
      }
      return;
    }
    if (event.type === 'agreed') {
      const item = snapshotOf(event.deal);
      setParked(prev => prev.filter(entry => entry.campaignId !== item.campaignId));
      return;
    }
    if (event.type === 'parked') {
      const item = snapshotOf(event.deal);
      if (cartRef.current.some(line => line.campaignId === item.campaignId)) return;
      setParked(prev => {
        const existing = prev.find(entry => entry.campaignId === item.campaignId);
        if (existing) {
          return prev.map(entry => (entry.id === existing.id ? { ...entry, lastStorePriceZAR: event.lastStorePriceZAR, bestOfferZAR: event.bestOfferZAR, reason: event.reason, parkedAt: now } : entry));
        }
        return [{ ...item, id: makeLocalId('park'), parkedAt: now, lastStorePriceZAR: event.lastStorePriceZAR, bestOfferZAR: event.bestOfferZAR, reason: event.reason }, ...prev];
      });
      return;
    }
    const item = pickSnapshot(event.snapshot);
    setPurchases(prev => [{ ...item, id: makeLocalId('buy'), paidAt: now, priceZAR: event.priceZAR, referenceId: event.referenceId }, ...prev]);
    pushTimeline({
      kind: 'bought',
      at: now,
      item,
      priceZAR: event.priceZAR,
      note: event.priceZAR < item.stickerPriceZAR ? `Saved ${formatZAR(item.stickerPriceZAR - event.priceZAR)}${event.referenceId ? `, ref ${event.referenceId}` : ''}` : `Paid at sticker price${event.referenceId ? `, ref ${event.referenceId}` : ''}`
    });
    setCartLines(prev => prev.filter(line => line.campaignId !== item.campaignId));
    setParked(prev => prev.filter(entry => entry.campaignId !== item.campaignId));
  }, [pushTimeline, setWatchlist, setParked, setPurchases, setCartLines]);

  const moveParkedToCart = (id: string) => {
    const item = parked.find(entry => entry.id === id);
    if (!item) return;
    if (!cartLines.some(line => line.campaignId === item.campaignId)) {
      setCartLines(prev => [{ ...pickSnapshot(item), id: makeLocalId('cart'), addedAt: Date.now(), priceZAR: item.lastStorePriceZAR, status: 'ready', note: null, origin: 'parked' }, ...prev]);
    }
    setParked(prev => prev.filter(entry => entry.id !== id));
    onLog('SYSTEM', `${item.itemName} added to your cart at ${formatZAR(item.lastStorePriceZAR)}.`, 'success');
  };

  const watchItem = (item: ItemSnapshot, referencePriceZAR: number) => {
    const target = Math.round(referencePriceZAR * WATCH_DISCOUNT);
    if (!watchlist.some(entry => entry.sku === item.sku)) {
      setWatchlist(prev => [{ ...pickSnapshot(item), id: makeLocalId('watch'), addedAt: Date.now(), targetPriceZAR: target, alertAt: null }, ...prev]);
      pushTimeline({ kind: 'wishlist', at: Date.now(), item: pickSnapshot(item), priceZAR: referencePriceZAR, note: `Watching for under ${formatZAR(target)}` });
    }
    onLog('SYSTEM', `Watching ${item.itemName} for a price under ${formatZAR(target)}.`, 'success');
  };

  const watchParked = (id: string) => {
    const item = parked.find(entry => entry.id === id);
    if (!item) return;
    watchItem(item, item.lastStorePriceZAR);
    setParked(prev => prev.filter(entry => entry.id !== id));
  };

  const discardParked = (id: string) => setParked(prev => prev.filter(entry => entry.id !== id));

  const moveParkedToCartMany = (ids: string[]) => {
    const chosen = parked.filter(entry => ids.includes(entry.id));
    if (chosen.length === 0) return;
    const now = Date.now();
    setCartLines(prev => {
      const additions = chosen
        .filter(item => !prev.some(line => line.campaignId === item.campaignId))
        .map(item => ({ ...pickSnapshot(item), id: makeLocalId('cart'), addedAt: now, priceZAR: item.lastStorePriceZAR, status: 'ready' as const, note: null, origin: 'parked' as const }));
      return [...additions, ...prev];
    });
    setParked(prev => prev.filter(entry => !ids.includes(entry.id)));
    onLog('SYSTEM', `${chosen.length} parked item${chosen.length === 1 ? '' : 's'} added to your cart.`, 'success');
  };

  const watchParkedMany = (ids: string[]) => {
    const chosen = parked.filter(entry => ids.includes(entry.id));
    if (chosen.length === 0) return;
    const now = Date.now();
    const watchedSkus = new Set(watchlist.map(entry => entry.sku));
    const fresh = chosen.filter(item => {
      if (watchedSkus.has(item.sku)) return false;
      watchedSkus.add(item.sku);
      return true;
    });
    if (fresh.length > 0) {
      setWatchlist(prev => [
        ...fresh.map(item => ({ ...pickSnapshot(item), id: makeLocalId('watch'), addedAt: now, targetPriceZAR: Math.round(item.lastStorePriceZAR * WATCH_DISCOUNT), alertAt: null })),
        ...prev
      ]);
      fresh.forEach(item => pushTimeline({ kind: 'wishlist', at: now, item: pickSnapshot(item), priceZAR: item.lastStorePriceZAR, note: `Watching for under ${formatZAR(Math.round(item.lastStorePriceZAR * WATCH_DISCOUNT))}` }));
    }
    setParked(prev => prev.filter(entry => !ids.includes(entry.id)));
    onLog('SYSTEM', `Watching ${chosen.length} item${chosen.length === 1 ? '' : 's'} for a lower price.`, 'success');
  };

  const discardParkedMany = (ids: string[]) => setParked(prev => prev.filter(entry => !ids.includes(entry.id)));

  const clearParked = () => setParked([]);

  const clearPurchases = () => setPurchases([]);

  const removeWatch = (id: string) => setWatchlist(prev => prev.filter(entry => entry.id !== id));

  const addCartLine = (line: CartLine) => {
    setCartLines(prev => {
      if (prev.some(l => l.campaignId === line.campaignId)) return prev;
      return [line, ...prev];
    });
  };

  const removeCartLine = (id: string) => setCartLines(prev => prev.filter(line => line.id !== id));

  const updateCartLine = (id: string, changes: Partial<CartLine>) =>
    setCartLines(prev => prev.map(line => (line.id === id ? { ...line, ...changes } : line)));

  const clearHistory = () => {
    setParked([]);
    setWatchlist([]);
    setCartLines([]);
    setPurchases([]);
    setTimeline([]);
  };

  return {
    parked,
    watchlist,
    cartLines,
    purchases,
    timeline,
    profile,
    prefs,
    handleEvent,
    moveParkedToCart,
    watchParked,
    watchItem,
    discardParked,
    moveParkedToCartMany,
    watchParkedMany,
    discardParkedMany,
    clearParked,
    clearPurchases,
    removeWatch,
    addCartLine,
    removeCartLine,
    updateCartLine,
    setProfile,
    setPrefs,
    clearHistory
  };
}
