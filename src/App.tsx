import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Bot, Building2, Car, Compass as CompassIcon, Glasses, Laptop, Navigation2, RotateCcw, RotateCw, Satellite, ShoppingBag, Smartphone, SquareParking, Volume2, Watch, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { CartLine, DataSource, Deal, DealCategory, DealStatus, EngineEvent, DeviceProfile, GeoPoint, IntentFilter, LogEntry, NodeReading, PageId, PlacedStore, VenueMode } from './types/metapase';
import { MATCH_RADIUS_M } from './config/venue';
import { DEFAULT_MALL_ID, MALLS_DATABASE, PROXIMITY_ZONES, ProximityRadiusMode } from './config/malls';
import { REAL_PRODUCTS } from './config/products';
import { cardinal, haversineM, normalizeDeg, offsetToGeo, signedAngleDelta } from './lib/geo';
import { formatBearing, formatDistance, formatZAR } from './lib/format';
import { estimatePosition, resolveMode } from './lib/positioning';
import { useDeviceProfile } from './hooks/useDeviceProfile';
import { useGeolocation } from './hooks/useGeolocation';
import { useHeading } from './hooks/useHeading';
import { matchesIntent, useDealEngine } from './hooks/useDealEngine';
import { DEFAULT_DATA_SOURCE } from './lib/api';
import type { CompassTarget, CompassTone } from './components/Compass';
import DigitalCompassBar from './components/DigitalCompassBar';
import DealCarousel, { PinRequest } from './components/DealCarousel';
import { useMotionSpeed } from './hooks/useMotionSpeed';
import { useBeaconScanner } from './hooks/useBeaconScanner';
import DealDetail from './components/DealDetail';
import FlightLayer from './components/FlightLayer';
import type { Flight } from './components/FlightLayer';
import { snapshotOf } from './lib/commerce';
import { rotateDemoCatalog } from './lib/demoBackend';
import { buzz, setHapticsEnabled, speakText, stopSpeech } from './lib/device';
import { useCommerce } from './hooks/useCommerce';
import FloatingNav, { NAV_ITEMS } from './components/FloatingNav';
import Sheet from './components/Sheet';
import { BagList, ParkedList } from './components/ShelfLists';
import TimelinePage from './pages/TimelinePage';
import CartPage from './pages/CartPage';
import SettingsPage from './pages/SettingsPage';
import DiscoverPage from './pages/DiscoverPage';
import type { ControlPanelProps } from './components/ControlPanel';
import HeadingTape from './components/HeadingTape';
import DealCard from './components/DealCard';
import ActivityLog from './components/ActivityLog';
import PlaceholderDealCard from './components/PlaceholderDealCard';

const VIEWS: { id: DeviceProfile; label: string; icon: LucideIcon }[] = [
  { id: 'desktop', label: 'Desktop', icon: Laptop },
  { id: 'mobile', label: 'Mobile', icon: Smartphone },
  { id: 'watch', label: 'Watch', icon: Watch },
  { id: 'glasses', label: 'Glasses', icon: Glasses },
  { id: 'car', label: 'Car', icon: Car },
  { id: 'muse', label: 'Voice', icon: Volume2 }
];

const STATUS_ORDER: Record<DealStatus, number> = {
  agreed: 0,
  paying: 1,
  negotiating: 2,
  discovered: 3,
  paid: 4,
  no_deal: 5,
  over_budget: 6,
  failed: 7
};

const FACING_TOLERANCE_DEG = 12;
const DEMO_RUN_INTERVAL_MS = 40000;
const DEMO_PURCHASE_LIMIT = 40;

const toneFor = (status: DealStatus | undefined): CompassTone => {
  if (!status) return 'store';
  if (status === 'agreed' || status === 'paying') return 'agreed';
  if (status === 'paid') return 'paid';
  if (status === 'no_deal' || status === 'over_budget' || status === 'failed') return 'problem';
  return 'deal';
};

const guidanceFor = (relative: number | null, distanceM: number | undefined): string => {
  if (distanceM !== undefined && distanceM < 2) return "You're there";
  if (relative === null) return 'Direction unavailable';
  if (Math.abs(relative) <= FACING_TOLERANCE_DEG) return 'Straight ahead';
  return `Turn ${relative > 0 ? 'right' : 'left'} ${Math.round(Math.abs(relative))}°`;
};

const makeLogId = (): string => Math.random().toString(36).slice(2, 10);

const PAGE_IDS: PageId[] = NAV_ITEMS.map(item => item.id);

