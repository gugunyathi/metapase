import { Footprints, Handshake, Navigation2, Cpu, Shirt, ShoppingBasket, Sparkles, Zap, MapPin } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { DealCategory } from '../types/metapase';
import { CATEGORY_STYLE } from './DealCard';
import { REAL_PRODUCTS, CatalogProduct } from '../config/products';
import { MALLS_DATABASE } from '../config/malls';

// ---------------------------------------------------------------------------
// Preview store interface
// ---------------------------------------------------------------------------

interface PreviewStore {
  id: string;
  name: string;
  mallName: string;
  tagline: string;
  category: DealCategory;
  beaconUuid: string;
  imageUrl?: string;
  products: CatalogProduct[];
}

// Generate store cards grouped by real stores
const buildPreviewStores = (): PreviewStore[] => {
  const storeMap = new Map<string, PreviewStore>();

  for (const mall of MALLS_DATABASE) {
    for (const store of mall.stores) {
      const storeProducts = REAL_PRODUCTS.filter(p => p.storeId === store.id || p.storeName.toLowerCase().includes(store.name.toLowerCase()));
      if (storeProducts.length > 0) {
        storeMap.set(store.id, {
          id: store.id,
          name: store.name,
          mallName: mall.shortName,
          tagline: `${store.tagline} · ${mall.shortName}`,
          category: store.category,
          beaconUuid: store.beaconUuid,
          imageUrl: storeProducts[0]?.imageUrl,
          products: storeProducts
        });
      }
    }
  }

  return Array.from(storeMap.values()).slice(0, 6);
};

const PREVIEW_STORES: PreviewStore[] = buildPreviewStores();

const formatZAR = (n: number): string =>
  `R\u202f${n.toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const savingsPct = (ratio: number): number => Math.round((1 - ratio) * 100);

/** Top banner of each store card with background image overlay and category icon */
function StoreBanner({ store }: { store: PreviewStore }) {
  const style = CATEGORY_STYLE[store.category];
  const Icon = style.icon;

  return (
    <div className="relative h-28 overflow-hidden bg-slate-950">
      {store.imageUrl ? (
        <>
          <img src={store.imageUrl} alt={store.name} className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-black/30" />
        </>
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${style.tile}`} />
      )}
      <Icon className="absolute -bottom-4 -right-4 h-24 w-24 text-white/10" strokeWidth={1.25} />
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent metapase-shimmer" />

      {/* store name & mall */}
      <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 max-w-[55%] truncate rounded-full border border-white/10 bg-black/60 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
        <MapPin className="h-3 w-3 text-emerald-300 shrink-0" />
        {store.name}
      </span>

      {/* distance placeholder */}
      <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
        <Navigation2 className="h-3 w-3 text-emerald-300" />
        Nearby in {store.mallName}
      </span>

      {/* category chip */}
      <span className="absolute bottom-2.5 left-3 rounded-full bg-amber-300/90 px-2.5 py-0.5 text-[10px] font-semibold text-slate-950">
        {style.label} · {store.mallName}
      </span>
    </div>
  );
}

/** A single product row inside a store card with real product thumbnail */
function ProductRow({ product }: { product: CatalogProduct }) {
  const floor = Math.round(product.stickerPriceZAR * product.floorRatio);
  const pct = savingsPct(product.floorRatio);

  return (
    <li className="flex items-center gap-2.5 border-b border-white/[0.04] py-2 last:border-0">
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-slate-800">
        <img src={product.imageUrl} alt={product.itemName} className="h-full w-full object-cover" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-slate-200">{product.itemName}</p>
        <p className="text-[10px] text-slate-400">{product.tag}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[11px] tabular-nums text-slate-500 line-through">
            {formatZAR(product.stickerPriceZAR)}
          </span>
          <span className="text-xs font-bold tabular-nums text-amber-200">
            {formatZAR(floor)}
          </span>
        </div>
        <span className="rounded-full bg-emerald-400/15 px-1.5 py-0.2 text-[9px] font-bold text-emerald-300">
          Save {pct}%
        </span>
      </div>
    </li>
  );
}

