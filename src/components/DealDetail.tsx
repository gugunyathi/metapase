import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, CircleCheck, Eye, Handshake, LoaderCircle, Navigation2, SquareParking, Wallet } from 'lucide-react';
import { BuyResult, Deal, NodeReading } from '../types/metapase';
import { CATEGORY_STYLE, STATUS_META } from './DealCard';
import { MAX_ROUNDS } from '../config/venue';
import { cardinal, signedAngleDelta } from '../lib/geo';
import { formatBearing, formatDistance, formatZAR } from '../lib/format';

interface DealDetailProps {
  deal: Deal;
  reading: NodeReading | undefined;
  heading: number;
  maxBudgetZAR: number;
  matchesIntent: boolean;
  isParked: boolean;
  isWatched: boolean;
  onClose: () => void;
  onPay: (storeId: string) => void;
  onNegotiate: (storeId: string) => void;
  onBuyNow: (deal: Deal, priceZAR: number) => Promise<BuyResult>;
  onPark: (deal: Deal, priceZAR: number, bestOfferZAR: number | null) => void;
  onWatch: (deal: Deal, priceZAR: number) => void;
}

const BUTTON = 'inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 disabled:cursor-not-allowed disabled:opacity-50';

const sideText = (relative: number | null): string => {
  if (relative === null) return 'right where you are';
  const angle = Math.abs(relative);
  if (angle <= 15) return 'straight ahead';
  if (angle >= 150) return 'behind you';
  return `${Math.round(angle)}° to your ${relative < 0 ? 'left' : 'right'}`;
};