const readHashPage = (): PageId => {
  try {
    const token = window.location.hash.replace(/^#/, '');
    return (PAGE_IDS as string[]).includes(token) ? (token as PageId) : 'home';
  } catch {
    return 'home';
  }
};


interface Celebration {
  id: number;
  storeId: string;
  kind: 'surface' | 'parked' | 'bag' | 'cart';
  itemName: string;
  category: DealCategory;
  priceZAR: number;
}

const prefersReducedMotion = (): boolean => {
  try {
    return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

function CornerButton({ icon: Icon, label, count, tone, onClick, corner, bumpKey, compact }: { icon: LucideIcon; label: string; count: number; tone: 'amber' | 'emerald'; onClick: () => void; corner: 'parked' | 'bag'; bumpKey: number; compact: boolean }) {
  const accent = tone === 'amber' ? 'border-amber-300/40 text-amber-100' : 'border-emerald-300/40 text-emerald-100';
  return (
    <span key={bumpKey} data-corner={corner} className={`inline-flex ${bumpKey > 0 ? 'metapase-bump' : ''}`}>
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label}, ${count} item${count === 1 ? '' : 's'}`}
      className={`inline-flex items-center gap-2 rounded-full border bg-slate-950/75 py-1.5 pl-1.5 pr-3 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.9)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-slate-900 ${accent}`}
    >
      <span className={`grid h-8 w-8 place-items-center rounded-full ${tone === 'amber' ? 'bg-amber-300/20 text-amber-200' : 'bg-emerald-400/20 text-emerald-300'}`}><Icon className="h-4 w-4" /></span>
      {!compact && <span className="hidden text-xs font-semibold sm:inline">{label}</span>}
      <span className={`grid h-5 min-w-[1.25rem] place-items-center rounded-full px-1 text-[10px] font-bold text-slate-950 ${tone === 'amber' ? 'bg-amber-300' : 'bg-emerald-300'}`}>{count}</span>
    </button>
    </span>
  );
}

interface ListedDeal {
  deal: Deal;
  reading: NodeReading | undefined;
  matches: boolean;
}

function Readout({ label, value, tone }: { label: string; value: string; tone: 'emerald' | 'amber' | 'plain' }) {
  const color = tone === 'emerald' ? 'text-emerald-300' : tone === 'amber' ? 'text-amber-200' : 'text-white';
  return (
    <div className="rounded-2xl bg-black/25 px-3 py-2.5">
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className={`mt-0.5 text-sm font-bold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}

export default function App() {
  const detectedProfile = useDeviceProfile();
  const [isAutoDetected, setIsAutoDetected] = useState<boolean>(true);
  const [manualView, setManualView] = useState<DeviceProfile>('desktop');
  const activeView: DeviceProfile = isAutoDetected ? detectedProfile : manualView;

  const [page, setPage] = useState<PageId>(readHashPage);
  const [sheet, setSheet] = useState<'parked' | 'bag' | null>(null);
  const [payingAll, setPayingAll] = useState<boolean>(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [celebrations, setCelebrations] = useState<Celebration[]>([]);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [flight, setFlight] = useState<Flight | null>(null);
  const [bumps, setBumps] = useState<{ parked: number; bag: number; cart: number }>({ parked: 0, bag: 0, cart: 0 });
  const celebrationIdRef = useRef<number>(0);
  const activeCelebrationRef = useRef<number | null>(null);
  const celebrationContextRef = useRef<{ page: PageId; view: DeviceProfile; intent: IntentFilter; autoBuy: boolean }>({ page: 'home', view: 'desktop', intent: 'any', autoBuy: false });
  const [activeMallId, setActiveMallId] = useState<string>(DEFAULT_MALL_ID);
  const [autoDetectedMallName, setAutoDetectedMallName] = useState<string | null>(null);
  const [proximityMode, setProximityMode] = useState<ProximityRadiusMode>('driveby');

  const activeMall = useMemo(
    () => MALLS_DATABASE.find(m => m.id === activeMallId) ?? MALLS_DATABASE[0],
    [activeMallId]
  );

  const [venuePref, setVenuePref] = useState<VenueMode>('auto');
  const [anchor, setAnchor] = useState<GeoPoint>(activeMall.gpsCenter);
  const [rssiMap, setRssiMap] = useState<Record<string, number>>(() =>
    Object.fromEntries(MALLS_DATABASE.flatMap(m => m.stores).map(node => [node.id, node.defaultRssi]))
  );
  const [intent, setIntent] = useState<IntentFilter>('any');
  const [maxBudgetZAR, setMaxBudgetZAR] = useState<number>(600);
  const [autopilot, setAutopilot] = useState<boolean>(true);
  const [dataSource, setDataSource] = useState<DataSource>(DEFAULT_DATA_SOURCE);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pinRequest, setPinRequest] = useState<PinRequest | null>(null);
  const [lastTurnAt, setLastTurnAt] = useState<number>(0);

  // Always track user location for drive-by commuters and mall detection
  const { fix, error: geoError, supported: geoSupported } = useGeolocation(true);
  const compass = useHeading();

  const addLog = useCallback((source: LogEntry['source'], message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev.slice(-199), { id: makeLogId(), timestamp: new Date().toLocaleTimeString(), source, message, type }]);
  }, []);

  // Continuous auto-detection of mall from user GPS coordinates
  useEffect(() => {
    if (!fix) return;
    let closestMall = MALLS_DATABASE[0];
    let minDistance = haversineM(fix, closestMall.gpsCenter);

    for (const mall of MALLS_DATABASE) {
      const dist = haversineM(fix, mall.gpsCenter);
      if (dist < minDistance) {
        minDistance = dist;
        closestMall = mall;
      }
    }

    if (minDistance <= closestMall.geofenceRadiusM) {
      if (activeMallId !== closestMall.id) {
        setActiveMallId(closestMall.id);
        setAnchor(closestMall.gpsCenter);
        setAutoDetectedMallName(closestMall.name);
        addLog('SYSTEM', `Auto-detected venue: ${closestMall.name} (${Math.round(minDistance)}m away)`, 'success');
      } else if (!autoDetectedMallName) {
        setAutoDetectedMallName(closestMall.name);
      }
    }
  }, [fix, activeMallId, autoDetectedMallName, addLog]);

  const handleSelectMall = useCallback((mallId: string) => {
    const target = MALLS_DATABASE.find(m => m.id === mallId);
    if (!target) return;
    setActiveMallId(mallId);
    setAnchor(target.gpsCenter);
    setAutoDetectedMallName(target.name);
    addLog('SYSTEM', `Venue switched to ${target.name}`, 'info');
  }, [addLog]);

  const commerce = useCommerce(addLog);
  const autoBuyActive = dataSource === 'demo' || commerce.prefs.autoBuy;

  useEffect(() => {
    setHapticsEnabled(commerce.prefs.haptics);
  }, [commerce.prefs.haptics]);

  useEffect(() => {
    const handleHash = () => setPage(readHashPage());
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const navigate = useCallback((next: PageId) => {
    setPage(next);
    try {
      window.history.replaceState(null, '', `#${next}`);
    } catch {
      window.location.hash = next;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const currentStoreNodes = useMemo(() => activeMall.stores, [activeMall]);
  const matchRadiusM = PROXIMITY_ZONES[proximityMode].radiusM;

  const nodes: PlacedStore[] = useMemo(
    () => currentStoreNodes.map(node => ({ ...node, point: offsetToGeo(anchor, node.offsetEastM, node.offsetNorthM) })),
    [currentStoreNodes, anchor]
  );
  const beaconScanner = useBeaconScanner();
  const liveNodeIds = useMemo(
    () => new Set(currentStoreNodes.filter(node => beaconScanner.beacons[node.beaconUuid.toLowerCase()]).map(node => node.id)),
    [currentStoreNodes, beaconScanner.beacons]
  );
  const effectiveRssi = useMemo(() => {
    const merged: Record<string, number> = { ...rssiMap };
    for (const node of currentStoreNodes) {
      const live = beaconScanner.beacons[node.beaconUuid.toLowerCase()];
      if (live) merged[node.id] = Math.round(live.rssi);
    }
    return merged;
  }, [rssiMap, currentStoreNodes, beaconScanner.beacons]);

  const mode = resolveMode(venuePref, fix);
  const estimate = useMemo(
    () => estimatePosition(nodes, mode, fix, effectiveRssi, anchor, matchRadiusM),
    [nodes, mode, fix, effectiveRssi, anchor, matchRadiusM]
  );
  const readingById = useMemo(() => new Map(estimate.readings.map(reading => [reading.node.id, reading])), [estimate.readings]);

  const speedMps = useMotionSpeed(estimate.userPoint, mode === 'outdoor' ? fix?.speedMps ?? null : null);

  const turnAnchorRef = useRef<number>(compass.heading);
  useEffect(() => {
    if (Math.abs(signedAngleDelta(compass.heading, turnAnchorRef.current)) < 4) return;
    turnAnchorRef.current = compass.heading;
    setLastTurnAt(Date.now());
  }, [compass.heading]);

  const selectDeal = useCallback((storeId: string) => {
    setSelectedId(storeId);
    setPinRequest({ id: storeId, at: Date.now() });
  }, []);

  useEffect(() => {
    celebrationContextRef.current = { page, view: activeView, intent, autoBuy: autoBuyActive };
  });

  const bumpCorner = useCallback((corner: 'parked' | 'bag' | 'cart') => {
    setBumps(prev => ({ ...prev, [corner]: prev[corner] + 1 }));
    buzz(corner === 'bag' ? [30, 40, 60] : corner === 'cart' ? [25, 35, 25] : 40);
  }, []);

  const celebrate = useCallback((event: EngineEvent) => {
    const context = celebrationContextRef.current;
    const onCarousel = context.page === 'home' && context.view !== 'glasses';
    let next: Omit<Celebration, 'id'> | null = null;
    if (event.type === 'discovered') {
      if (!matchesIntent(event.deal.category, context.intent)) return;
      next = { storeId: event.deal.storeId, kind: 'surface', itemName: event.deal.ad.itemName, category: event.deal.category, priceZAR: event.deal.ad.stickerPriceZAR };
    } else if (event.type === 'agreed') {
      if (context.autoBuy) return;
      next = { storeId: event.deal.storeId, kind: 'surface', itemName: event.deal.ad.itemName, category: event.deal.category, priceZAR: event.priceZAR };
    } else if (event.type === 'parked') {
      next = { storeId: event.deal.storeId, kind: 'parked', itemName: event.deal.ad.itemName, category: event.deal.category, priceZAR: event.lastStorePriceZAR };
    } else {
      next = { storeId: event.snapshot.storeId, kind: 'bag', itemName: event.snapshot.itemName, category: event.snapshot.category, priceZAR: event.priceZAR };
    }
    if (!onCarousel) {
      if (next.kind !== 'surface') bumpCorner(next.kind);
      return;
    }
    const celebration: Celebration = { ...next, id: ++celebrationIdRef.current };
    setCelebrations(prev => (celebration.kind === 'surface' && prev.length >= 3 ? prev : [...prev, celebration].slice(-8)));
  }, [bumpCorner]);

  const emitEvent = useCallback((event: EngineEvent) => {
    commerce.handleEvent(event);
    celebrate(event);
  }, [commerce.handleEvent, celebrate]);

  useEffect(() => {
    const current = celebrations[0];
    if (!current || activeCelebrationRef.current === current.id) return;
    activeCelebrationRef.current = current.id;
    const finish = () => {
      setFlashId(null);
      activeCelebrationRef.current = null;
      setCelebrations(prev => prev.filter(item => item.id !== current.id));
    };
    setPinRequest({ id: current.storeId, at: Date.now() });
    setFlashId(current.storeId);
    if (current.kind === 'surface') {
      window.setTimeout(finish, 1300);
      return;
    }
    const corner = current.kind;
    window.setTimeout(() => {
      const card = document.querySelector(`[data-deal-card="${current.storeId}"]`);
      const target = document.querySelector(`[data-corner="${corner}"]`);
      const cardRect = card?.getBoundingClientRect();
      const targetRect = target?.getBoundingClientRect();
      if (!cardRect || !targetRect || cardRect.width === 0 || prefersReducedMotion()) {
        bumpCorner(corner);
        window.setTimeout(finish, 500);
        return;
      }
      setFlashId(null);
      setFlight({
        key: current.id,
        from: { x: cardRect.left, y: cardRect.top, width: cardRect.width, height: cardRect.height },
        to: { x: targetRect.left + targetRect.width / 2, y: targetRect.top + targetRect.height / 2 },
        itemName: current.itemName,
        category: current.category,
        priceZAR: current.priceZAR,
        tone: corner === 'parked' || corner === 'cart' ? 'amber' : 'emerald',
        onDone: () => {
          setFlight(null);
          bumpCorner(corner);
          window.setTimeout(finish, 300);
        }
      });
    }, 900);
  }, [celebrations, bumpCorner]);

  const engine = useDealEngine({
    readings: estimate.readings,
    mode,
    fix,
    intent,
    maxBudgetZAR,
    autopilot,
    dataSource,
    matchRadiusM,
    proximityZone: PROXIMITY_ZONES[proximityMode].label,
    onLog: addLog,
    onEvent: emitEvent
  });

  const autoBuyTriedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!autopilot || !autoBuyActive) return;
    for (const deal of Object.values(engine.deals)) {
      const price = deal.negotiatedPriceZAR;
      if (deal.status !== 'agreed' || price === null || price > maxBudgetZAR || !matchesIntent(deal.category, intent)) continue;
      if (autoBuyTriedRef.current.has(deal.ad.campaignId)) continue;
      autoBuyTriedRef.current.add(deal.ad.campaignId);
      addLog('LLAMA_AGENT', `Auto-buying ${deal.ad.itemName} for ${formatZAR(price)}.`);
      void engine.pay(deal.storeId);
      break;
    }
  }, [engine.deals, autopilot, autoBuyActive, intent, maxBudgetZAR, addLog, engine.pay]);

  const purchaseCountRef = useRef<number>(0);
  useEffect(() => {
    purchaseCountRef.current = commerce.purchases.length;
  }, [commerce.purchases.length]);

  const simulateShoppingRun = useCallback(() => {
    if (dataSource !== 'demo') return;
    rotateDemoCatalog();
    engine.refresh();
    addLog('SYSTEM', 'Demo: you walked on and new offers appeared nearby.', 'success');
    void engine.scan();
  }, [dataSource, engine.refresh, engine.scan, addLog]);

  useEffect(() => {
    if (dataSource !== 'demo' || !autopilot) return;
    const timer = window.setInterval(() => {
      if (purchaseCountRef.current >= DEMO_PURCHASE_LIMIT) return;
      simulateShoppingRun();
    }, DEMO_RUN_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [dataSource, autopilot, simulateShoppingRun]);

  const openDeal = useCallback((storeId: string) => {
    selectDeal(storeId);
    setDetailId(storeId);
  }, [selectDeal]);

  const closeDeal = useCallback(() => setDetailId(null), []);

  const previousModeRef = useRef<string | null>(null);
  useEffect(() => {
    if (previousModeRef.current === mode) return;
    previousModeRef.current = mode;
    addLog('SYSTEM', mode === 'outdoor' ? 'Matching outdoors with GPS.' : 'Matching indoors with beacon signals.');
  }, [mode, addLog]);

  const dealList: ListedDeal[] = useMemo(
    () =>
      Object.values(engine.deals)
        .map(deal => ({ deal, reading: readingById.get(deal.storeId), matches: matchesIntent(deal.category, intent) }))
        .sort((a, b) => {
          if (a.matches !== b.matches) return a.matches ? -1 : 1;
          if (STATUS_ORDER[a.deal.status] !== STATUS_ORDER[b.deal.status]) return STATUS_ORDER[a.deal.status] - STATUS_ORDER[b.deal.status];
          return (a.reading?.distanceM ?? Number.POSITIVE_INFINITY) - (b.reading?.distanceM ?? Number.POSITIVE_INFINITY);
        }),
    [engine.deals, readingById, intent]
  );

  useEffect(() => {
    if (selectedId && (engine.deals[selectedId] || readingById.get(selectedId)?.inRange)) return;
    const first = dealList[0];
    setSelectedId(first ? first.deal.storeId : null);
  }, [selectedId, engine.deals, readingById, dealList]);

  const selectedReading = selectedId ? readingById.get(selectedId) : undefined;
  const selectedDeal = selectedId ? engine.deals[selectedId] : undefined;
  const toBearing = selectedReading?.bearingDeg ?? null;
  const fromBearing = toBearing !== null ? normalizeDeg(toBearing + 180) : null;
  const relative = toBearing !== null ? signedAngleDelta(toBearing, compass.heading) : null;
  const facing = relative !== null && Math.abs(relative) <= FACING_TOLERANCE_DEG;
  const guidance = guidanceFor(relative, selectedReading?.distanceM);

  const facingRef = useRef<boolean>(false);
  useEffect(() => {
    if (facing && !facingRef.current && compass.source === 'sensor') buzz([40, 60, 40]);
    facingRef.current = facing;
  }, [facing, compass.source]);

  const targets: CompassTarget[] = useMemo(
    () =>
      estimate.readings
        .filter(reading => reading.inRange || engine.deals[reading.node.id])
        .map(reading => ({
          id: reading.node.id,
          label: reading.node.name,
          bearingDeg: reading.bearingDeg,
          distanceM: reading.distanceM,
          tone: toneFor(engine.deals[reading.node.id]?.status)
        })),
    [estimate.readings, engine.deals]
  );

  const speak = useCallback((text: string) => speakText(text), []);

  const lastLog = logs[logs.length - 1];
  useEffect(() => {
    if ((activeView !== 'muse' && !commerce.prefs.voice) || !lastLog) return;
    if ((lastLog.source === 'LLAMA_AGENT' && lastLog.type === 'success') || lastLog.source === 'META_PAY' || lastLog.type === 'error') speak(lastLog.message);
  }, [lastLog?.id, activeView, speak, commerce.prefs.voice]);

  const directionSentence = (() => {
    if (!selectedReading) return 'No stores are within 50 metres yet.';
    const name = selectedReading.node.name;
    const distance = Number.isFinite(selectedReading.distanceM) ? `${Math.round(selectedReading.distanceM)} metres away` : 'nearby';
    const offer = selectedDeal
      ? selectedDeal.negotiatedPriceZAR !== null
        ? `${selectedDeal.ad.itemName}, agreed at ${formatZAR(selectedDeal.negotiatedPriceZAR)}.`
        : `${selectedDeal.ad.itemName}, ${formatZAR(selectedDeal.ad.stickerPriceZAR)}.`
      : '';
    return `${name}, ${distance}. ${guidance}. ${offer}`.trim();
  })();

  const centerVenue = () => {
    if (!fix) return;
    setAnchor({ lat: fix.lat, lng: fix.lng });
    addLog('SYSTEM', `Venue centered on your location, accurate to ${Math.round(fix.accuracyM)} m.`, 'success');
  };

  const resetSession = () => {
    engine.reset();
    setLogs([]);
    setSelectedId(null);
    stopSpeech();
  };

  const changeDataSource = (source: DataSource) => {
    if (source === dataSource) return;
    engine.reset();
    setSelectedId(null);
    setDataSource(source);
    addLog('SYSTEM', source === 'demo' ? 'Switched to demo stores. Offers and payments are simulated.' : 'Switched to the live backend.', 'success');
  };

  const selectView = (view: DeviceProfile) => {
    setIsAutoDetected(false);
    setManualView(view);
    if (page !== 'home') navigate('home');
  };

  const selectAutoView = () => {
    setIsAutoDetected(true);
    if (page !== 'home') navigate('home');
  };


  const turnControls: ReactNode = compass.source === 'manual' ? (
    <div className="flex items-center justify-center gap-2">
      <button type="button" onClick={() => compass.setManualHeading(compass.heading - 15)} aria-label="Turn left 15 degrees" className="grid h-9 w-9 place-items-center rounded-full bg-white/5 text-slate-300 transition hover:bg-white/10"><RotateCcw className="h-4 w-4" /></button>
      <span className="text-xs text-slate-500">Turn to sweep the deals around you</span>
      <button type="button" onClick={() => compass.setManualHeading(compass.heading + 15)} aria-label="Turn right 15 degrees" className="grid h-9 w-9 place-items-center rounded-full bg-white/5 text-slate-300 transition hover:bg-white/10"><RotateCw className="h-4 w-4" /></button>
    </div>
  ) : null;

  const emptyDeals = (
    <PlaceholderDealCard
      isScanning={engine.isScanning}
      serviceOnline={engine.serviceOnline}
      dataSource={dataSource}
      matchRadius={matchRadiusM}
    />
  );

  // Real products populated into carousel cards with real ZAR prices and photography
  const carouselEntries = useMemo(() => {
    const list = [...dealList];
    const liveStoreIds = new Set(dealList.map(item => item.deal.storeId));

    // Populate carousel with real promotional products from the active mall's stores
    const mallProducts = REAL_PRODUCTS.filter(p => p.mallId === activeMall.id);
    for (const prod of mallProducts) {
      if (liveStoreIds.has(prod.storeId)) continue;
      const reading = readingById.get(prod.storeId);
      const floor = Math.round(prod.stickerPriceZAR * prod.floorRatio);

      const realDeal: Deal = {
        storeId: prod.storeId,
        category: prod.category,
        location: {
          mallId: prod.mallId,
          outletId: prod.storeId,
          outletName: prod.storeName
        },
        ad: {
          campaignId: `promo_${prod.id}`,
          sku: prod.sku,
          itemName: prod.itemName,
          stickerPriceZAR: prod.stickerPriceZAR,
          imageUrl: prod.imageUrl
        },
        status: 'discovered',
        negotiatedPriceZAR: floor,
        transactionToken: null,
        rounds: [
          {
            round: 1,
            agentOfferZAR: floor,
            storeResponse: 'countered',
            storePriceZAR: floor
          }
        ],
        referenceId: null,
        firstSeen: Date.now() - 60000,
        lastSeen: Date.now(),
        note: `${prod.tag} · Real South African retail item`
      };

      list.push({
        deal: realDeal,
        reading,
        matches: matchesIntent(prod.category, intent)
      });
    }

    return list;
  }, [dealList, readingById, activeMall.id, intent]);

  const renderCompassPanel = (compact: boolean = false) => (
    <section className={`border border-white/[0.06] bg-white/[0.02] backdrop-blur ${compact ? 'rounded-[1.5rem] p-2.5' : 'rounded-[2rem] p-3 sm:p-5'}`}>
      {/* ── Active Mall & Proximity Zone Range Bar ── */}
      <div className={`flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/[0.08] bg-black/40 px-3.5 py-2.5 backdrop-blur ${compact ? 'mb-2.5' : 'mb-4'}`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-400/20 to-amber-300/20 text-emerald-300 border border-white/10">
            <Building2 className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-white truncate">{activeMall.name}</span>
              {autoDetectedMallName === activeMall.name && (
                <span className="rounded-full bg-emerald-400/20 border border-emerald-400/30 px-2 py-0.2 text-[9px] font-extrabold text-emerald-300">
                  Auto-Detected
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 truncate">
              {fix ? `GPS tracked ±${Math.round(fix.accuracyM)}m` : 'Tracking location…'} · {currentStoreNodes.length} stores
            </p>
          </div>
        </div>

        {/* Proximity range mode selector pills (50m, 20m, 1m) */}
        <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none]">
          {(Object.keys(PROXIMITY_ZONES) as ProximityRadiusMode[]).map(mode => {
            const z = PROXIMITY_ZONES[mode];
            const isSel = proximityMode === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => setProximityMode(mode)}
                title={z.description}
                className={`rounded-xl px-2.5 py-1 text-[11px] font-bold transition whitespace-nowrap ${
                  isSel
                    ? 'bg-amber-300 text-slate-950 shadow'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                {z.shortLabel}
              </button>
            );
          })}
        </div>
      </div>

      <div className={`flex flex-wrap items-center ${compact ? 'gap-2' : 'gap-3'}`}>
        <div className={`min-w-0 flex-1 ${compact ? 'basis-full' : 'basis-[16rem]'}`}>
          <DigitalCompassBar
            heading={compass.heading}
            source={compass.source}
            targetName={selectedReading ? selectedReading.node.name : null}
            targetBearing={toBearing}
            relative={relative}
            distanceM={selectedReading ? selectedReading.distanceM : null}
            guidance={selectedReading ? guidance : `No stores within ${matchRadiusM} m`}
            facing={facing}
            onTurn={delta => compass.setManualHeading(compass.heading + delta)}
            onOpenSettings={compact ? undefined : () => navigate('settings')}
          />
        </div>
        {compass.permission === 'unknown' && (
          <button type="button" onClick={() => void compass.requestPermission()} className="shrink-0 rounded-full bg-emerald-400 px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-emerald-300">Use device compass</button>
        )}
        {compass.permission === 'denied' && <span className="shrink-0 text-xs text-rose-300">Compass access denied</span>}
      </div>
      <div className={compact ? 'mt-3' : 'mt-5'}>
        <DealCarousel
          entries={carouselEntries}
          heading={compass.heading}
          speedMps={speedMps}
          lastTurnAt={lastTurnAt}
          pinRequest={pinRequest}
          onFocusChange={setSelectedId}
          onNegotiate={storeId => void engine.negotiate(storeId)}
          onPay={storeId => void engine.pay(storeId)}
          emptyState={emptyDeals}
          compact={compact}
          leading={<CornerButton icon={SquareParking} label="Parked" count={commerce.parked.length} tone="amber" corner="parked" bumpKey={bumps.parked} compact={compact || activeView === 'mobile'} onClick={() => setSheet('parked')} />}
          trailing={<CornerButton icon={ShoppingBag} label="Bag" count={commerce.purchases.length} tone="emerald" corner="bag" bumpKey={bumps.bag} compact={compact || activeView === 'mobile'} onClick={() => setSheet('bag')} />}
          flashId={flashId}
          onOpen={openDeal}
        />
      </div>
      {!compact && selectedReading && (
        <div className="mt-5 grid grid-cols-3 gap-1.5 text-center sm:gap-2">
          <Readout label="You → deal" value={toBearing !== null ? `${formatBearing(toBearing)} ${cardinal(toBearing)}` : '—'} tone="emerald" />
          <Readout label="Deal → you" value={fromBearing !== null ? `${formatBearing(fromBearing)} ${cardinal(fromBearing)}` : '—'} tone="amber" />
          <Readout label="Distance" value={formatDistance(selectedReading.distanceM)} tone="plain" />
        </div>
      )}
    </section>
  );

  const renderCompactList = (limit: number) => {
    const items = dealList.slice(0, limit);
    if (items.length === 0) return <p className="text-xs text-slate-500">No deals nearby yet.</p>;
    return (
      <div className="space-y-2">
        {items.map(({ deal, reading, matches }) => (
          <DealCard
            key={deal.storeId}
            variant="compact"
            deal={deal}
            reading={reading}
            heading={compass.heading}
            selected={deal.storeId === selectedId}
            matchesIntent={matches}
            onSelect={openDeal}
            onNegotiate={storeId => void engine.negotiate(storeId)}
            onPay={storeId => void engine.pay(storeId)}
          />
        ))}
      </div>
    );
  };

  const selectedPayButton = selectedDeal && selectedDeal.status === 'agreed' ? (
    <button type="button" onClick={() => void engine.pay(selectedDeal.storeId)} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-300 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-200">
      <Wallet className="h-4 w-4" />Pay {formatZAR(selectedDeal.negotiatedPriceZAR ?? selectedDeal.ad.stickerPriceZAR)}
    </button>
  ) : null;

  const discoverLink = (
    <button type="button" onClick={() => navigate('discover')} className="mx-auto flex items-center gap-2 rounded-full bg-white/[0.05] px-4 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10">
      See all nearby deals & stores in Discover
    </button>
  );

  const cartCount = commerce.cartLines.length;
  const watchedSkus = useMemo(() => new Set(commerce.watchlist.map(item => item.sku)), [commerce.watchlist]);

  const buyCartLine = async (line: CartLine) => {
    const live = engine.deals[line.storeId];
    if (live && live.ad.campaignId === line.campaignId && live.status === 'agreed' && live.transactionToken) {
      commerce.updateCartLine(line.id, { status: 'buying', note: null });
      await engine.pay(line.storeId);
      commerce.updateCartLine(line.id, { status: 'ready', note: null });
      return;
    }
    commerce.updateCartLine(line.id, { status: 'buying', note: null });
    const result = await engine.buyAtPrice(line, line.priceZAR);
    if (!result.ok) commerce.updateCartLine(line.id, { status: 'failed', note: result.note });
  };

  const payAll = async () => {
    setPayingAll(true);
    try {
      for (const line of commerce.cartLines.filter(item => item.status !== 'buying')) await buyCartLine(line);
    } finally {
      setPayingAll(false);
    }
  };

  const controlPanelProps: ControlPanelProps = {
    autopilot,
    onAutopilotChange: setAutopilot,
    isScanning: engine.isScanning,
    lastScanAt: engine.lastScanAt,
    serviceOnline: engine.serviceOnline,
    onScanNow: () => void engine.scan(),
    dataSource,
    onDataSourceChange: changeDataSource,
    venuePref,
    onVenuePrefChange: setVenuePref,
    resolvedMode: mode,
    fix,
    geoError,
    geoSupported,
    onCenterVenue: centerVenue,
    intent,
    onIntentChange: setIntent,
    maxBudgetZAR,
    onBudgetChange: setMaxBudgetZAR,
    readings: estimate.readings,
    rssiMap: effectiveRssi,
    onRssiChange: (storeId, value) => setRssiMap(prev => ({ ...prev, [storeId]: value })),
    stats: engine.stats,
    onReset: resetSession,
    beaconScan: {
      supported: beaconScanner.supported,
      unsupportedReason: beaconScanner.unsupportedReason,
      status: beaconScanner.status,
      error: beaconScanner.error,
      heardCount: Object.keys(beaconScanner.beacons).length,
      onStart: () => void beaconScanner.start(),
      onStop: beaconScanner.stop
    },
    liveNodeIds,
    onSimulateRun: simulateShoppingRun
  };

  const renderDiscover = () => (
    <DiscoverPage
      userFix={fix}
      activeMallId={activeMallId}
      onSelectMall={handleSelectMall}
      proximityMode={proximityMode}
      onSelectProximityMode={setProximityMode}
      onNegotiateProduct={product => {
        void engine.negotiate(product.storeId);
        setSelectedId(product.storeId);
      }}
      onAddToCart={product => {
        commerce.addCartLine({
          id: `cart_${Date.now()}_${product.sku}`,
          storeId: product.storeId,
          campaignId: `promo_${product.id}`,
          sku: product.sku,
          itemName: product.itemName,
          outletName: product.storeName,
          category: product.category,
          stickerPriceZAR: product.stickerPriceZAR,
          priceZAR: Math.round(product.stickerPriceZAR * product.floorRatio),
          imageUrl: product.imageUrl,
          addedAt: Date.now(),
          status: 'ready',
          note: product.tag
        });
        addLog('META_PAY', `Added ${product.itemName} (${formatZAR(Math.round(product.stickerPriceZAR * product.floorRatio))}) to your cart.`, 'success');
      }}
      onNavigateHome={() => navigate('home')}
    />
  );

  const renderPage = () => {
    switch (page) {
      case 'discover':
        return renderDiscover();
      case 'timeline':
        return <TimelinePage timeline={commerce.timeline} watchlist={commerce.watchlist} onRemoveWatch={commerce.removeWatch} />;
      case 'cart':
        return (
          <CartPage
            lines={commerce.cartLines}
            payingAll={payingAll}
            onBuyLine={line => void buyCartLine(line)}
            onRemoveLine={commerce.removeCartLine}
            onPayAll={() => void payAll()}
          />
        );
      case 'settings':
        return (
          <SettingsPage
            profile={commerce.profile}
            onProfileChange={commerce.setProfile}
            prefs={commerce.prefs}
            onPrefsChange={commerce.setPrefs}
            controls={controlPanelProps}
            onClearHistory={commerce.clearHistory}
            autoBuyForced={dataSource === 'demo'}
            status={
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-xs text-slate-300">
                  {mode === 'outdoor' ? <Satellite className="h-3.5 w-3.5 text-sky-300" /> : <Building2 className="h-3.5 w-3.5 text-emerald-300" />}
                  {mode === 'outdoor' ? `Outdoor${fix ? `, GPS ±${Math.round(fix.accuracyM)} m` : ''}` : 'Indoor, beacons'}
                </span>
                <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${dataSource === 'demo' ? 'bg-amber-300/15 text-amber-200' : 'bg-sky-400/15 text-sky-200'}`}>{dataSource === 'demo' ? 'Demo stores' : 'Live backend'}</span>
                <button type="button" onClick={() => setAutopilot(value => !value)} aria-pressed={autopilot} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${autopilot ? 'bg-emerald-400/15 text-emerald-300' : 'bg-white/5 text-slate-400'}`}>
                  <Bot className="h-3.5 w-3.5" />Autopilot {autopilot ? 'on' : 'off'}
                </button>
              </div>
            }
          />
        );
      default:
        return renderView();
    }
  };

  const renderView = () => {
    switch (activeView) {
      case 'mobile':
        return (
          <div className="mx-auto max-w-md space-y-5">
            {renderCompassPanel()}
            {discoverLink}
          </div>
        );
      case 'watch':
        return (
          <div className="mx-auto w-full max-w-[340px] space-y-3">
            {renderCompassPanel(true)}
          </div>
        );
      case 'glasses':
        return (
          <div className="space-y-6">
            <section className="relative overflow-hidden rounded-[2rem] border border-emerald-500/20 bg-transparent p-6 shadow-none sm:p-8">
              <HeadingTape heading={compass.heading} targets={targets} selectedId={selectedId} />
              <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
                <div className="flex gap-5">
                  <div className="grid h-24 w-24 shrink-0 place-items-center rounded-full border border-emerald-400/30 bg-black/30">
                    <Navigation2 className={`h-12 w-12 transition-transform duration-300 ${facing ? 'text-emerald-300' : 'text-emerald-100'}`} style={{ transform: `rotate(${relative ?? 0}deg)` }} />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm text-emerald-300">{selectedReading ? `${selectedReading.node.name}, ${formatDistance(selectedReading.distanceM)}` : 'Looking for stores nearby'}</p>
                    <p className="text-3xl font-bold tracking-tight text-white">{selectedDeal ? selectedDeal.ad.itemName : guidance}</p>
                    {selectedDeal && (
                      <p className="text-2xl font-extrabold tabular-nums text-amber-200">
                        {formatZAR(selectedDeal.negotiatedPriceZAR ?? selectedDeal.ad.stickerPriceZAR)}
                        {selectedDeal.negotiatedPriceZAR !== null && <span className="ml-2 text-base font-medium text-slate-500 line-through">{formatZAR(selectedDeal.ad.stickerPriceZAR)}</span>}
                      </p>
                    )}
                    <p className={`text-sm font-semibold ${facing ? 'text-emerald-300' : 'text-slate-300'}`}>{guidance}</p>
                    <div className="max-w-xs pt-3">{selectedPayButton}</div>
                  </div>
                </div>
                <div>{renderCompactList(4)}</div>
              </div>
              <div className="mt-6">{turnControls}</div>
            </section>
            <ActivityLog logs={logs} heightClass="h-40" />
          </div>
        );
      case 'car':
        return (
          <div className="space-y-6">
            {renderCompassPanel()}
            <p className="text-center text-xs text-slate-500">Pay only when your car is parked.</p>
          </div>
        );
      case 'muse':
        return (
          <div className="mx-auto max-w-2xl space-y-5">
            <section className="rounded-[2rem] border border-white/[0.06] bg-white/[0.02] p-8 text-center backdrop-blur">
              <div className="flex h-16 items-end justify-center gap-1.5" aria-hidden="true">
                {[0.35, 0.7, 0.5, 1, 0.6, 0.85, 0.4, 0.65, 0.3].map((scale, index) => (
                  <span key={index} className={`w-2 rounded-full bg-gradient-to-t from-emerald-500 to-amber-200 ${engine.isScanning ? 'animate-pulse' : ''}`} style={{ height: `${Math.round(scale * 64)}px`, animationDelay: `${index * 80}ms` }} />
                ))}
              </div>
              <p className="mx-auto mt-6 max-w-md text-lg leading-relaxed text-slate-100" aria-live="polite">{directionSentence}</p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button type="button" onClick={() => speak(directionSentence)} className="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-300"><Volume2 className="h-4 w-4" />Read directions aloud</button>
                {selectedDeal?.status === 'agreed' && (
                  <button type="button" onClick={() => void engine.pay(selectedDeal.storeId)} className="inline-flex items-center gap-2 rounded-full bg-amber-300 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-200"><Wallet className="h-4 w-4" />Pay {formatZAR(selectedDeal.negotiatedPriceZAR ?? 0)}</button>
                )}
              </div>
              <p className="mt-4 text-xs text-slate-500">Agreements, payments and errors are read aloud while this view is open.</p>
            </section>
            {renderCompassPanel()}
          </div>
        );
      default:
        return (
          <div className="space-y-6">
            {renderCompassPanel()}
            {discoverLink}
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen text-slate-100 antialiased">
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#050814]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1400px] flex-nowrap items-center justify-between gap-2 px-3 py-2.5 sm:gap-3 sm:px-6 sm:py-3">
          <div className="flex min-w-0 shrink-0 items-center gap-2.5 sm:gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-amber-300 text-slate-950 shadow-[0_8px_30px_-8px_rgba(52,211,153,0.6)]">
              <CompassIcon className="h-5 w-5" />
            </span>
            <div className="hidden min-[420px]:block">
              <h1 className="text-base font-extrabold tracking-tight text-white" title="Meta Proximity Autonomous Shopping Engine">MetaPase</h1>
              <p className="hidden text-xs text-slate-400 sm:block">Deals within {MATCH_RADIUS_M} m, indoors and out</p>
            </div>
          </div>

          <div className="flex min-w-0 items-center">
            <nav className="flex max-w-full items-center gap-0.5 overflow-x-auto rounded-2xl border border-white/[0.06] bg-black/30 p-1 [scrollbar-width:none] sm:gap-1" aria-label="Device view">
              <button type="button" onClick={selectAutoView} aria-pressed={isAutoDetected} title={`Detected: ${detectedProfile}`} className={`shrink-0 rounded-xl px-2 py-1.5 text-xs font-semibold transition sm:px-2.5 ${isAutoDetected ? 'bg-white text-slate-950' : 'text-slate-400 hover:text-white'}`}>Auto</button>
              {VIEWS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => selectView(id)}
                  aria-label={`${label} view`}
                  aria-pressed={activeView === id}
                  title={label}
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-xl transition sm:h-8 sm:w-8 ${activeView === id ? (isAutoDetected ? 'text-emerald-300' : 'bg-white/10 text-white') : 'text-slate-500 hover:text-slate-200'}`}
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main className={`mx-auto max-w-[1400px] pb-36 pt-4 sm:px-6 sm:pt-6 ${page === 'home' && activeView === 'watch' ? 'px-2' : 'px-3 min-[400px]:px-4'}`}>
        <div key={page} className="metapase-fade-in">{renderPage()}</div>
      </main>

      <FloatingNav page={page} onNavigate={navigate} badges={{ cart: cartCount }} bumpKey={bumps.cart} />

      <FlightLayer flight={flight} />

      {(() => {
        if (!detailId) return null;
        const dealToRender = engine.deals[detailId] ?? carouselEntries.find(e => e.deal.storeId === detailId)?.deal;
        if (!dealToRender) return null;
        return (
          <DealDetail
            deal={dealToRender}
            reading={readingById.get(detailId)}
            heading={compass.heading}
            maxBudgetZAR={maxBudgetZAR}
            matchesIntent={matchesIntent(dealToRender.category, intent)}
            isParked={commerce.parked.some(item => item.campaignId === dealToRender.ad.campaignId)}
            isWatched={watchedSkus.has(dealToRender.ad.sku)}
            onClose={closeDeal}
            onPay={storeId => void engine.pay(storeId)}
            onNegotiate={storeId => void engine.negotiate(storeId)}
            onBuyNow={(deal, priceZAR) => engine.buyAtPrice(snapshotOf(deal), priceZAR)}
            onPark={(deal, priceZAR, bestOfferZAR) => {
              emitEvent({ type: 'parked', deal, lastStorePriceZAR: priceZAR, bestOfferZAR, reason: 'You parked this to decide later.' });
              addLog('SYSTEM', `Parked ${deal.ad.itemName} at ${formatZAR(priceZAR)}.`, 'success');
            }}
            onWatch={(deal, priceZAR) => commerce.watchItem(snapshotOf(deal), priceZAR)}
          />
        );
      })()}

      <Sheet open={sheet === 'parked'} onClose={() => setSheet(null)} title="Parked items" subtitle="The agent couldn’t reach your price on these. Buy later at the store’s last price, watch for a lower one, or let them go." icon={SquareParking} tone="amber">
        <ParkedList
          items={commerce.parked}
          watchedSkus={watchedSkus}
          onCart={id => {
            commerce.moveParkedToCart(id);
            bumpCorner('cart');
          }}
          onWatch={commerce.watchParked}
          onDiscard={commerce.discardParked}
          onCartMany={ids => {
            commerce.moveParkedToCartMany(ids);
            bumpCorner('cart');
          }}
          onWatchMany={commerce.watchParkedMany}
          onDiscardMany={commerce.discardParkedMany}
          onClearAll={commerce.clearParked}
        />
      </Sheet>
      <Sheet open={sheet === 'bag'} onClose={() => setSheet(null)} title="Shopping bag" subtitle="Everything the agent has bought for you." icon={ShoppingBag}>
        <BagList purchases={commerce.purchases} onClearAll={commerce.clearPurchases} />
      </Sheet>
    </div>
  );
}
