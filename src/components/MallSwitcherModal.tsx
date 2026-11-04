import { useState, useMemo } from 'react';
import {
  X,
  Building2,
  MapPin,
  Navigation2,
  Zap,
  Store,
  ChevronRight,
  Search,
  Radio,
  Package,
  ShoppingBag
} from 'lucide-react';
import { MALLS_DATABASE, type MallInfo } from '../config/malls';
import { REAL_PRODUCTS, type CatalogProduct } from '../config/products';

interface MallSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeMallId: string;
  onSelectMall: (mallId: string) => void;
  onViewAllProducts: (mallId: string | 'all') => void;
}

const MALL_COLORS: Record<string, { bg: string; border: string; badge: string; dot: string }> = {
  sandton_city: {
    bg: 'from-amber-500/10 to-yellow-900/10',
    border: 'border-amber-500/30',
    badge: 'bg-amber-400/20 text-amber-300 border-amber-400/30',
    dot: 'bg-amber-400'
  },
  fourways_mall: {
    bg: 'from-emerald-500/10 to-teal-900/10',
    border: 'border-emerald-500/30',
    badge: 'bg-emerald-400/20 text-emerald-300 border-emerald-400/30',
    dot: 'bg-emerald-400'
  },
  northgate: {
    bg: 'from-sky-500/10 to-blue-900/10',
    border: 'border-sky-500/30',
    badge: 'bg-sky-400/20 text-sky-300 border-sky-400/30',
    dot: 'bg-sky-400'
  },
  bel_air: {
    bg: 'from-violet-500/10 to-purple-900/10',
    border: 'border-violet-500/30',
    badge: 'bg-violet-400/20 text-violet-300 border-violet-400/30',
    dot: 'bg-violet-400'
  },
  default: {
    bg: 'from-slate-500/10 to-slate-900/10',
    border: 'border-slate-500/30',
    badge: 'bg-slate-400/20 text-slate-300 border-slate-400/30',
    dot: 'bg-slate-400'
  }
};

function getMallColor(mallId: string) {
  return MALL_COLORS[mallId] ?? MALL_COLORS.default;
}

// Count products per mall
const PRODUCT_COUNT: Record<string, number> = {};
for (const p of REAL_PRODUCTS) {
  PRODUCT_COUNT[p.mallId] = (PRODUCT_COUNT[p.mallId] ?? 0) + 1;
}