export default function DealDetail({ deal, reading, heading, maxBudgetZAR, matchesIntent, isParked, isWatched, onClose, onPay, onNegotiate, onBuyNow, onPark, onWatch }: DealDetailProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [buying, setBuying] = useState<boolean>(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const style = CATEGORY_STYLE[deal.category];
  const Icon = style.icon;
  const status = STATUS_META[deal.status];
  const sticker = deal.ad.stickerPriceZAR;
  const lastCounter = [...deal.rounds].reverse().find(round => round.storeResponse === 'countered' && round.storePriceZAR !== null)?.storePriceZAR ?? null;
  const bestOffer = deal.rounds.length ? deal.rounds[deal.rounds.length - 1].agentOfferZAR : null;
  const price = deal.negotiatedPriceZAR ?? lastCounter ?? sticker;
  const savings = Math.max(0, sticker - price);
  const discountPct = sticker > 0 ? Math.round((savings / sticker) * 100) : 0;
  const overBudget = price - maxBudgetZAR;
  const bearing = reading?.bearingDeg ?? null;
  const relative = bearing !== null ? signedAngleDelta(bearing, heading) : null;
  const busy = buying || deal.status === 'negotiating' || deal.status === 'paying';
  const priceLabel = deal.negotiatedPriceZAR !== null ? 'Agreed price' : lastCounter !== null ? 'Store’s last price' : 'Sticker price';

  const buyNow = async (amount: number) => {
    setBuying(true);
    setMessage(null);
    const result = await onBuyNow(deal, amount);
    setBuying(false);
    if (result.ok) {
      setMessage({ tone: 'ok', text: `Bought for ${formatZAR(amount)}.` });
      window.setTimeout(onClose, 500);
    } else {
      setMessage({ tone: 'error', text: result.note ?? 'The store didn’t accept this price.' });
    }
  };

  const renderPrimary = () => {
    switch (deal.status) {
      case 'agreed':
        return (
          <button type="button" onClick={() => { onPay(deal.storeId); onClose(); }} className={`${BUTTON} w-full bg-amber-300 text-slate-950 hover:bg-amber-200`}>
            <Wallet className="h-4 w-4" />Pay {formatZAR(price)}
          </button>
        );
      case 'paid':
        return <button type="button" disabled className={`${BUTTON} w-full bg-sky-400/15 text-sky-200`}><CircleCheck className="h-4 w-4" />Paid{deal.referenceId ? `, ${deal.referenceId}` : ''}</button>;
      case 'negotiating':
      case 'paying':
        return <button type="button" disabled className={`${BUTTON} w-full bg-white/10 text-slate-200`}><LoaderCircle className="h-4 w-4 animate-spin" />{deal.status === 'paying' ? 'Confirming payment' : `Agent negotiating, round ${Math.min(deal.rounds.length + 1, MAX_ROUNDS)} of ${MAX_ROUNDS}`}</button>;
      default:
        return (
          <button type="button" onClick={() => void buyNow(price)} disabled={busy} className={`${BUTTON} w-full bg-amber-300 text-slate-950 hover:bg-amber-200`}>
            {buying ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}Buy now for {formatZAR(price)}
          </button>
        );
    }
  };

  const canNegotiate = deal.status === 'discovered' || deal.status === 'no_deal' || deal.status === 'over_budget' || deal.status === 'failed';

  return (
    <div className="metapase-fade-in fixed inset-0 z-[80] overflow-y-auto bg-[#050814]/95 backdrop-blur-xl" role="dialog" aria-modal="true" aria-label={deal.ad.itemName}>
      <div className="mx-auto flex min-h-full max-w-3xl flex-col px-4 pb-48 sm:px-6" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <button ref={closeRef} type="button" onClick={onClose} className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10">
            <ArrowLeft className="h-4 w-4" />Back
          </button>
          <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${status.chip}`}>{status.label}</span>
        </div>

        <section className={`metapase-sheet-in relative h-56 min-[400px]:h-64 sm:h-80 overflow-hidden rounded-[2rem] bg-slate-950`}>
          {deal.ad.imageUrl ? (
            <>
              <img src={deal.ad.imageUrl} alt={deal.ad.itemName} className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-black/30" />
            </>
          ) : (
            <div className={`absolute inset-0 bg-gradient-to-br ${style.tile}`}>
              <Icon className="absolute -bottom-10 -right-8 h-64 w-64 text-white/15" strokeWidth={1.1} />
            </div>
          )}
          <span className="absolute left-5 top-5 max-w-[55%] truncate rounded-full border border-white/10 bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">{deal.location.outletName}</span>
          <span className="absolute right-5 top-5 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-white/10 bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
            <Navigation2 className="h-3.5 w-3.5 text-emerald-300 transition-transform duration-300" style={{ transform: `rotate(${relative ?? 0}deg)` }} />
            {reading ? formatDistance(reading.distanceM) : '—'}
          </span>
          <div className="absolute inset-x-5 bottom-5">
            <p className="text-xs font-semibold text-emerald-300">{style.label}{matchesIntent ? ' · Matches your intent' : ''}</p>
            <h2 className="mt-1 line-clamp-2 text-xl font-extrabold leading-tight tracking-tight text-white min-[400px]:text-2xl sm:text-3xl">{deal.ad.itemName}</h2>
          </div>
        </section>

        <section className="mt-6">
          <p className="text-xs text-slate-400">{priceLabel}</p>
          <div className="mt-1 flex flex-wrap items-end gap-3">
            <span className="text-4xl font-extrabold tabular-nums tracking-tight text-amber-200 sm:text-5xl">{formatZAR(price)}</span>
            {price < sticker && <span className="pb-1.5 text-lg tabular-nums text-slate-500 line-through">{formatZAR(sticker)}</span>}
            {discountPct > 0 && <span className="mb-2 rounded-full bg-emerald-400/15 px-3 py-1 text-sm font-bold text-emerald-300">{discountPct}% off</span>}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <div className="rounded-2xl bg-white/[0.04] p-3"><p className="text-[11px] text-slate-500">You save</p><p className="mt-1 text-lg font-bold tabular-nums text-emerald-300">{formatZAR(savings)}</p></div>
            <div className="rounded-2xl bg-white/[0.04] p-3"><p className="text-[11px] text-slate-500">Agent’s best offer</p><p className="mt-1 text-lg font-bold tabular-nums text-white">{bestOffer !== null ? formatZAR(bestOffer) : '—'}</p></div>
            <div className="col-span-2 rounded-2xl bg-white/[0.04] p-3 sm:col-span-1">
              <p className="text-[11px] text-slate-500">Your budget</p>
              <p className={`mt-1 text-sm font-bold ${overBudget > 0 ? 'text-rose-300' : 'text-emerald-300'}`}>{overBudget > 0 ? `${formatZAR(overBudget)} over` : `Within ${formatZAR(maxBudgetZAR)}`}</p>
            </div>
          </div>
          {deal.note && <p className="mt-4 rounded-2xl bg-white/[0.04] px-4 py-3 text-sm leading-relaxed text-slate-300">{deal.note}</p>}
        </section>

        <section className="mt-8">
          <h3 className="text-sm font-semibold text-white">Details</h3>
          <dl className="mt-3 divide-y divide-white/[0.06] rounded-3xl border border-white/[0.06] bg-white/[0.02] text-sm">
            <div className="flex justify-between gap-4 px-4 py-3"><dt className="text-slate-400">Store</dt><dd className="text-right text-white">{deal.location.outletName}</dd></div>
            <div className="flex justify-between gap-4 px-4 py-3"><dt className="text-slate-400">Where</dt><dd className="text-right text-white">{reading ? `${formatDistance(reading.distanceM)}, ${sideText(relative)}` : 'Out of range'}</dd></div>
            <div className="flex justify-between gap-4 px-4 py-3"><dt className="text-slate-400">Bearing</dt><dd className="text-right tabular-nums text-white">{bearing !== null ? `${formatBearing(bearing)} ${cardinal(bearing)}` : '—'}</dd></div>
            <div className="flex justify-between gap-4 px-4 py-3"><dt className="text-slate-400">Sticker price</dt><dd className="text-right tabular-nums text-white">{formatZAR(sticker)}</dd></div>
            <div className="flex justify-between gap-4 px-4 py-3"><dt className="text-slate-400">SKU</dt><dd className="truncate text-right text-white">{deal.ad.sku}</dd></div>
          </dl>
        </section>

        <section className="mt-8">
          <h3 className="text-sm font-semibold text-white">Negotiation</h3>
          {deal.rounds.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">The agent hasn’t made an offer yet.</p>
          ) : (
            <ol className="mt-3 space-y-2">
              {deal.rounds.map(round => (
                <li key={round.round} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-2xl bg-white/[0.03] px-4 py-3 text-sm">
                  <span className="text-slate-400">Round {round.round}</span>
                  <span className="tabular-nums text-white">You offered {formatZAR(round.agentOfferZAR)}</span>
                  <span className={`tabular-nums ${round.storeResponse === 'accepted' ? 'text-emerald-300' : round.storeResponse === 'countered' ? 'text-amber-200' : 'text-rose-300'}`}>
                    {round.storeResponse === 'accepted' ? `Accepted ${formatZAR(round.storePriceZAR ?? round.agentOfferZAR)}` : round.storeResponse === 'countered' ? `Store asked ${formatZAR(round.storePriceZAR ?? 0)}` : 'Store ended talks'}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-white/[0.08] bg-[#050814]/95 backdrop-blur-xl" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}>
        <div className="mx-auto max-w-3xl space-y-2 px-4 pt-3 sm:px-6">
          {message && <p className={`text-center text-xs font-semibold ${message.tone === 'ok' ? 'text-emerald-300' : 'text-rose-300'}`} role="status">{message.text}</p>}
          {renderPrimary()}
          <div className="grid grid-cols-3 gap-2">
            <button type="button" onClick={() => onNegotiate(deal.storeId)} disabled={!canNegotiate || busy || !(reading?.inRange ?? false)} className={`${BUTTON} bg-white/[0.07] px-2 text-xs text-slate-100 hover:bg-white/[0.12]`}>
              <Handshake className="h-4 w-4" />{deal.status === 'discovered' ? 'Negotiate' : 'Try again'}
            </button>
            <button type="button" onClick={() => { onPark(deal, price, bestOffer); onClose(); }} disabled={isParked || deal.status === 'paid' || busy} className={`${BUTTON} bg-white/[0.07] px-2 text-xs text-slate-100 hover:bg-white/[0.12]`}>
              <SquareParking className="h-4 w-4" />{isParked ? 'Parked' : 'Park'}
            </button>
            <button
              type="button"
              onClick={() => { onWatch(deal, price); setMessage({ tone: 'ok', text: `Added to your watch list. You’ll hear when it drops under ${formatZAR(Math.round(price * 0.9))}.` }); }}
              disabled={isWatched || deal.status === 'paid'}
              className={`${BUTTON} bg-white/[0.07] px-2 text-xs text-slate-100 hover:bg-white/[0.12]`}
            >
              <Eye className="h-4 w-4" />{isWatched ? 'Watching' : 'Watch later'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
