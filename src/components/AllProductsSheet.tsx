import { useState, useMemo } from 'react';
import {
  X,
  Search,
  ShoppingBag,
  Store,
  Filter,
  Tag,
  Building2,
  ChevronDown,
  SlidersHorizontal,
  Sparkles
} from 'lucide-react';
import { REAL_PRODUCTS, type CatalogProduct } from '../config/products';
import { MALLS_DATABASE } from '../config/malls';
import { formatZAR } from '../lib/format';
import type { DealCategory } from '../types/metapase';

interface AllProductsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  initialMallId: string | 'all';
  onAddToWishlist?: (product: CatalogProduct) => void;
  onBrowseDeal?: (product: CatalogProduct) => void;
}

const CATEGORIES: { id: DealCategory | 'all'; label: string; emoji: string }[] = [
  { id: 'all', label: 'All', emoji: '✨' },
  { id: 'apparel', label: 'Fashion', emoji: '👗' },
  { id: 'footwear', label: 'Footwear', emoji: '👟' },
  { id: 'electronics', label: 'Electronics', emoji: '📱' },
  { id: 'groceries', label: 'Groceries', emoji: '🛒' },
  { id: 'beauty', label: 'Beauty', emoji: '💄' }
];

const MALL_NAMES: Record<string, string> = Object.fromEntries(
  MALLS_DATABASE.map(m => [m.id, m.shortName])
);

