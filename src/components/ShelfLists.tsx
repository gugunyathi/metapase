import { useMemo, useState } from 'react';
import { Check, Eye, ShoppingCart, Trash2, X } from 'lucide-react';
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
}

export function ParkedList({ items, watchedSkus, onCart, onWatch, onDiscard, onCartMany, onWatchMany, onDiscardMany, onClearAll }: ParkedListProps) {
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [confirmClear, setConfirmClear] = useState<boolean>(false);

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

  if (items.length === 0) {
    return <p className="rounded-3xl border border-dashed border-white/10 p-6 text-center text-sm leading-relaxed text-slate-400">Nothing parked. When the agent can’t reach your price, the item waits here so you can buy it later, watch it for a lower price, or let it go.</p>;
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
              <button type="button" onClick={() => setConfirmClear(false)} aria-label="Keep parked items" className="grid h-7 w-7 place-items-center rounded-full bg-white/[0.06] text-slate-300 transition hover:bg-white/10">
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirmClear(true)} className="rounded-full bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-rose-400/15 hover:text-rose-200">
              Clear all
            </button>
          )}
        </div>
      </div>

      <ul className="space-y-3">
        {items.map(item => {
          const isPicked = picked.has(item.id);
          return (
            <li key={item.id} className={`rounded-3xl border p-4 transition ${isPicked ? 'border-amber-300/60 bg-amber-300/[0.07]' : 'border-white/[0.06] bg-white/[0.03]'}`}>
              <button type="button" onClick={() => toggle(item.id)} aria-pressed={isPicked} aria-label={`${isPicked ? 'Deselect' : 'Select'} ${item.itemName}`} className="flex w-full gap-3 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-300">
                <span className="relative">
                  <ItemTile category={item.category} />
                  <span className={`absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full border-2 border-[#0a0f1d] transition ${isPicked ? 'bg-amber-300 text-slate-950' : 'bg-white/15 text-transparent'}`}>
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-white">{item.itemName}</span>
                  <span className="block text-xs text-slate-400">{item.outletName}, parked {formatRelative(item.parkedAt)}</span>
                  <span className="mt-2 block text-sm">
                    <span className="font-bold tabular-nums text-amber-200">{formatZAR(item.lastStorePriceZAR)}</span>
                    <span className="ml-1.5 text-xs text-slate-500">store’s last price{item.lastStorePriceZAR < item.stickerPriceZAR ? `, sticker ${formatZAR(item.stickerPriceZAR)}` : ''}</span>
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-slate-500">{item.reason}</span>
                </span>
              </button>
              {selected.length === 0 && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => onCart(item.id)} className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-amber-300 px-3 py-2 text-xs font-bold text-slate-950 transition hover:bg-amber-200">
                    <ShoppingCart className="h-3.5 w-3.5" />Buy later
                  </button>
                  <button type="button" onClick={() => onWatch(item.id)} disabled={watchedSkus.has(item.sku)} className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-white/[0.07] px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-white/[0.12] disabled:opacity-50">
                    <Eye className="h-3.5 w-3.5" />{watchedSkus.has(item.sku) ? 'Watching' : 'Watch'}
                  </button>
                  <button type="button" onClick={() => onDiscard(item.id)} className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-400 transition hover:bg-rose-400/15 hover:text-rose-200">
                    <Trash2 className="h-3.5 w-3.5" />Discard
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {selected.length > 0 && (
        <div className="metapase-sheet-in sticky bottom-0 -mx-5 mt-4 border-t border-white/[0.08] bg-[#0a0f1d]/95 px-5 pb-1 pt-3 backdrop-blur-xl">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-semibold text-white">{selected.length} selected, {formatZAR(selectedTotal)} in total</span>
            <button type="button" onClick={clearSelection} className="font-semibold text-slate-400 transition hover:text-white">Cancel</button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button type="button" onClick={() => runBulk(onCartMany)} className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-amber-300 px-3 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-amber-200">
              <ShoppingCart className="h-3.5 w-3.5" />Buy later
            </button>
            <button type="button" onClick={() => runBulk(onWatchMany)} className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-white/[0.07] px-3 py-2.5 text-xs font-semibold text-slate-100 transition hover:bg-white/[0.12]">
              <Eye className="h-3.5 w-3.5" />Watch
            </button>
            <button type="button" onClick={() => runBulk(onDiscardMany)} className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-white/[0.04] px-3 py-2.5 text-xs font-semibold text-slate-300 transition hover:bg-rose-400/15 hover:text-rose-200">
              <Trash2 className="h-3.5 w-3.5" />Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function BagList({ purchases, onClearAll }: { purchases: Purchase[]; onClearAll: () => void }) {
  const [confirmClear, setConfirmClear] = useState<boolean>(false);
  if (purchases.length === 0) {
    return <p className="rounded-3xl border border-dashed border-white/10 p-6 text-center text-sm leading-relaxed text-slate-400">Your bag is empty. Items the agent buys for you show up here with their receipts.</p>;
  }
  const spent = purchases.reduce((sum, item) => sum + item.priceZAR, 0);
  const saved = purchases.reduce((sum, item) => sum + Math.max(0, item.stickerPriceZAR - item.priceZAR), 0);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-slate-400">{purchases.length} item{purchases.length === 1 ? '' : 's'}</p>
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
            <button type="button" onClick={() => setConfirmClear(false)} aria-label="Keep bag items" className="grid h-7 w-7 place-items-center rounded-full bg-white/[0.06] text-slate-300 transition hover:bg-white/10">
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirmClear(true)} className="rounded-full bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-rose-400/15 hover:text-rose-200">
            Clear all
          </button>
        )}
      </div>
      {confirmClear && <p className="text-xs leading-relaxed text-slate-500">This empties the Bag. Your receipts stay on the Timeline.</p>}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-black/30 p-3"><p className="text-[11px] text-slate-500">Spent</p><p className="mt-1 text-lg font-bold tabular-nums text-white">{formatZAR(spent)}</p></div>
        <div className="rounded-2xl bg-black/30 p-3"><p className="text-[11px] text-slate-500">Saved</p><p className="mt-1 text-lg font-bold tabular-nums text-emerald-300">{formatZAR(saved)}</p></div>
      </div>
      <ul className="space-y-2">
        {purchases.map(item => (
          <li key={item.id} className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3">
            <ItemTile category={item.category} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{item.itemName}</p>
              <p className="truncate text-xs text-slate-400">{item.outletName}, {formatRelative(item.paidAt)}{item.referenceId ? `, ${item.referenceId}` : ''}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm font-bold tabular-nums text-amber-200">{formatZAR(item.priceZAR)}</p>
              {item.priceZAR < item.stickerPriceZAR && <p className="text-[11px] tabular-nums text-slate-500 line-through">{formatZAR(item.stickerPriceZAR)}</p>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