export default function MallSwitcherModal({
  isOpen,
  onClose,
  activeMallId,
  onSelectMall,
  onViewAllProducts
}: MallSwitcherModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const realMalls = useMemo(
    () => MALLS_DATABASE.filter(m => !m.isVirtualHub),
    []
  );
  const virtualHubs = useMemo(
    () => MALLS_DATABASE.filter(m => m.isVirtualHub),
    []
  );

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return realMalls;
    return realMalls.filter(
      m =>
        m.name.toLowerCase().includes(q) ||
        m.suburb.toLowerCase().includes(q) ||
        m.city.toLowerCase().includes(q) ||
        m.tagline.toLowerCase().includes(q)
    );
  }, [searchQuery, realMalls]);

  if (!isOpen) return null;

  const handleSelect = (mallId: string) => {
    onSelectMall(mallId);
    onClose();
  };

  const totalProductCount = REAL_PRODUCTS.length;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-white/15 bg-gradient-to-b from-slate-900 via-[#0a0f24] to-[#050814] shadow-2xl [scrollbar-width:thin]">

        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/[0.07]">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-amber-400/20 to-emerald-400/20 border border-white/10">
              <Building2 className="h-4.5 w-4.5 text-amber-300" />
            </span>
            <div>
              <h2 className="text-sm font-black text-white">Switch Mall</h2>
              <p className="text-[10px] text-slate-400">{MALLS_DATABASE.filter(m => !m.isVirtualHub).length} malls · {totalProductCount} products</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-slate-400 hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* View All Products button (global) */}
        <div className="px-5 pt-4 pb-2">
          <button
            type="button"
            onClick={() => { onViewAllProducts('all'); onClose(); }}
            className="w-full flex items-center justify-between rounded-2xl border border-amber-400/30 bg-gradient-to-r from-amber-400/15 to-amber-600/10 p-3.5 hover:border-amber-400/60 hover:from-amber-400/25 transition group"
          >
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/30">
                <ShoppingBag className="h-5 w-5" />
              </span>
              <div className="text-left">
                <p className="text-sm font-bold text-amber-200">View All Products — All Malls</p>
                <p className="text-[10px] text-amber-300/70">{totalProductCount} products across all malls & virtual hubs</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-amber-300/60 group-hover:text-amber-300 transition" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search malls, suburbs..."
              className="w-full rounded-xl border border-white/10 bg-black/40 py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Mall List */}
        <div className="px-5 pb-2 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 pb-1">
            Shopping Centres
          </p>

          {filtered.map(mall => {
            const isActive = mall.id === activeMallId;
            const colors = getMallColor(mall.id);
            const productCount = PRODUCT_COUNT[mall.id] ?? 0;

            return (
              <div
                key={mall.id}
                className={`rounded-2xl border bg-gradient-to-br ${colors.bg} ${
                  isActive ? colors.border + ' shadow-lg' : 'border-white/[0.07] hover:border-white/20'
                } transition`}
              >
                <div className="flex items-start gap-3 p-3.5">
                  {/* Active dot */}
                  <div className="mt-1 flex flex-col items-center gap-1 shrink-0">
                    <div className={`h-2.5 w-2.5 rounded-full ${isActive ? colors.dot + ' shadow-lg' : 'bg-slate-700'}`} />
                    {isActive && <div className={`h-1 w-1 rounded-full ${colors.dot} opacity-50`} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-white">{mall.name}</span>
                      {isActive && (
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold border ${colors.badge}`}>
                          Active Mall
                        </span>
                      )}
                      {mall.isVirtualHub && (
                        <span className="rounded-full px-2 py-0.5 text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          Virtual Hub
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{mall.tagline}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-2.5 w-2.5 text-slate-500" />
                        {mall.suburb}, {mall.city}
                      </span>
                      <span className="flex items-center gap-1">
                        <Store className="h-2.5 w-2.5 text-slate-500" />
                        {mall.stores.length} stores
                      </span>
                      {productCount > 0 && (
                        <span className="flex items-center gap-1">
                          <Package className="h-2.5 w-2.5 text-slate-500" />
                          {productCount} products
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action buttons row */}
                <div className="flex items-center gap-2 px-3.5 pb-3 pt-0">
                  <button
                    type="button"
                    onClick={() => { onViewAllProducts(mall.id); onClose(); }}
                    className="flex items-center gap-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 text-[10px] font-semibold text-slate-300 transition"
                  >
                    <Package className="h-3 w-3" />
                    View Products
                  </button>

                  {!isActive ? (
                    <button
                      type="button"
                      onClick={() => handleSelect(mall.id)}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-bold transition border ${colors.badge} hover:opacity-90`}
                    >
                      <Navigation2 className="h-3 w-3" />
                      Switch Here
                    </button>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                      <Radio className="h-3 w-3" />
                      Scanning {mall.stores.length} beacons
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Virtual Hubs section */}
        {virtualHubs.length > 0 && (
          <div className="px-5 pb-5 mt-2 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 pb-1">
              Virtual Transit Hubs
            </p>
            {virtualHubs.map(hub => {
              const isActive = hub.id === activeMallId;
              return (
                <div
                  key={hub.id}
                  className={`flex items-center gap-3 rounded-2xl border ${
                    isActive ? 'border-purple-500/40 bg-purple-900/15' : 'border-white/[0.07] bg-white/[0.02]'
                  } p-3 hover:border-purple-500/30 transition`}
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    <Zap className="h-4 w-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">{hub.shortName}</p>
                    <p className="text-[10px] text-slate-400 truncate">{hub.suburb} · {hub.stores.length} virtual store</p>
                  </div>
                  {!isActive ? (
                    <button
                      type="button"
                      onClick={() => handleSelect(hub.id)}
                      className="rounded-lg bg-purple-500/20 border border-purple-500/30 px-2.5 py-1.5 text-[10px] font-bold text-purple-300 hover:bg-purple-500/30 transition"
                    >
                      Switch
                    </button>
                  ) : (
                    <span className="text-[10px] text-purple-400 font-bold">Active</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
