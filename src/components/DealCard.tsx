import { CircleCheck, Cpu, Footprints, Handshake, LoaderCircle, Navigation2, Shirt, ShoppingBasket, Sparkles, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Deal, DealCategory, DealStatus, NodeReading } from '../types/metapase';
import { MAX_ROUNDS } from '../config/venue';
import { cardinal, signedAngleDelta } from '../lib/geo';
import { formatDistance, formatZAR } from '../lib/format';

export const CATEGORY_STYLE: Record<DealCategory, { icon: LucideIcon; tile: string; label: string }> = {
  apparel: { icon: Shirt, tile: 'from-rose-500/80 via-fuchsia-600/50 to-slate-900', label: 'Apparel' },
  footwear: { icon: Footprints, tile: 'from-orange-500/80 via-amber-600/45 to-slate-900', label: 'Footwear' },
  groceries: { icon: ShoppingBasket, tile: 'from-lime-500/70 via-emerald-700/45 to-slate-900', label: 'Groceries' },
  electronics: { icon: Cpu, tile: 'from-sky-500/80 via-indigo-600/45 to-slate-900', label: 'Electronics' },
  beauty: { icon: Sparkles, tile: 'from-violet-500/80 via-pink-600/45 to-slate-900', label: 'Beauty' }
};

export const STATUS_META: Record<DealStatus, { label: string; chip: string }> = {
  discovered: { label: 'New deal', chip: 'bg-amber-300/90 text-slate-950' },
  negotiating: { label: 'Negotiating', chip: 'bg-white/85 text-slate-950' },
  agreed: { label: 'Deal agreed', chip: 'bg-emerald-300 text-slate-950' },
  paying: { label: 'Paying', chip: 'bg-emerald-300 text-slate-950' },
  paid: { label: 'Paid', chip: 'bg-sky-300 text-slate-950' },
  no_deal: { label: 'No deal', chip: 'bg-rose-300 text-slate-950' },
  over_budget: { label: 'Over budget', chip: 'bg-rose-300 text-slate-950' },
  failed: { label: 'Failed', chip: 'bg-rose-300 text-slate-950' }
};

interface DealCardProps {
  deal: Deal;
  reading?: NodeReading;
  heading: number;
  selected: boolean;
  matchesIntent: boolean;
  variant?: 'full' | 'compact';
  onSelect: (storeId: string) => void;
  onNegotiate: (storeId: string) => void;
  onPay: (storeId: string) => void;
}

const BUTTON = 'inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 disabled:cursor-not-allowed';

