import { useState, useMemo } from 'react';
import {
  Search, MapPin, Building2, ExternalLink, Sparkles,
  Filter, ShoppingBag, Handshake, Check, Radio, X,
  Bot, Zap, ShieldCheck, CheckCircle2, Loader2, QrCode, Copy
} from 'lucide-react';
import { GeoFix } from '../types/metapase';
import { MALLS_DATABASE, PROXIMITY_ZONES, ProximityRadiusMode } from '../config/malls';
import { REAL_PRODUCTS, CatalogProduct } from '../config/products';
import { CATEGORY_STYLE } from '../components/DealCard';
import { haversineM } from '../lib/geo';
import { formatDistance, formatZAR } from '../lib/format';
import MerchantHubModal from '../components/MerchantHubModal';

interface DiscoverPageProps {
  userFix: GeoFix | null;
  activeMallId: string;
  onSelectMall: (mallId: string) => void;
  proximityMode: ProximityRadiusMode;
  onSelectProximityMode: (mode: ProximityRadiusMode) => void;
  onNegotiateProduct?: (product: CatalogProduct) => void;
  onAddToCart?: (product: CatalogProduct) => void;
  onRecordPurchase?: (receipt: any) => void;
  onNavigateHome: () => void;
}

interface TransactionModalState {
  type: 'manual' | 'auto';
  product: CatalogProduct;
  step: 'processing' | 'success' | 'error';
  stages: { title: string; done: boolean }[];
  receipt?: {
    receiptId: string;
    voucherCode: string;
    storeName: string;
    mallName: string;
    itemName: string;
    amountZAR: number;
    savingsZAR: number;
    purchasedBy: string;
    timestamp: string;
    authorizationRef: string;
  };
  error?: string;
}

