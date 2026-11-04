import { useMemo, useState } from 'react';
import {
  Check,
  Eye,
  ShoppingCart,
  Trash2,
  X,
  Sparkles,
  LoaderCircle,
  Tag,
  Store,
  Receipt,
  BadgePercent,
  CheckCircle2
} from 'lucide-react';
import { ParkedItem, Purchase } from '../types/metapase';
import { formatRelative, formatZAR } from '../lib/format';
import ItemTile from './ItemTile';

interface ParkedListProps {
  items: ParkedItem[];
  watchedSkus: Set<string>;
  onCart: (id: string) => void;
  onWatch: (id: string) => void;
  onDiscard: (id: string) => void;
  onCartMany: (ids: string[]) => void;
  onWatchMany: (ids: string[]) => void;
  onDiscardMany: (ids: string[]) => void;
  onClearAll: () => void;
  onNegotiateAndBuy?: (item: ParkedItem) => Promise<void> | void;
}

export function ParkedList({
  items,
  watchedSkus,
  onCart,
  onWatch,
  onDiscard,
  onCartMany,
  onWatchMany,
  onDiscardMany,
  onClearAll,
  onNegotiateAndBuy
}: ParkedListProps) {
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [confirmClear, setConfirmClear] = useState<boolean>(false);
  const [negotiatingId, setNegotiatingId] = useState<string | null>(null);
  const [bulkNegotiating, setBulkNegotiating] = useState<boolean>(false);

  const selected = useMemo(() => items.filter(item => picked.has(item.id)).map(item => item.id), [items, picked]);
  const allSelected = items.length > 0 && selected.length === items.length;
  const selectedTotal = items.filter(item => picked.has(item.id)).reduce((sum, item) => sum + item.lastStorePriceZAR, 0);

  const toggle = (id: string) => {
    setConfirmClear(false);
    setPicked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setPicked(new Set());

  const runBulk = (action: (ids: string[]) => void) => {
    action(selected);
    clearSelection();
  };

  const handleNegotiateSingle = async (item: ParkedItem) => {
    if (!onNegotiateAndBuy || negotiatingId) return;
    setNegotiatingId(item.id);
    try {
      await onNegotiateAndBuy(item);
    } finally {
      setNegotiatingId(null);
    }
  };

  const handleNegotiateBulk = async () => {
    if (!onNegotiateAndBuy || bulkNegotiating) return;
    setBulkNegotiating(true);
    try {
      const chosenItems = items.filter(item => picked.has(item.id));
      for (const item of chosenItems) {
        await onNegotiateAndBuy(item);
      }
      clearSelection();
    } finally {
      setBulkNegotiating(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-white/10 p-8 text-center text-sm leading-relaxed text-slate-400 space-y-2">
        <p className="text-2xl">🅿️</p>
        <p className="font-semibold text-white">Nothing parked right now.</p>
        <p className="text-xs text-slate-500">
          When the agent can’t reach your price while walking past stores, items wait here so you can negotiate a discount and buy them anytime.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs text-slate-400">{items.length} item{items.length === 1 ? '' : 's'}. Tap to select.</p>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => (allSelected ? clearSelection() : setPicked(new Set(items.map(item => item.id))))}
            className="rounded-full bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
          >
            {allSelected ? 'Deselect all' : 'Select all'}
          </button>
          {confirmClear ? (
            <span className="inline-flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  onClearAll();
                  clearSelection();
                  setConfirmClear(false);
                }}
                className="rounded-full bg-rose-400 px-3 py-1.5 text-xs font-bold text-slate-950 transition hover:bg-rose-300"
              >
                Clear {items.length}
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                aria-label="Keep parked items"
                className="grid h-7 w-7 place-items-center rounded-full bg-white/[0.06] text-slate-300 transition hover:bg-white/10"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="rounded-full bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-rose-400/15 hover:text-rose-200"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      <ul className="space-y-3">
        {items.map(item => {
          const isPicked = picked.has(item.id);
          const isNegotiating = negotiatingId === item.id;
          const estimatedFloorPrice = Math.round(item.stickerPriceZAR * 0.8);
          const potentialSavings = Math.max(0, item.stickerPriceZAR - estimatedFloorPrice);
          const potentialDiscountPct = Math.round((potentialSavings / item.stickerPriceZAR) * 100);

          return (
            <li
              key={item.id}
              className={`rounded-3xl border p-4 transition space-y-3 ${
                isPicked
                  ? 'border-amber-300/60 bg-amber-300/[0.07]'
                  : 'border-white/[0.06] bg-white/[0.03]'
              }`}
            >
              <button
                type="button"
                onClick={() => toggle(item.id)}
                aria-pressed={isPicked}
                aria-label={`${isPicked ? 'Deselect' : 'Select'} ${item.itemName}`}
                className="flex w-full gap-3 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-300"
              >
                <span className="relative shrink-0">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.itemName}
                      className="h-16 w-16 rounded-2xl object-cover border border-white/10 bg-slate-800"
                    />
                  ) : (
                    <ItemTile category={item.category} />
                  )}
                  <span
                    className={`absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full border-2 border-[#0a0f1d] transition ${
                      isPicked ? 'bg-amber-300 text-slate-950' : 'bg-white/15 text-transparent'
                    }`}
                  >
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                </span>

                <div className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-white">{item.itemName}</span>
                  <span className="block text-xs text-slate-400 mt-0.5">
                    🏪 {item.outletName} · parked {formatRelative(item.parkedAt)}
                  </span>
                  <div className="mt-2 flex items-baseline gap-2 flex-wrap">
                    <span className="font-extrabold tabular-nums text-amber-200 text-sm">
                      {formatZAR(item.lastStorePriceZAR)}
                    </span>
                    {item.lastStorePriceZAR < item.stickerPriceZAR && (
                      <span className="text-xs text-slate-500 line-through tabular-nums">
                        {formatZAR(item.stickerPriceZAR)}
                      </span>
                    )}
                    <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 rounded-md px-1.5 py-0.5">
                      Target AI Bargain: ~{formatZAR(estimatedFloorPrice)} (-{potentialDiscountPct}%)
                    </span>
                  </div>
                  <span className="mt-1 block text-xs leading-relaxed text-slate-400 italic">
                    {item.reason}
                  </span>
                </div>
              </button>

              {/* ACTION BUTTONS */}
              {selected.length === 0 && (
                <div className="space-y-2 pt-1 border-t border-white/[0.06]">
                  {/* Primary Negotiate & Buy Now Button */}
                  <button
                    type="button"
                    disabled={isNegotiating}
                    onClick={() => handleNegotiateSingle(item)}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-400 to-amber-300 py-2.5 px-4 text-xs font-black text-slate-950 transition hover:brightness-110 active:scale-[0.99] shadow-lg shadow-emerald-500/20 disabled:opacity-60 cursor-pointer"
                  >
                    {isNegotiating ? (
                      <>
                        <LoaderCircle className="h-4 w-4 animate-spin text-slate-950" />
                        <span>AI Negotiating Discount with Merchant AI...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 text-slate-950" />
                        <span>Negotiate & Buy Now</span>
                        <span className="rounded-full bg-slate-950/20 px-2 py-0.5 text-[10px] font-bold">
                          AI Closes Deal at Discount
                        </span>
                      </>
                    )}
                  </button>

                  {/* Secondary Options */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => onCart(item.id)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] px-3 py-2 text-xs font-bold text-slate-200 transition"
                      title="Move to cart at store's last price"
                    >
                      <ShoppingCart className="h-3.5 w-3.5" />
                      Buy later
                    </button>
                    <button
                      type="button"
                      onClick={() => onWatch(item.id)}
                      disabled={watchedSkus.has(item.sku)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-white/[0.06] px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/[0.12] disabled:opacity-50"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      {watchedSkus.has(item.sku) ? 'Watching' : 'Watch'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDiscard(item.id)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-400 transition hover:bg-rose-400/15 hover:text-rose-200"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Discard
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* Sticky Bulk Action Panel */}
      {selected.length > 0 && (
        <div className="metapase-sheet-in sticky bottom-0 -mx-5 mt-4 border-t border-white/[0.08] bg-[#0a0f1d]/95 px-5 pb-2 pt-3 backdrop-blur-xl space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-white">
              {selected.length} selected, {formatZAR(selectedTotal)} in total
            </span>
            <button
              type="button"
              onClick={clearSelection}
              className="font-semibold text-slate-400 transition hover:text-white"
            >
              Cancel
            </button>
          </div>

          {/* Bulk Negotiate & Buy Now */}
          {onNegotiateAndBuy && (
            <button
              type="button"
              disabled={bulkNegotiating}
              onClick={handleNegotiateBulk}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-400 to-amber-300 py-2.5 px-4 text-xs font-black text-slate-950 transition hover:brightness-110 shadow-lg shadow-emerald-500/20 disabled:opacity-60 cursor-pointer"
            >
              {bulkNegotiating ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin text-slate-950" />
                  <span>AI Negotiating {selected.length} Deals with Merchants...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-slate-950" />
                  <span>Negotiate & Buy All ({selected.length}) at Discount</span>
                </>
              )}
            </button>
          )}

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => runBulk(onCartMany)}
              className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-white/10 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/20"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              Buy later
            </button>
            <button
              type="button"
              onClick={() => runBulk(onWatchMany)}
              className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-white/[0.07] px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-white/[0.12]"
            >
              <Eye className="h-3.5 w-3.5" />
              Watch
            </button>
            <button
              type="button"
              onClick={() => runBulk(onDiscardMany)}
              className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-rose-400/15 hover:text-rose-200"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function BagList({
  purchases,
  onClearAll
}: {
  purchases: Purchase[];
  onClearAll: () => void;
}) {
  const [confirmClear, setConfirmClear] = useState<boolean>(false);

  if (purchases.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-white/10 p-8 text-center text-sm leading-relaxed text-slate-400 space-y-2">
        <p className="text-2xl">🛍️</p>
        <p className="font-semibold text-white">Your bag is empty.</p>
        <p className="text-xs text-slate-500">
          Items the agent negotiates and buys for you appear here with verified digital receipts, original prices, and negotiated savings.
        </p>
      </div>
    );
  }

  const spent = purchases.reduce((sum, item) => sum + item.priceZAR, 0);
  const saved = purchases.reduce((sum, item) => sum + Math.max(0, item.stickerPriceZAR - item.priceZAR), 0);
  const totalSticker = purchases.reduce((sum, item) => sum + item.stickerPriceZAR, 0);
  const overallDiscountPct = totalSticker > 0 ? Math.round((saved / totalSticker) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="text-xs text-slate-400 font-bold">
            {purchases.length} Bought Item{purchases.length === 1 ? '' : 's'}
          </p>
          <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
            {overallDiscountPct}% Average Savings
          </span>
        </div>

        {confirmClear ? (
          <span className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                onClearAll();
                setConfirmClear(false);
              }}
              className="rounded-full bg-rose-400 px-3 py-1.5 text-xs font-bold text-slate-950 transition hover:bg-rose-300"
            >
              Clear {purchases.length}
            </button>
            <button
              type="button"
              onClick={() => setConfirmClear(false)}
              aria-label="Keep bag items"
              className="grid h-7 w-7 place-items-center rounded-full bg-white/[0.06] text-slate-300 transition hover:bg-white/10"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            className="rounded-full bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-rose-400/15 hover:text-rose-200"
          >
            Clear all
          </button>
        )}
      </div>

      {confirmClear && (
        <p className="text-xs leading-relaxed text-slate-500">
          This empties the Bag. Your receipts stay securely logged on the Timeline and database.
        </p>
      )}

      {/* Financial Summary Strip */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-black/40 border border-white/10 p-3">
          <p className="text-[11px] text-slate-400 font-medium">Total Spent</p>
          <p className="mt-1 text-lg font-black tabular-nums text-white">{formatZAR(spent)}</p>
        </div>
        <div className="rounded-2xl bg-emerald-950/20 border border-emerald-500/30 p-3">
          <p className="text-[11px] text-emerald-400 font-medium">Negotiated Savings</p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <p className="text-lg font-black tabular-nums text-emerald-300">{formatZAR(saved)}</p>
            <span className="text-[10px] font-bold text-emerald-400">({overallDiscountPct}% saved)</span>
          </div>
        </div>
      </div>

      {/* Bought Items List */}
      <ul className="space-y-3">
        {purchases.map(item => {
          const originalPrice = item.stickerPriceZAR;
          const finalPrice = item.priceZAR;
          const discountAmount = Math.max(0, originalPrice - finalPrice);
          const discountPct = originalPrice > 0 ? Math.round((discountAmount / originalPrice) * 100) : 0;

          return (
            <li
              key={item.id}
              className="rounded-2xl border border-white/[0.08] bg-slate-900/70 p-3.5 backdrop-blur hover:border-emerald-500/40 transition space-y-3 shadow-md"
            >
              {/* Product Header */}
              <div className="flex items-start gap-3">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.itemName}
                    className="h-14 w-14 rounded-xl object-cover shrink-0 border border-white/10 bg-slate-800"
                  />
                ) : (
                  <ItemTile category={item.category} size="sm" />
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="truncate text-sm font-bold text-white">{item.itemName}</p>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[9px] font-black text-emerald-300">
                      <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                      Bought & Claimed
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 mt-0.5 truncate">
                    🏪 {item.outletName} · {formatRelative(item.paidAt)}
                  </p>

                  {item.referenceId && (
                    <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                      Voucher Ref: <strong className="text-slate-300">{item.referenceId}</strong>
                    </p>
                  )}
                </div>
              </div>

              {/* Price Breakdown: Original, Final Negotiated, Amount Negotiated, and % Discount */}
              <div className="rounded-xl bg-black/40 border border-white/[0.06] p-2.5 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-baseline gap-3">
                  {/* Final Discounted Marked Down Price */}
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Final Negotiated</span>
                    <span className="text-base font-black tabular-nums text-amber-300">
                      {formatZAR(finalPrice)}
                    </span>
                  </div>

                  {/* Original Sticker Price */}
                  {discountAmount > 0 && (
                    <div className="pl-3 border-l border-white/10">
                      <span className="text-[10px] text-slate-500 block">Original Price</span>
                      <span className="text-xs text-slate-400 line-through tabular-nums">
                        {formatZAR(originalPrice)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Amount Negotiated & Discount Percentage Badges */}
                {discountAmount > 0 ? (
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-[11px] font-bold text-emerald-300">
                      Negotiated: -{formatZAR(discountAmount)}
                    </span>
                    <span className="rounded-lg bg-emerald-400 text-slate-950 px-2 py-1 text-[11px] font-black shadow-sm flex items-center gap-1">
                      <BadgePercent className="h-3.5 w-3.5" />
                      {discountPct}% OFF
                    </span>
                  </div>
                ) : (
                  <span className="text-[10px] font-medium text-slate-400">
                    Paid at sticker price
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
