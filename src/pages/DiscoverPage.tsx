import { useState, useMemo } from 'react';
import { Search, MapPin, Building2, ExternalLink, Sparkles, Navigation2, Filter, ShoppingBag, Handshake, Check, Radio, Compass, X } from 'lucide-react';
import { GeoFix } from '../types/metapase';
import { MALLS_DATABASE, PROXIMITY_ZONES, ProximityRadiusMode } from '../config/malls';
import { REAL_PRODUCTS, CatalogProduct } from '../config/products';
import { CATEGORY_STYLE } from '../components/DealCard';
import { haversineM } from '../lib/geo';
import { formatDistance, formatZAR } from '../lib/format';

interface DiscoverPageProps {
  userFix: GeoFix | null;
  activeMallId: string;
  onSelectMall: (mallId: string) => void;
  proximityMode: ProximityRadiusMode;
  onSelectProximityMode: (mode: ProximityRadiusMode) => void;
  onNegotiateProduct?: (product: CatalogProduct) => void;
  onAddToCart?: (product: CatalogProduct) => void;
  onNavigateHome: () => void;
}

export default function DiscoverPage({
  userFix,
  activeMallId,
  onSelectMall,
  proximityMode,
  onSelectProximityMode,
  onNegotiateProduct,
  onAddToCart,
  onNavigateHome,
}: DiscoverPageProps) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMallFilter, setSelectedMallFilter] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [addedSku, setAddedSku] = useState<string | null>(null);

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

  const activeMall = MALLS_DATABASE.find(m => m.id === activeMallId) ?? MALLS_DATABASE[0];
  const activeZone = PROXIMITY_ZONES[proximityMode];

  const handleAdd = (product: CatalogProduct) => {
    onAddToCart?.(product);
    setAddedSku(product.sku);
    window.setTimeout(() => setAddedSku(null), 1800);
  };

  return (
    <div className="space-y-8 pb-16">
      {/* ── Page Header & Proximity Status ── */}
      <div className="rounded-3xl border border-white/[0.08] bg-gradient-to-br from-slate-900/90 via-[#0a0f26]/90 to-slate-950 p-6 sm:p-8 backdrop-blur-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-400/20 text-amber-300">
                <Compass className="h-4 w-4" />
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-300">Mall & Store Discovery Engine</span>
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">Explore Malls, Stores & Products</h1>
            <p className="mt-1 text-sm text-slate-400">
              Auto-detecting your location across Sandton City, Fourways Mall, Northgate, and Bel Air
            </p>
          </div>

          {/* Active mall & proximity badge */}
          <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/40 p-3.5 sm:min-w-[280px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-400">Active Mall Target:</span>
              <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                {activeMall.shortName}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-400">Proximity Radius:</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${activeZone.badge}`}>
                {activeZone.label}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Location Status:</span>
              <span className="text-slate-300 font-mono">
                {userFix ? `GPS ±${Math.round(userFix.accuracyM)}m` : 'Scanning GPS…'}
              </span>
            </div>
          </div>
        </div>

        {/* ── Multi-Radius Range Mode Selector ── */}
        <div className="mt-6 border-t border-white/[0.08] pt-5">
          <p className="text-xs font-semibold text-slate-300 mb-2.5 flex items-center gap-1.5">
            <Radio className="h-3.5 w-3.5 text-amber-300" />
            Switch Active Beacon & GPS Proximity Range:
          </p>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {(Object.keys(PROXIMITY_ZONES) as ProximityRadiusMode[]).map(mode => {
              const zone = PROXIMITY_ZONES[mode];
              const isSelected = proximityMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onSelectProximityMode(mode)}
                  className={`flex flex-col items-start gap-1 rounded-2xl border p-3 text-left transition ${
                    isSelected
                      ? 'border-emerald-400/60 bg-emerald-400/10 shadow-[0_0_20px_-5px_rgba(52,211,153,0.3)]'
                      : 'border-white/[0.06] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="text-xs font-bold text-white">{zone.shortLabel}</span>
                    <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${zone.badge}`}>
                      {zone.tech}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2">{zone.description}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Search Input & Instant Filter Controls ── */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search malls (e.g. Fourways, Sandton), stores (Zara, Nike, HOKA), or products (blazer, shoes, AirPods, coffee)…"
            className="w-full rounded-2xl border border-white/10 bg-slate-900/80 py-3.5 pl-12 pr-10 text-sm text-white placeholder-slate-400 backdrop-blur transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Mall & Category Filter Chips */}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          {/* Mall Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
            <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5" /> Mall:
            </span>
            <button
              type="button"
              onClick={() => setSelectedMallFilter('all')}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                selectedMallFilter === 'all'
                  ? 'bg-amber-300 text-slate-950 font-bold'
                  : 'bg-white/[0.05] text-slate-300 hover:bg-white/10'
              }`}
            >
              All 4 Malls
            </button>
            {MALLS_DATABASE.map(mall => (
              <button
                key={mall.id}
                type="button"
                onClick={() => setSelectedMallFilter(mall.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  selectedMallFilter === mall.id
                    ? 'bg-amber-300 text-slate-950 font-bold'
                    : 'bg-white/[0.05] text-slate-300 hover:bg-white/10'
                }`}
              >
                {mall.shortName}
              </button>
            ))}
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
            <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="h-3.5 w-3.5" /> Category:
            </span>
            {['all', 'apparel', 'footwear', 'groceries', 'electronics', 'beauty'].map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition ${
                  selectedCategory === cat
                    ? 'bg-emerald-400 text-slate-950 font-bold'
                    : 'bg-white/[0.05] text-slate-300 hover:bg-white/10'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Section 1: The 4 Malls Directory ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              <Building2 className="h-5 w-5 text-emerald-400" />
              South African Malls Directory ({matchingMalls.length})
            </h2>
            <p className="text-xs text-slate-400">Official retail directories with real-time BLE beacons</p>
          </div>
          {userFix && (
            <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-emerald-300 flex items-center gap-1">
              <Navigation2 className="h-3 w-3" /> Live GPS Active
            </span>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {matchingMalls.map(mall => {
            const isSelected = mall.id === activeMallId;
            return (
              <article
                key={mall.id}
                className={`flex flex-col justify-between overflow-hidden rounded-3xl border p-5 transition ${
                  isSelected
                    ? 'border-emerald-400/60 bg-emerald-500/[0.08] shadow-[0_10px_30px_-10px_rgba(52,211,153,0.3)]'
                    : 'border-white/[0.08] bg-slate-900/60 hover:border-white/20 hover:bg-slate-900/90'
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold text-slate-300">
                      {mall.suburb}
                    </span>
                    {isSelected ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400 px-2.5 py-0.5 text-[10px] font-extrabold text-slate-950">
                        <Check className="h-3 w-3" /> Active Mall
                      </span>
                    ) : mall.distanceM !== null ? (
                      <span className="text-[11px] font-semibold text-emerald-300">
                        {formatDistance(mall.distanceM)}
                      </span>
                    ) : null}
                  </div>

                  <h3 className="text-base font-bold text-white">{mall.name}</h3>
                  <p className="text-xs text-slate-400 line-clamp-2">{mall.tagline}</p>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1">
                    <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                    {mall.address}
                  </p>
                </div>

                <div className="mt-5 space-y-2 border-t border-white/[0.06] pt-3.5">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Stores tracked:</span>
                    <span className="font-bold text-white">{mall.stores.length} outlets</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectMall(mall.id)}
                      className={`flex-1 rounded-xl py-2 text-xs font-bold transition ${
                        isSelected
                          ? 'bg-emerald-400 text-slate-950 shadow'
                          : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      {isSelected ? 'Selected' : 'Set as Current Venue'}
                    </button>
                    <a
                      href={mall.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
                      title="Open Official Store Directory"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* ── Section 2: Real Products & Specials (Searchable) ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-300" />
              Real Products & Live Specials ({matchingProducts.length})
            </h2>
            <p className="text-xs text-slate-400">Real South African prices, instant bargaining & auto-match</p>
          </div>
          <span className="text-xs text-slate-400">
            Sorted by relevance
          </span>
        </div>

        {matchingProducts.length === 0 ? (
          <div className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-8 text-center text-slate-400">
            <p className="text-sm">No products found matching &ldquo;{searchQuery}&rdquo; in this filter.</p>
            <button
              type="button"
              onClick={() => { setSearchQuery(''); setSelectedMallFilter('all'); setSelectedCategory('all'); }}
              className="mt-3 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold text-white hover:bg-white/15"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {matchingProducts.map(product => {
              const style = CATEGORY_STYLE[product.category];
              const Icon = style.icon;
              const floor = Math.round(product.stickerPriceZAR * product.floorRatio);
              const savings = product.stickerPriceZAR - floor;
              const pct = Math.round((savings / product.stickerPriceZAR) * 100);
              const isAdded = addedSku === product.sku;

              return (
                <article
                  key={product.id}
                  className="group flex flex-col overflow-hidden rounded-3xl border border-white/[0.08] bg-slate-900/70 backdrop-blur transition hover:border-white/20 hover:shadow-2xl"
                >
                  {/* Photo area */}
                  <div className="relative h-48 overflow-hidden bg-slate-950">
                    <img
                      src={product.imageUrl}
                      alt={product.itemName}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-black/30" />

                    {/* Tag badge */}
                    <span className="absolute left-3 top-3 rounded-full border border-white/10 bg-black/60 px-2.5 py-1 text-[10px] font-bold text-amber-300 backdrop-blur">
                      {product.tag}
                    </span>

                    {/* Mall badge */}
                    <span className="absolute right-3 top-3 rounded-full border border-white/10 bg-black/60 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur">
                      {product.storeName}
                    </span>

                    {/* Discount badge */}
                    <span className="absolute bottom-3 left-3 rounded-full bg-emerald-400 px-2.5 py-0.5 text-[11px] font-black text-slate-950">
                      Save {pct}%
                    </span>
                  </div>

                  {/* Content area */}
                  <div className="flex flex-1 flex-col justify-between p-4 space-y-3">
                    <div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <Icon className="h-3 w-3 text-emerald-300" />
                        <span>{style.label}</span>
                        <span>·</span>
                        <span className="truncate">{product.sku}</span>
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

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            onNegotiateProduct?.(product);
                            onNavigateHome();
                          }}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-300 px-3 py-2 text-xs font-bold text-slate-950 transition hover:bg-amber-200"
                        >
                          <Handshake className="h-3.5 w-3.5" />
                          Negotiate
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAdd(product)}
                          className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
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

      {/* ── Section 3: Stores Directory Filtered ── */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
          <Building2 className="h-5 w-5 text-sky-400" />
          Stores & Outlets ({matchingStores.length})
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {matchingStores.map(store => {
            const style = CATEGORY_STYLE[store.category];
            const Icon = style.icon;
            return (
              <div
                key={store.id}
                className="flex items-center gap-3.5 rounded-2xl border border-white/[0.06] bg-slate-900/50 p-3.5 backdrop-blur hover:border-white/15 transition"
              >
                <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${style.tile}`}>
                  <Icon className="h-5 w-5 text-white" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className="truncate text-sm font-bold text-white">{store.name}</p>
                    <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-slate-300 shrink-0">
                      Level {store.floor}
                    </span>
                  </div>
                  <p className="truncate text-xs text-slate-400">{store.tagline}</p>
                  <p className="text-[10px] text-emerald-400 mt-0.5">Mall: {store.mallName}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