export default function AllProductsSheet({
  isOpen,
  onClose,
  initialMallId,
  onAddToWishlist,
  onBrowseDeal
}: AllProductsSheetProps) {
  const [mallFilter, setMallFilter] = useState<string | 'all'>(initialMallId);
  const [categoryFilter, setCategoryFilter] = useState<DealCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'name'>('name');
  const [wishedIds, setWishedIds] = useState<Set<string>>(new Set());

  const realMalls = MALLS_DATABASE.filter(m => !m.isVirtualHub);

  const products = useMemo(() => {
    let list = REAL_PRODUCTS;

    if (mallFilter !== 'all') {
      list = list.filter(p => p.mallId === mallFilter);
    }
    if (categoryFilter !== 'all') {
      list = list.filter(p => p.category === categoryFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        p =>
          p.itemName.toLowerCase().includes(q) ||
          p.storeName.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.tag.toLowerCase().includes(q)
      );
    }

    list = [...list].sort((a, b) => {
      if (sortBy === 'price_asc') return a.stickerPriceZAR - b.stickerPriceZAR;
      if (sortBy === 'price_desc') return b.stickerPriceZAR - a.stickerPriceZAR;
      return a.itemName.localeCompare(b.itemName);
    });

    return list;
  }, [mallFilter, categoryFilter, searchQuery, sortBy]);

  if (!isOpen) return null;

  const handleWish = (product: CatalogProduct) => {
    setWishedIds(prev => {
      const next = new Set(prev);
      if (next.has(product.id)) next.delete(product.id);
      else next.add(product.id);
      return next;
    });
    onAddToWishlist?.(product);
  };

  const activeMallName =
    mallFilter === 'all' ? 'All Malls' : MALL_NAMES[mallFilter] ?? mallFilter;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-slate-900 via-[#0a0f24] to-[#050814] animate-in slide-in-from-bottom duration-250">
      {/* Fixed Header */}
      <div className="shrink-0 border-b border-white/[0.07] bg-black/40 backdrop-blur px-4 pt-safe-top">
        {/* Top bar */}
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-400/15 border border-amber-400/25">
              <ShoppingBag className="h-4 w-4 text-amber-300" />
            </span>
            <div>
              <h2 className="text-sm font-black text-white">Products — {activeMallName}</h2>
              <p className="text-[10px] text-slate-400">{products.length} of {REAL_PRODUCTS.length} products</p>
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

        {/* Search bar */}
        <div className="relative pb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search products, brands, stores..."
            className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-9 pr-4 text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
          />
        </div>

        {/* Mall tabs */}
        <div className="flex gap-1.5 pb-2 overflow-x-auto [scrollbar-width:none]">
          <button
            type="button"
            onClick={() => setMallFilter('all')}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-[10px] font-bold transition border ${
              mallFilter === 'all'
                ? 'bg-amber-300 text-slate-950 border-amber-300'
                : 'bg-white/5 text-slate-300 border-white/10 hover:border-white/20'
            }`}
          >
            🏬 All Malls
          </button>
          {realMalls.map(m => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMallFilter(m.id)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-[10px] font-bold transition border whitespace-nowrap ${
                mallFilter === m.id
                  ? 'bg-amber-300 text-slate-950 border-amber-300'
                  : 'bg-white/5 text-slate-300 border-white/10 hover:border-white/20'
              }`}
            >
              {m.shortName}
            </button>
          ))}
        </div>

        {/* Category + sort row */}
        <div className="flex items-center gap-2 pb-3 overflow-x-auto [scrollbar-width:none]">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryFilter(cat.id as DealCategory | 'all')}
              className={`shrink-0 flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-bold transition border ${
                categoryFilter === cat.id
                  ? 'bg-purple-500 text-white border-purple-500'
                  : 'bg-white/5 text-slate-400 border-white/10 hover:border-purple-400/40'
              }`}
            >
              <span>{cat.emoji}</span> {cat.label}
            </button>
          ))}

          <div className="ml-auto shrink-0">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as typeof sortBy)}
              className="rounded-lg border border-white/10 bg-black/40 py-1 px-2 text-[10px] text-slate-300 focus:outline-none focus:border-amber-400"
            >
              <option value="name">A–Z</option>
              <option value="price_asc">Price ↑</option>
              <option value="price_desc">Price ↓</option>
            </select>
          </div>
        </div>
      </div>

      {/* Scrollable Product Grid */}
      <div className="flex-1 overflow-y-auto [scrollbar-width:thin] p-4">
        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
            <Search className="h-10 w-10 opacity-30" />
            <p className="text-sm">No products match your filter.</p>
            <button
              type="button"
              onClick={() => { setSearchQuery(''); setCategoryFilter('all'); setMallFilter('all'); }}
              className="text-xs text-amber-400 hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {products.map(product => {
              const wished = wishedIds.has(product.id);
              return (
                <div
                  key={product.id}
                  className="group relative flex flex-col rounded-2xl border border-white/[0.07] bg-slate-800/50 hover:border-amber-400/30 transition overflow-hidden backdrop-blur"
                >
                  {/* Product image */}
                  <div className="relative h-32 overflow-hidden bg-slate-900">
                    <img
                      src={product.imageUrl}
                      alt={product.itemName}
                      className="h-full w-full object-cover group-hover:scale-105 transition duration-300"
                      loading="lazy"
                    />
                    {/* Overlay badges */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      <span className="rounded-md bg-black/70 px-1.5 py-0.5 text-[8px] font-bold text-amber-300 backdrop-blur border border-amber-400/20">
                        {product.tag}
                      </span>
                    </div>
                    {product.isShopifyVirtual && (
                      <div className="absolute top-2 right-2">
                        <span className="rounded-md bg-purple-500/80 px-1.5 py-0.5 text-[8px] font-bold text-white backdrop-blur">
                          Virtual
                        </span>
                      </div>
                    )}

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleWish(product)}
                        className={`rounded-xl px-3 py-2 text-[10px] font-bold transition border ${
                          wished
                            ? 'bg-emerald-500 text-white border-emerald-400'
                            : 'bg-amber-300 text-slate-950 border-amber-300 hover:bg-amber-200'
                        }`}
                      >
                        {wished ? '✓ Wished' : '+ Wish'}
                      </button>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex flex-col flex-1 p-2.5 gap-1">
                    <p className="text-xs font-bold text-white line-clamp-2 leading-tight">
                      {product.itemName}
                    </p>
                    <p className="text-[9px] text-slate-400 truncate flex items-center gap-1">
                      <Store className="h-2.5 w-2.5 shrink-0" />
                      {product.storeName}
                    </p>
                    <p className="text-[9px] text-slate-500 truncate">
                      {MALL_NAMES[product.mallId] ?? product.mallId}
                    </p>
                    <div className="flex items-center justify-between mt-auto pt-1">
                      <span className="text-xs font-black text-amber-300">
                        {formatZAR(product.stickerPriceZAR)}
                      </span>
                      <span className="text-[8px] text-slate-500 capitalize">{product.category}</span>
                    </div>
                  </div>

                  {/* Action strip */}
                  <div className="flex border-t border-white/[0.05]">
                    <button
                      type="button"
                      onClick={() => handleWish(product)}
                      className={`flex-1 py-2 text-[10px] font-bold transition ${
                        wished
                          ? 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'
                          : 'text-slate-400 hover:text-amber-300 hover:bg-amber-400/10'
                      }`}
                    >
                      {wished ? '✓ Wished' : '+ Wish'}
                    </button>
                    <div className="w-px bg-white/5" />
                    <button
                      type="button"
                      onClick={() => { onBrowseDeal?.(product); onClose(); }}
                      className="flex-1 py-2 text-[10px] font-bold text-slate-400 hover:text-sky-300 hover:bg-sky-400/10 transition"
                    >
                      Browse
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer summary */}
      <div className="shrink-0 border-t border-white/[0.07] bg-black/40 backdrop-blur px-4 py-3 flex items-center justify-between">
        <p className="text-[10px] text-slate-400">
          Showing <strong className="text-white">{products.length}</strong> products
          {wishedIds.size > 0 && <> · <strong className="text-amber-300">{wishedIds.size} wished</strong></>}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/20 transition"
        >
          Done
        </button>
      </div>
    </div>
  );
}