/** A single store's full placeholder card */
function StoreCard({ store, delay, matchRadius }: { store: PreviewStore; delay: number; matchRadius: number }) {
  return (
    <article
      className="metapase-placeholder-in flex flex-col overflow-hidden rounded-3xl border border-white/[0.07] bg-slate-900/70 backdrop-blur"
      style={{ animationDelay: `${delay}ms` }}
    >
      <StoreBanner store={store} />

      <div className="flex flex-1 flex-col gap-0.5 px-4 pb-4 pt-3">
        {/* store tagline */}
        <p className="mb-2 truncate text-[11px] text-slate-400">{store.tagline}</p>

        {/* product list */}
        <ul className="divide-y divide-white/[0.04]">
          {store.products.slice(0, 3).map(product => (
            <ProductRow key={product.sku} product={product} />
          ))}
        </ul>

        {/* CTA */}
        <div className="mt-3">
          <button
            type="button"
            disabled
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white/5 px-4 py-2 text-xs font-semibold text-slate-400 disabled:cursor-not-allowed"
          >
            <Handshake className="h-3.5 w-3.5" />
            Walk within {matchRadius}m to negotiate live
          </button>
        </div>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Headline scanning pill
// ---------------------------------------------------------------------------

const CATEGORY_ICONS: Record<DealCategory, LucideIcon> = {
  apparel: Shirt,
  footwear: Footprints,
  groceries: ShoppingBasket,
  electronics: Cpu,
  beauty: Sparkles,
};

function CategoryDot({ category }: { category: DealCategory }) {
  const Icon = CATEGORY_ICONS[category];
  const style = CATEGORY_STYLE[category];
  return (
    <span
      className={`grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br ${style.tile}`}
    >
      <Icon className="h-3.5 w-3.5 text-white" />
    </span>
  );
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

interface PlaceholderDealCardProps {
  isScanning: boolean;
  serviceOnline: boolean | null;
  dataSource: 'live' | 'demo';
  matchRadius?: number;
}

export default function PlaceholderDealCard({
  isScanning,
  serviceOnline,
  dataSource,
  matchRadius = 50,
}: PlaceholderDealCardProps) {
  const statusLine =
    serviceOnline === false && dataSource === 'live'
      ? 'Backend unreachable \u2014 switch to demo stores in Settings'
      : isScanning
      ? 'Scanning for Bluetooth beacons and GPS matches\u2026'
      : `Ready to match stores within ${matchRadius} m`;

  return (
    <div className="w-full space-y-5">
      {/* ── Scanning status banner ── */}
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] px-4 py-3">
        <div className="flex items-center gap-3">
          <span
            className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${
              isScanning
                ? 'bg-emerald-400/20 text-emerald-300'
                : 'bg-white/5 text-slate-400'
            }`}
          >
            <Zap className={`h-4 w-4 ${isScanning ? 'animate-pulse' : ''}`} />
          </span>
          <div>
            <p className="text-xs font-semibold text-white">Deal Engine Active</p>
            <p className="text-[11px] text-slate-400">{statusLine}</p>
          </div>
        </div>

        {/* Category icons showing supported stores */}
        <div className="hidden sm:flex items-center gap-1.5" title="Tracking across categories">
          {(['apparel', 'footwear', 'groceries', 'electronics', 'beauty'] as DealCategory[]).map(
            cat => (
              <CategoryDot key={cat} category={cat} />
            )
          )}
        </div>
      </div>

      {/* ── Section title ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-white">
            Available Stores & Real Catalog
          </h2>
          <p className="text-[11px] text-slate-400">
            Real products & prices synced across Sandton City, Fourways, Northgate & Bel Air
          </p>
        </div>
        <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-medium text-slate-400">
          Radius: {matchRadius}m
        </span>
      </div>

      {/* ── Store cards grid ── */}
      <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
        {PREVIEW_STORES.map((store, index) => (
          <StoreCard key={store.id} store={store} delay={index * 80} matchRadius={matchRadius} />
        ))}
      </div>
    </div>
  );
}