export default function DealCard({ deal, reading, heading, selected, matchesIntent, variant = 'full', onSelect, onNegotiate, onPay }: DealCardProps) {
  const style = CATEGORY_STYLE[deal.category];
  const Icon = style.icon;
  const status = STATUS_META[deal.status];
  const inRange = reading?.inRange ?? false;
  const relative = reading && reading.bearingDeg !== null ? signedAngleDelta(reading.bearingDeg, heading) : null;
  const sticker = deal.ad.stickerPriceZAR;
  const price = deal.negotiatedPriceZAR;
  const savingsPct = price !== null && sticker > 0 ? Math.round((1 - price / sticker) * 100) : null;
  const lastRound = deal.rounds[deal.rounds.length - 1];
  const roundNumber = Math.min(deal.rounds.length + 1, MAX_ROUNDS);
  const distanceText = reading ? formatDistance(reading.distanceM) : '—';
  const directionText = reading && reading.bearingDeg !== null ? cardinal(reading.bearingDeg) : 'Here';

  const detail = deal.note
    ?? (deal.status === 'paid' && deal.referenceId ? `Reference ${deal.referenceId}` : null)
    ?? (lastRound && lastRound.storePriceZAR !== null
      ? `${deal.rounds.length} round${deal.rounds.length === 1 ? '' : 's'}, store's last price ${formatZAR(lastRound.storePriceZAR)}`
      : `SKU ${deal.ad.sku}`);

  const renderAction = () => {
    switch (deal.status) {
      case 'negotiating':
        return <button type="button" disabled className={`${BUTTON} bg-white/5 text-slate-300`}><LoaderCircle className="h-4 w-4 animate-spin" />Round {roundNumber} of {MAX_ROUNDS}</button>;
      case 'agreed':
        return <button type="button" onClick={() => onPay(deal.storeId)} className={`${BUTTON} bg-amber-300 text-slate-950 hover:bg-amber-200`}><Wallet className="h-4 w-4" />Pay {formatZAR(price ?? sticker)}</button>;
      case 'paying':
        return <button type="button" disabled className={`${BUTTON} bg-amber-300/60 text-slate-950`}><LoaderCircle className="h-4 w-4 animate-spin" />Confirming payment</button>;
      case 'paid':
        return <button type="button" disabled className={`${BUTTON} bg-sky-400/15 text-sky-200`}><CircleCheck className="h-4 w-4" />Paid</button>;
      default:
        return (
          <button type="button" onClick={() => onNegotiate(deal.storeId)} disabled={!inRange} className={`${BUTTON} bg-white/10 text-white hover:bg-white/15 disabled:opacity-50`}>
            <Handshake className="h-4 w-4" />{!inRange ? 'Out of range' : deal.status === 'discovered' ? 'Negotiate now' : 'Try again'}
          </button>
        );
    }
  };

  if (variant === 'compact') {
    return (
      <article className={`flex items-center gap-3 rounded-2xl border p-3 transition ${selected ? 'border-emerald-400/50 bg-emerald-400/[0.06]' : 'border-white/[0.06] bg-white/[0.03]'} ${matchesIntent ? '' : 'opacity-60'}`}>
        <button type="button" onClick={() => onSelect(deal.storeId)} aria-pressed={selected} className="flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-2 focus-visible:outline-emerald-300">
          {deal.ad.imageUrl ? (
            <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-slate-800">
              <img src={deal.ad.imageUrl} alt={deal.ad.itemName} className="h-full w-full object-cover" />
            </span>
          ) : (
            <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${style.tile}`}><Icon className="h-5 w-5 text-white" /></span>
          )}
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-white">{deal.ad.itemName}</span>
            <span className="flex items-center gap-1 truncate text-xs text-slate-400">
              <Navigation2 className="h-3 w-3 shrink-0 text-emerald-300" style={{ transform: `rotate(${relative ?? 0}deg)` }} />
              {deal.location.outletName}, {distanceText}
            </span>
          </span>
        </button>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-sm font-bold tabular-nums text-amber-200">{formatZAR(price ?? sticker)}</span>
          {deal.status === 'agreed'
            ? <button type="button" onClick={() => onPay(deal.storeId)} className="rounded-full bg-amber-300 px-3 py-1 text-xs font-semibold text-slate-950 hover:bg-amber-200">Pay</button>
            : <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.chip}`}>{status.label}</span>}
        </div>
      </article>
    );
  }

  return (
    <article className={`flex flex-col overflow-hidden rounded-3xl border bg-slate-900/60 backdrop-blur transition ${selected ? 'border-emerald-400/50 shadow-[0_0_0_1px_rgba(52,211,153,0.2),0_24px_60px_-24px_rgba(16,185,129,0.45)]' : 'border-white/[0.06] hover:border-white/15'} ${matchesIntent ? '' : 'opacity-70'}`}>
      <button type="button" onClick={() => onSelect(deal.storeId)} aria-pressed={selected} className="group relative h-44 overflow-hidden bg-slate-950 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-emerald-300">
        {deal.ad.imageUrl ? (
          <>
            <img src={deal.ad.imageUrl} alt={deal.ad.itemName} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-black/40" />
          </>
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${style.tile}`}>
            <Icon className="absolute -bottom-5 -right-4 h-32 w-32 text-white/15" strokeWidth={1.25} />
          </div>
        )}
        <span className="absolute left-4 top-4 max-w-[55%] truncate rounded-full border border-white/10 bg-black/60 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">{deal.location.outletName}</span>
        <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-white/10 bg-black/60 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
          <Navigation2 className="h-3.5 w-3.5 text-emerald-300 transition-transform duration-300" style={{ transform: `rotate(${relative ?? 0}deg)` }} />
          {distanceText} {directionText}
        </span>
        <span className={`absolute bottom-4 left-4 rounded-full px-2.5 py-1 text-[11px] font-semibold ${status.chip}`}>{status.label}</span>
        <span className="sr-only">Open details for {deal.ad.itemName}</span>
      </button>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="line-clamp-2 min-h-[2.75em] text-[15px] font-semibold leading-snug text-white">{deal.ad.itemName}</h3>
          <p className="truncate text-xs text-slate-400">{style.label}</p>
        </div>
        <div className="flex items-end justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold tabular-nums text-amber-200">{formatZAR(price ?? sticker)}</span>
            {price !== null && <span className="text-sm tabular-nums text-slate-500 line-through">{formatZAR(sticker)}</span>}
          </div>
          {savingsPct !== null && savingsPct > 0 && <span className="rounded-full bg-emerald-400/15 px-2.5 py-1 text-xs font-bold text-emerald-300">{savingsPct}% off</span>}
        </div>
        <p className="line-clamp-2 min-h-[2.5rem] text-xs leading-relaxed text-slate-400">{deal.note ?? (!matchesIntent ? "Outside your filter, so the agent won't negotiate it on its own." : detail)}</p>
        <div className="mt-auto pt-1">{renderAction()}</div>
      </div>
    </article>
  );
}