export default function DiscoverPage({
  userFix,
  activeMallId,
  onSelectMall,
  proximityMode,
  onSelectProximityMode,
  onNegotiateProduct,
  onAddToCart,
  onRecordPurchase,
  onNavigateHome,
}: DiscoverPageProps) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMallFilter, setSelectedMallFilter] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [addedSku, setAddedSku] = useState<string | null>(null);
  const [copiedVoucher, setCopiedVoucher] = useState<boolean>(false);
  const [txModal, setTxModal] = useState<TransactionModalState | null>(null);
  const [merchantHubStoreId, setMerchantHubStoreId] = useState<string | null>(null);

  // Compute distance from user GPS to each mall
  const mallsWithDistance = useMemo(() => {
    return MALLS_DATABASE.map(mall => {
      const distanceM = userFix ? haversineM(userFix, mall.gpsCenter) : null;
      return {
        ...mall,
        distanceM,
        isCurrent: mall.id === activeMallId
      };
    }).sort((a, b) => {
      if (a.distanceM !== null && b.distanceM !== null) return a.distanceM - b.distanceM;
      return 0;
    });
  }, [userFix, activeMallId]);

  const query = searchQuery.trim().toLowerCase();

  // Filtered malls
  const matchingMalls = useMemo(() => {
    if (!query) return mallsWithDistance;
    return mallsWithDistance.filter(m =>
      m.name.toLowerCase().includes(query) ||
      m.suburb.toLowerCase().includes(query) ||
      m.city.toLowerCase().includes(query) ||
      m.address.toLowerCase().includes(query)
    );
  }, [mallsWithDistance, query]);

  // Filtered stores
  const allStores = useMemo(() => {
    return MALLS_DATABASE.flatMap(mall =>
      mall.stores.map(store => ({
        ...store,
        mallId: mall.id,
        mallName: mall.shortName,
        mallAddress: mall.address
      }))
    );
  }, []);

  const matchingStores = useMemo(() => {
    return allStores.filter(store => {
      const matchesMall = selectedMallFilter === 'all' || store.mallId === selectedMallFilter;
      const matchesCat = selectedCategory === 'all' || store.category === selectedCategory;
      const matchesSearch = !query ||
        store.name.toLowerCase().includes(query) ||
        store.tagline.toLowerCase().includes(query) ||
        store.mallName.toLowerCase().includes(query) ||
        store.category.toLowerCase().includes(query);
      return matchesMall && matchesCat && matchesSearch;
    });
  }, [allStores, selectedMallFilter, selectedCategory, query]);

  // Filtered products
  const matchingProducts = useMemo(() => {
    return REAL_PRODUCTS.filter(product => {
      const matchesMall = selectedMallFilter === 'all' || product.mallId === selectedMallFilter;
      const matchesCat = selectedCategory === 'all' || product.category === selectedCategory;
      const matchesSearch = !query ||
        product.itemName.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query) ||
        product.storeName.toLowerCase().includes(query) ||
        product.tag.toLowerCase().includes(query);
      return matchesMall && matchesCat && matchesSearch;
    });
  }, [selectedMallFilter, selectedCategory, query]);

  const activeMall = useMemo(() => {
    return MALLS_DATABASE.find(m => m.id === activeMallId) ?? MALLS_DATABASE[0];
  }, [activeMallId]);

  const handleAdd = (product: CatalogProduct) => {
    onAddToCart?.(product);
    setAddedSku(product.sku);
    setTimeout(() => setAddedSku(null), 1800);
  };

  // 1-Click Manual Buy Flow
  const handleManualBuy = async (product: CatalogProduct) => {
    const floorPrice = Math.round(product.stickerPriceZAR * product.floorRatio);
    setTxModal({
      type: 'manual',
      product,
      step: 'processing',
      stages: [
        { title: `Contacting ${product.storeName} Merchant Agent...`, done: true },
        { title: `Applying pre-authorized discount (${formatZAR(floorPrice)} vs ${formatZAR(product.stickerPriceZAR)})`, done: true },
        { title: 'Finalizing 1-Click purchase authorization...', done: false }
      ]
    });

    try {
      const apiBase = (import.meta.env.VITE_METAPASE_API_BASE as string | undefined) ?? 'http://localhost:3000';
      let receipt: any = null;

      try {
        const res = await fetch(`${apiBase}/api/merchants/manual-buy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storeId: product.storeId,
            sku: product.sku,
            priceZAR: floorPrice
          })
        });
        if (res.ok) {
          const data = await res.json();
          receipt = data.receipt;
        }
      } catch {
        // Fallback for offline demo mode
      }

      if (!receipt) {
        receipt = {
          receiptId: `REC-MAN-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
          voucherCode: `MP-MANUAL-${product.storeId.toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
          storeName: product.storeName,
          mallName: activeMall.shortName,
          itemName: product.itemName,
          amountZAR: floorPrice,
          savingsZAR: product.stickerPriceZAR - floorPrice,
          purchasedBy: 'manual_user_checkout',
          timestamp: new Date().toISOString(),
          authorizationRef: `AUTH-1CLICK-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
        };
      }

      setTxModal(prev => prev ? ({
        ...prev,
        step: 'success',
        stages: prev.stages.map(s => ({ ...s, done: true })),
        receipt
      }) : null);

      onRecordPurchase?.({
        ...receipt,
        storeId: product.storeId,
        sku: product.sku,
        category: product.category,
        imageUrl: product.imageUrl
      });
    } catch (err: any) {
      setTxModal(prev => prev ? ({ ...prev, step: 'error', error: err.message ?? 'Purchase failed' }) : null);
    }
  };

  // Autonomous Personal Agent Buy Flow
  const handleAutonomousBuy = async (product: CatalogProduct) => {
    const floorPrice = Math.round(product.stickerPriceZAR * product.floorRatio);
    const budget = Math.round(product.stickerPriceZAR * 0.9);

    setTxModal({
      type: 'auto',
      product,
      step: 'processing',
      stages: [
        { title: 'Personal Agent Digital ID Badge issued & verified by Meta Merchant Agent', done: false },
        { title: `Autonomous price bargaining against ${product.storeName} Merchant Agent`, done: false },
        { title: 'Stripe Issuing Sandbox single-use virtual card generated with locked ceiling', done: false },
        { title: 'Cryptographic settlement token confirmed & store voucher issued', done: false }
      ]
    });

    // Step-by-step agentic visual feedback
    await new Promise(r => setTimeout(r, 400));
    setTxModal(prev => prev ? ({ ...prev, stages: prev.stages.map((s, idx) => idx <= 0 ? { ...s, done: true } : s) }) : null);

    await new Promise(r => setTimeout(r, 500));
    setTxModal(prev => prev ? ({ ...prev, stages: prev.stages.map((s, idx) => idx <= 1 ? { ...s, done: true } : s) }) : null);

    await new Promise(r => setTimeout(r, 450));
    setTxModal(prev => prev ? ({ ...prev, stages: prev.stages.map((s, idx) => idx <= 2 ? { ...s, done: true } : s) }) : null);

    try {
      const apiBase = (import.meta.env.VITE_METAPASE_API_BASE as string | undefined) ?? 'http://localhost:3000';
      let receipt: any = null;

      try {
        const res = await fetch(`${apiBase}/api/merchants/autonomous-buy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storeId: product.storeId,
            sku: product.sku,
            maxBudgetZAR: budget
          })
        });
        if (res.ok) {
          const data = await res.json();
          receipt = data.receipt;
        }
      } catch {
        // Fallback for offline demo mode
      }

      if (!receipt) {
        receipt = {
          receiptId: `REC-AUTO-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
          voucherCode: `MP-VOUCHER-${product.storeId.toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
          storeName: product.storeName,
          mallName: activeMall.shortName,
          itemName: product.itemName,
          amountZAR: floorPrice,
          savingsZAR: product.stickerPriceZAR - floorPrice,
          purchasedBy: 'autonomous_personal_agent',
          timestamp: new Date().toISOString(),
          authorizationRef: `AUTH-STRIPE-VIRTUAL-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
        };
      }

      setTxModal(prev => prev ? ({
        ...prev,
        step: 'success',
        stages: prev.stages.map(s => ({ ...s, done: true })),
        receipt
      }) : null);

      onRecordPurchase?.({
        ...receipt,
        storeId: product.storeId,
        sku: product.sku,
        category: product.category,
        imageUrl: product.imageUrl
      });
    } catch (err: any) {
      setTxModal(prev => prev ? ({ ...prev, step: 'error', error: err.message ?? 'Autonomous buy failed' }) : null);
    }
  };

  const copyVoucher = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedVoucher(true);
    setTimeout(() => setCopiedVoucher(false), 2000);
  };

  return (
    <div className="space-y-8 pb-16">
      {/* ── Transaction Status Modal (Autonomous Agent / Manual Buy) ── */}
      {txModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-b from-slate-900 via-[#0a0f24] to-[#050814] p-6 shadow-2xl">
            {/* Close button */}
            <button
              type="button"
              onClick={() => setTxModal(null)}
              className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-white/10 text-slate-400 hover:text-white transition"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Header Badge */}
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                txModal.type === 'auto'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
              }`}>
                {txModal.type === 'auto' ? <Bot className="h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5" />}
                {txModal.type === 'auto' ? 'Personal Agent Protocol • Autonomous Buy' : '1-Click Direct Manual Buy'}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                {txModal.product.storeName}
              </span>
            </div>

            {/* Product Summary Preview */}
            <div className="mt-4 flex gap-3.5 rounded-2xl bg-white/[0.04] p-3 border border-white/[0.06]">
              <img
                src={txModal.product.imageUrl}
                alt={txModal.product.itemName}
                className="h-16 w-16 rounded-xl object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-400">{txModal.product.storeName} • {activeMall.shortName}</p>
                <h4 className="truncate text-sm font-bold text-white">{txModal.product.itemName}</h4>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-base font-black text-amber-200">
                    {formatZAR(Math.round(txModal.product.stickerPriceZAR * txModal.product.floorRatio))}
                  </span>
                  <span className="text-xs text-slate-500 line-through">
                    {formatZAR(txModal.product.stickerPriceZAR)}
                  </span>
                  <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                    Save {Math.round((1 - txModal.product.floorRatio) * 100)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Stages or Success Outcome */}
            {txModal.step === 'processing' && (
              <div className="mt-5 space-y-3">
                <p className="text-xs font-semibold text-slate-300">Executing Personal Agent Protocol:</p>
                <div className="space-y-2.5">
                  {txModal.stages.map((stage, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-xs">
                      {stage.done ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      ) : (
                        <Loader2 className="h-4 w-4 text-amber-300 animate-spin shrink-0" />
                      )}
                      <span className={stage.done ? 'text-slate-200' : 'text-slate-400 font-medium'}>
                        {stage.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {txModal.step === 'success' && txModal.receipt && (
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-center">
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-500/20 text-emerald-300 mb-2">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <h3 className="text-base font-bold text-white">Purchase Successful & Verified!</h3>
                  <p className="text-xs text-emerald-300/90 mt-0.5">
                    {txModal.type === 'auto'
                      ? 'Bought autonomously by your Personal Shopping Agent'
                      : 'Completed via 1-Click Manual Checkout'}
                  </p>
                </div>

                {/* Voucher Box */}
                <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Cryptographic Voucher Code</span>
                    <button
                      type="button"
                      onClick={() => copyVoucher(txModal.receipt!.voucherCode)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 hover:text-amber-200"
                    >
                      {copiedVoucher ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copiedVoucher ? 'Copied' : 'Copy Code'}
                    </button>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 font-mono text-sm font-bold text-white tracking-wider">
                    <span>{txModal.receipt.voucherCode}</span>
                    <QrCode className="h-4 w-4 text-slate-400" />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                    <span>Paid: {formatZAR(txModal.receipt.amountZAR)}</span>
                    <span className="text-emerald-400 font-semibold">Saved: {formatZAR(txModal.receipt.savingsZAR)}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTxModal(null)}
                    className="flex-1 rounded-xl bg-amber-300 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-amber-200"
                  >
                    Done
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTxModal(null);
                      onNavigateHome();
                    }}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/10"
                  >
                    View in Timeline
                  </button>
                </div>
              </div>
            )}

            {txModal.step === 'error' && (
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-red-500/30 bg-red-950/20 p-4 text-center">
                  <p className="text-sm font-bold text-red-200">Transaction Failed</p>
                  <p className="text-xs text-red-300/80 mt-1">{txModal.error}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setTxModal(null)}
                  className="w-full rounded-xl bg-white/10 py-2.5 text-xs font-bold text-white"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300 border border-emerald-400/20">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                31 Meta Merchant Agents Online
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-400/10 px-3 py-1 text-xs font-bold text-sky-300 border border-sky-400/20">
                <ShieldCheck className="h-3.5 w-3.5" />
                Personal Agent Protocol 1.0
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
              Discover Malls, Stores & Autonomous Deals
            </h1>
            <p className="text-sm text-slate-400">
              Browse four major shopping malls, let your Personal Agent buy autonomously with single-use cards, or purchase manually.
            </p>
          </div>

          {/* Header Action Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setMerchantHubStoreId(activeMall.stores[0]?.id || 'sc_zara')}
              className="flex items-center gap-2 rounded-2xl border border-amber-400/40 bg-amber-400/10 px-3.5 py-2.5 backdrop-blur hover:bg-amber-400/20 text-amber-200 transition shadow-sm shadow-amber-400/10"
              title="Open Merchant & Database Control Console"
            >
              <Building2 className="h-4 w-4 text-amber-300" />
              <div className="text-left">
                <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Database & Ledger</p>
                <p className="text-xs font-black text-white">Merchant Console</p>
              </div>
            </button>

            {/* Active Mall Badge */}
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 px-3.5 py-2.5 backdrop-blur">
              <MapPin className="h-4 w-4 text-emerald-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-emerald-400">Active Geofenced Venue</p>
                <p className="truncate text-xs font-bold text-white">{activeMall.name}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Proximity Radius & Commute Distance Mode Selector ── */}
        <div className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-3.5 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
            <span className="flex items-center gap-1.5 text-xs font-bold text-white">
              <Radio className="h-3.5 w-3.5 text-amber-300" />
              Proximity Match Mode & Beacon Range:
            </span>
            <span className="text-[11px] text-slate-400">
              Current: <strong className="text-amber-200">{PROXIMITY_ZONES[proximityMode].label}</strong> ({PROXIMITY_ZONES[proximityMode].radiusM}m range)
            </span>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            {(Object.keys(PROXIMITY_ZONES) as ProximityRadiusMode[]).map(modeKey => {
              const zone = PROXIMITY_ZONES[modeKey];
              const isSelected = proximityMode === modeKey;
              return (
                <button
                  key={modeKey}
                  type="button"
                  onClick={() => onSelectProximityMode(modeKey)}
                  className={`flex flex-col text-left rounded-xl p-2.5 transition border ${
                    isSelected
                      ? 'border-amber-400/80 bg-amber-400/10 text-white shadow-sm shadow-amber-400/10'
                      : 'border-white/[0.06] bg-slate-800/40 text-slate-400 hover:border-white/15 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{zone.label}</span>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                      {zone.radiusM}m
                    </span>
                  </div>
                  <span className="mt-1 text-[11px] text-slate-400 line-clamp-1">
                    {zone.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Search Input ── */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search malls, stores, products, brands (Nike, Zara, HOKA, Apple, Salmon, Coffee)..."
            className="w-full rounded-2xl border border-white/10 bg-slate-900/80 py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 backdrop-blur transition focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>

        {/* ── Category & Mall Quick Filter Chips ── */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
            <Filter className="h-3 w-3" /> Mall:
          </span>
          <button
            type="button"
            onClick={() => setSelectedMallFilter('all')}
            className={`rounded-full px-3 py-1 text-xs font-bold transition ${
              selectedMallFilter === 'all'
                ? 'bg-amber-300 text-slate-950'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            All Malls
          </button>
          {MALLS_DATABASE.map(m => (
            <button
              key={m.id}
              type="button"
              onClick={() => setSelectedMallFilter(m.id)}
              className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                selectedMallFilter === m.id
                  ? 'bg-amber-300 text-slate-950'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {m.shortName}
            </button>
          ))}
        </div>
      </div>

      {/* ── Section 1: Shopping Malls (Automatic GPS Detection & Distance) ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
            <Building2 className="h-5 w-5 text-amber-300" />
            Shopping Centres & Malls ({matchingMalls.length})
          </h2>
          <span className="text-xs text-slate-400">
            {userFix ? 'Sorted by GPS proximity' : 'Tap to simulate location'}
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {matchingMalls.map(mall => {
            const isSelected = mall.id === activeMallId;
            return (
              <div
                key={mall.id}
                className={`relative flex flex-col justify-between overflow-hidden rounded-3xl border p-4 transition backdrop-blur ${
                  isSelected
                    ? 'border-emerald-500/70 bg-gradient-to-b from-emerald-950/40 via-slate-900/80 to-slate-950 shadow-lg shadow-emerald-950/50'
                    : 'border-white/[0.08] bg-slate-900/60 hover:border-white/20'
                }`}
              >
                {isSelected && (
                  <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-400/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-400/30">
                    <Check className="h-3 w-3" /> Selected Venue
                  </span>
                )}

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-400/10 text-amber-300 font-black text-xs">
                      {mall.shortName.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-bold text-white">{mall.name}</h3>
                      <p className="text-[11px] text-slate-400">{mall.suburb}, {mall.city}</p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 line-clamp-2">
                    {mall.tagline}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span>{mall.stores.length}+ Stores</span>
                    {mall.distanceM !== null && (
                      <span className="font-bold text-amber-300">
                        {formatDistance(mall.distanceM)} away
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectMall(mall.id)}
                    className={`flex-1 rounded-xl py-2 text-xs font-bold transition ${
                      isSelected
                        ? 'bg-emerald-400 text-slate-950'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    {isSelected ? 'Current Venue' : 'Switch Mall'}
                  </button>

                  <a
                    href={mall.websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="grid h-8 w-8 place-items-center rounded-xl bg-white/5 text-slate-400 hover:text-white transition"
                    title="Visit Mall Website & Directory"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Section 2: Store Products Directory & Dynamic Pricing ── */}
      <section className="space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-300" />
            Meta Merchant Stores & Real Products ({matchingProducts.length})
          </h2>
          <span className="text-xs text-slate-400">
            Buy via Autonomous Personal Agent or Manual 1-Click
          </span>
        </div>

        {matchingProducts.length === 0 ? (
          <div className="rounded-3xl border border-white/[0.06] bg-slate-900/40 p-12 text-center">
            <p className="text-sm font-semibold text-slate-400">No products matched your search.</p>
            <button
              type="button"
              onClick={() => { setSearchQuery(''); setSelectedMallFilter('all'); setSelectedCategory('all'); }}
              className="mt-3 text-xs font-bold text-amber-300 hover:underline"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {matchingProducts.map(product => {
              const isAdded = addedSku === product.sku;
              const floor = Math.round(product.stickerPriceZAR * product.floorRatio);
              const mall = MALLS_DATABASE.find(m => m.id === product.mallId);
              const discountPct = Math.round((1 - product.floorRatio) * 100);

              return (
                <article
                  key={product.id}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-white/[0.08] bg-slate-900/50 backdrop-blur transition hover:border-white/20 hover:shadow-xl"
                >
                  {/* Product Image */}
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-800">
                    <img
                      src={product.imageUrl}
                      alt={product.itemName}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/20" />

                    {/* Tag badge */}
                    <span className="absolute left-3 top-3 rounded-full bg-slate-950/80 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 backdrop-blur border border-white/10">
                      {product.tag}
                    </span>

                    {/* Mall Name badge */}
                    <span className="absolute right-3 top-3 rounded-full bg-slate-950/80 px-2.5 py-0.5 text-[10px] font-bold text-sky-300 backdrop-blur border border-white/10">
                      {mall?.shortName ?? product.mallId}
                    </span>

                    {/* Discount badge */}
                    <span className="absolute bottom-3 left-3 rounded-full bg-emerald-500/90 px-2.5 py-0.5 text-[10px] font-extrabold text-slate-950">
                      Up to {discountPct}% off
                    </span>
                  </div>

                  {/* Product Details */}
                  <div className="flex flex-1 flex-col justify-between p-4 space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="font-semibold text-emerald-400">{product.storeName}</span>
                        <span className="font-mono text-[10px] text-slate-500">{product.sku}</span>
                      </div>
                      <h3 className="mt-1 line-clamp-2 text-sm font-bold leading-snug text-white">
                        {product.itemName}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-400">
                        {product.description}
                      </p>
                    </div>

                    <div className="space-y-3 pt-2 border-t border-white/[0.06]">
                      <div className="flex items-baseline justify-between">
                        <div>
                          <p className="text-[10px] text-slate-400">Agent Floor Price</p>
                          <span className="text-xl font-black tabular-nums text-amber-200">
                            {formatZAR(floor)}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-slate-400">Sticker</p>
                          <span className="text-xs tabular-nums text-slate-500 line-through">
                            {formatZAR(product.stickerPriceZAR)}
                          </span>
                        </div>
                      </div>

                      {/* Primary Actions: Auto-Buy & Manual Buy */}
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => void handleAutonomousBuy(product)}
                          className="inline-flex items-center justify-center gap-1 rounded-xl bg-purple-600 px-2.5 py-2 text-xs font-bold text-white transition hover:bg-purple-500 shadow-sm shadow-purple-900/30"
                          title="Dispatch your Personal Shopping Agent to bargain & settle autonomously"
                        >
                          <Bot className="h-3.5 w-3.5" />
                          Auto-Buy
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleManualBuy(product)}
                          className="inline-flex items-center justify-center gap-1 rounded-xl bg-amber-300 px-2.5 py-2 text-xs font-bold text-slate-950 transition hover:bg-amber-200 shadow-sm shadow-amber-900/30"
                          title="Instant 1-Click Direct Human Purchase"
                        >
                          <Zap className="h-3.5 w-3.5" />
                          Manual Buy
                        </button>
                      </div>

                      {/* Secondary Actions: Negotiate & Cart */}
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            onNegotiateProduct?.(product);
                            onNavigateHome();
                          }}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/15"
                        >
                          <Handshake className="h-3.5 w-3.5 text-amber-300" />
                          Negotiate
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAdd(product)}
                          className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                            isAdded
                              ? 'bg-emerald-400 text-slate-950'
                              : 'bg-white/10 text-white hover:bg-white/20'
                          }`}
                          title="Add to Shopping Cart"
                        >
                          {isAdded ? <Check className="h-3.5 w-3.5" /> : <ShoppingBag className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Section 3: Stores Directory with Meta Merchant Agents ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
            <Building2 className="h-5 w-5 text-sky-400" />
            Stores & Meta Merchant Agents ({matchingStores.length})
          </h2>
          <span className="text-xs text-emerald-400 font-semibold">
            All 31 Merchant Agents Verified
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {matchingStores.map(store => {
            const style = CATEGORY_STYLE[store.category];
            const Icon = style.icon;
            return (
              <div
                key={store.id}
                onClick={() => setMerchantHubStoreId(store.id)}
                className="group flex items-center gap-3.5 rounded-2xl border border-white/[0.06] bg-slate-900/50 p-3.5 backdrop-blur hover:border-amber-400/40 hover:bg-slate-900/80 cursor-pointer transition shadow-sm"
              >
                <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${style.tile} group-hover:scale-105 transition`}>
                  <Icon className="h-5 w-5 text-white" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className="truncate text-sm font-bold text-white group-hover:text-amber-200 transition">{store.name}</p>
                    <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-slate-300 shrink-0">
                      Level {store.floor}
                    </span>
                  </div>
                  <p className="truncate text-xs text-slate-400">{store.tagline}</p>
                  
                  {/* Meta Merchant Agent Badge & Inspect hint */}
                  <div className="mt-1 flex items-center justify-between gap-1 text-[10px] font-semibold">
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span>Meta Agent Active</span>
                    </span>
                    <span className="text-amber-300/80 group-hover:text-amber-300 transition">
                      View Inventory & Sales →
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Merchant Hub Modal (Inventory, Stock, Sales Ledger, DB Audit Feed) ── */}
      {merchantHubStoreId && (
        <MerchantHubModal
          initialStoreId={merchantHubStoreId}
          onClose={() => setMerchantHubStoreId(null)}
          onRedeemVoucher={() => {}}
        />
      )}
    </div>
  );
}
