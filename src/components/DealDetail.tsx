import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, CircleCheck, CreditCard, Eye, Handshake,
  LoaderCircle, Navigation2, SquareParking, Wallet, Sparkles,
} from 'lucide-react';
import { BuyResult, Deal, NodeReading } from '../types/metapase';
import { CATEGORY_STYLE, STATUS_META } from './DealCard';
import { MAX_ROUNDS } from '../config/venue';
import { cardinal, signedAngleDelta } from '../lib/geo';
import { formatBearing, formatDistance, formatZAR } from '../lib/format';
import { PayPalPaymentContainer } from './PayPalPaymentContainer';

interface DealDetailProps {
  deal: Deal;
  reading: NodeReading | undefined;
  heading: number;
  maxBudgetZAR: number;
  matchesIntent: boolean;
  isParked: boolean;
  isWatched: boolean;
  currentDeviceView?: string;
  initialShowPayPal?: boolean;
  onClose: () => void;
  onPay: (storeId: string) => void;
  onPayWithPayPal?: (storeId: string, referenceId: string) => void;
  onNegotiate: (storeId: string) => void;
  onBuyNow: (deal: Deal, priceZAR: number) => Promise<BuyResult>;
  onPark: (deal: Deal, priceZAR: number, bestOfferZAR: number | null) => void;
  onWatch: (deal: Deal, priceZAR: number) => void;
}

const BTN =
  'inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 disabled:cursor-not-allowed disabled:opacity-50';

const sideText = (relative: number | null): string => {
  if (relative === null) return 'right where you are';
  const angle = Math.abs(relative);
  if (angle <= 15) return 'straight ahead';
  if (angle >= 150) return 'behind you';
  return `${Math.round(angle)}° to your ${relative < 0 ? 'left' : 'right'}`;
};

export default function DealDetail({
  deal, reading, heading, maxBudgetZAR, matchesIntent,
  isParked, isWatched, currentDeviceView, initialShowPayPal = false,
  onClose, onPay, onPayWithPayPal, onNegotiate, onBuyNow, onPark, onWatch,
}: DealDetailProps) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const sheetRef    = useRef<HTMLDivElement>(null);
  const closeRef    = useRef<HTMLButtonElement>(null);

  const [buying, setBuying]         = useState(false);
  const [showPayPal, setShowPayPal] = useState(initialShowPayPal);
  const [message, setMessage]       = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  /* ── lock body scroll, focus close btn, handle Escape ── */
  useEffect(() => {
    closeRef.current?.focus();
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const style   = CATEGORY_STYLE[deal.category];
  const Icon    = style.icon;
  const status  = STATUS_META[deal.status];
  const sticker = deal.ad.stickerPriceZAR;
  const lastCounter = [...deal.rounds].reverse()
    .find(r => r.storeResponse === 'countered' && r.storePriceZAR !== null)?.storePriceZAR ?? null;
  const bestOffer = deal.rounds.length ? deal.rounds[deal.rounds.length - 1].agentOfferZAR : null;
  const price     = deal.negotiatedPriceZAR ?? lastCounter ?? sticker;
  const savings   = Math.max(0, sticker - price);
  const discountPct = sticker > 0 ? Math.round((savings / sticker) * 100) : 0;
  const overBudget  = price - maxBudgetZAR;
  const bearing     = reading?.bearingDeg ?? null;
  const relative    = bearing !== null ? signedAngleDelta(bearing, heading) : null;
  const busy        = buying || deal.status === 'negotiating' || deal.status === 'paying';
  const priceLabel  = deal.negotiatedPriceZAR !== null
    ? 'Agreed price'
    : lastCounter !== null
      ? "Store's last price"
      : 'Sticker price';

  const buyNow = async (amount: number) => {
    setBuying(true);
    setMessage(null);
    const result = await onBuyNow(deal, amount);
    setBuying(false);
    if (result.ok) {
      setMessage({ tone: 'ok', text: `Bought for ${formatZAR(amount)}.` });
      window.setTimeout(onClose, 500);
    } else {
      setMessage({ tone: 'error', text: result.note ?? "The store didn't accept this price." });
    }
  };

  const canNegotiate =
    deal.status !== 'paying' && deal.status !== 'paid';

  /* ── primary CTA ── */
  const renderPrimary = () => {
    switch (deal.status) {
      case 'agreed':
        return (
          <div className="space-y-2 w-full">
            <button
              type="button"
              onClick={() => { onPay(deal.storeId); onClose(); }}
              className={`${BTN} w-full bg-amber-300 text-slate-950 hover:bg-amber-200 shadow-md`}
            >
              <Wallet className="h-4 w-4" />
              Buy Now for {formatZAR(price)} (Biometric Passkey)
            </button>
            <button
              type="button"
              onClick={() => setShowPayPal(true)}
              className={`${BTN} w-full bg-amber-400/20 border border-amber-400/40 text-amber-200 hover:bg-amber-400/30`}
            >
              <CreditCard className="h-4 w-4 text-amber-300" />
              Buy Later · PayPal Pay in 4 / Installments
            </button>
          </div>
        );
      case 'paid':
        return (
          <button type="button" disabled className={`${BTN} w-full bg-sky-400/15 text-sky-200`}>
            <CircleCheck className="h-4 w-4" />
            Paid{deal.referenceId ? `, ${deal.referenceId}` : ''}
          </button>
        );
      case 'negotiating':
      case 'paying':
        return (
          <button type="button" disabled className={`${BTN} w-full bg-white/10 text-slate-200`}>
            <LoaderCircle className="h-4 w-4 animate-spin text-emerald-400" />
            {deal.status === 'paying'
              ? 'Confirming payment…'
              : `Agent negotiating — round ${Math.min(deal.rounds.length + 1, MAX_ROUNDS)} of ${MAX_ROUNDS}`}
          </button>
        );
      default:
        return (
          <div className="space-y-2 w-full">
            <button
              type="button"
              onClick={() => void buyNow(price)}
              disabled={busy}
              className={`${BTN} w-full bg-amber-300 text-slate-950 hover:bg-amber-200 shadow-md`}
            >
              {buying ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
              Buy Now for {formatZAR(price)}
            </button>
            <button
              type="button"
              onClick={() => setShowPayPal(true)}
              disabled={busy}
              className={`${BTN} w-full bg-amber-400/15 border border-amber-400/30 text-amber-200 hover:bg-amber-400/25`}
            >
              <CreditCard className="h-4 w-4 text-amber-300" />
              Buy Later · PayPal Pay Later / Installments
            </button>
          </div>
        );
    }
  };

  return (
    <>
      {/* ── Scrim — blurs + darkens the carousel behind, click = close ── */}
      <div
        ref={backdropRef}
        onClick={onClose}
        className="metapase-fade-in fixed inset-0 z-[70] bg-[#050814]/70 backdrop-blur-sm"
        aria-hidden="true"
      />

      {/* ── Bottom sheet panel ── */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={deal.ad.itemName}
        className="metapase-deal-sheet fixed inset-x-0 bottom-0 z-[80] flex flex-col rounded-t-[2rem] border-t border-white/[0.08] bg-[#080e1f] shadow-[0_-24px_80px_-8px_rgba(5,8,20,0.9)]"
        style={{
          maxHeight: 'min(92dvh, 820px)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)',
        }}
      >
        {/* drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="h-1 w-10 rounded-full bg-white/20" />
        </div>

        {/* ── header ── */}
        <div className="flex items-center justify-between gap-3 px-5 pt-1 pb-3 shrink-0">
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${status.chip}`}>{status.label}</span>
        </div>

        {/* ── scrollable body ── */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-2">

          {/* hero image */}
          <section
            className={`metapase-sheet-in relative h-44 min-[400px]:h-52 overflow-hidden rounded-[1.5rem] bg-slate-950`}
          >
            {deal.ad.imageUrl ? (
              <>
                <img
                  src={deal.ad.imageUrl}
                  alt={deal.ad.itemName}
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-black/20" />
              </>
            ) : (
              <div className={`absolute inset-0 bg-gradient-to-br ${style.tile}`}>
                <Icon className="absolute -bottom-8 -right-6 h-56 w-56 text-white/15" strokeWidth={1.1} />
              </div>
            )}

            <span className="absolute left-4 top-4 max-w-[55%] truncate rounded-full border border-white/10 bg-black/60 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
              {deal.location.outletName}
            </span>
            <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-white/10 bg-black/60 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
              <Navigation2
                className="h-3.5 w-3.5 text-emerald-300 transition-transform duration-300"
                style={{ transform: `rotate(${relative ?? 0}deg)` }}
              />
              {reading ? formatDistance(reading.distanceM) : '—'}
            </span>
            <div className="absolute inset-x-4 bottom-4">
              <p className="text-xs font-semibold text-emerald-300">
                {style.label}{matchesIntent ? ' · Matches your intent' : ''}
              </p>
              <h2 className="mt-1 line-clamp-2 text-xl font-extrabold leading-tight tracking-tight text-white">
                {deal.ad.itemName}
              </h2>
            </div>

            {/* Shopify virtual badge */}
            {deal.isShopifyVirtual && (
              <span className="absolute top-2 right-2 flex items-center gap-1 rounded-full border border-cyan-400 bg-cyan-950/90 px-2 py-0.5 text-[11px] text-cyan-200 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.5)] backdrop-blur">
                🌐 Shopify Tenant
              </span>
            )}
          </section>

          {/* Shopify virtual info row */}
          {deal.isShopifyVirtual && (
            <div className="mt-4 flex items-center justify-between rounded-2xl border border-cyan-400/50 bg-cyan-950/40 p-3.5 text-cyan-200 shadow-[0_0_20px_rgba(34,211,238,0.2)]">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🌐</span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-cyan-300">Shopify Virtual Presence</p>
                  <p className="text-[11px] text-cyan-400/80">Fulfilled via Shopify Localized Delivery Network</p>
                </div>
              </div>
              <span className="rounded-full border border-cyan-400/40 bg-cyan-400/20 px-2.5 py-1 text-[10px] font-mono font-bold text-cyan-300 animate-pulse">
                Regional Transit Hub
              </span>
            </div>
          )}

          {/* price block */}
          <section className="mt-5">
            <p className="text-xs text-slate-400">{priceLabel}</p>
            <div className="mt-1 flex flex-wrap items-end gap-3">
              <span className="text-4xl font-extrabold tabular-nums tracking-tight text-amber-200">
                {formatZAR(price)}
              </span>
              {price < sticker && (
                <span className="pb-1.5 text-lg tabular-nums text-slate-500 line-through">{formatZAR(sticker)}</span>
              )}
              {discountPct > 0 && (
                <span className="mb-2 rounded-full bg-emerald-400/15 px-3 py-1 text-sm font-bold text-emerald-300">
                  {discountPct}% off
                </span>
              )}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-2xl bg-white/[0.04] p-3">
                <p className="text-[11px] text-slate-500">You save</p>
                <p className="mt-1 text-base font-bold tabular-nums text-emerald-300">{formatZAR(savings)}</p>
              </div>
              <div className="rounded-2xl bg-white/[0.04] p-3">
                <p className="text-[11px] text-slate-500">Agent's best</p>
                <p className="mt-1 text-base font-bold tabular-nums text-white">
                  {bestOffer !== null ? formatZAR(bestOffer) : '—'}
                </p>
              </div>
              <div className="rounded-2xl bg-white/[0.04] p-3">
                <p className="text-[11px] text-slate-500">Your budget</p>
                <p className={`mt-1 text-xs font-bold ${overBudget > 0 ? 'text-rose-300' : 'text-emerald-300'}`}>
                  {overBudget > 0 ? `${formatZAR(overBudget)} over` : `Within ${formatZAR(maxBudgetZAR)}`}
                </p>
              </div>
            </div>
            {deal.note && (
              <p className="mt-4 rounded-2xl bg-white/[0.04] px-4 py-3 text-sm leading-relaxed text-slate-300">
                {deal.note}
              </p>
            )}
          </section>

          {/* details table */}
          <section className="mt-6">
            <h3 className="text-sm font-semibold text-white">Details</h3>
            <dl className="mt-3 divide-y divide-white/[0.06] rounded-3xl border border-white/[0.06] bg-white/[0.02] text-sm">
              <div className="flex justify-between gap-4 px-4 py-2.5">
                <dt className="text-slate-400">Store</dt>
                <dd className="text-right text-white">{deal.location.outletName}</dd>
              </div>
              <div className="flex justify-between gap-4 px-4 py-2.5">
                <dt className="text-slate-400">Where</dt>
                <dd className="text-right text-white">
                  {reading ? `${formatDistance(reading.distanceM)}, ${sideText(relative)}` : 'Out of range'}
                </dd>
              </div>
              <div className="flex justify-between gap-4 px-4 py-2.5">
                <dt className="text-slate-400">Bearing</dt>
                <dd className="text-right tabular-nums text-white">
                  {bearing !== null ? `${formatBearing(bearing)} ${cardinal(bearing)}` : '—'}
                </dd>
              </div>
              <div className="flex justify-between gap-4 px-4 py-2.5">
                <dt className="text-slate-400">Sticker</dt>
                <dd className="text-right tabular-nums text-white">{formatZAR(sticker)}</dd>
              </div>
              <div className="flex justify-between gap-4 px-4 py-2.5">
                <dt className="text-slate-400">SKU</dt>
                <dd className="truncate text-right text-white">{deal.ad.sku}</dd>
              </div>
            </dl>
          </section>

          {/* negotiation history */}
          <section className="mt-6 pb-4">
            <h3 className="text-sm font-semibold text-white">Negotiation history</h3>
            {deal.rounds.length === 0 ? (
              <p className="mt-3 text-sm text-slate-400">The agent hasn't made an offer yet.</p>
            ) : (
              <ol className="mt-3 space-y-2">
                {deal.rounds.map(round => (
                  <li
                    key={round.round}
                    className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-2xl bg-white/[0.03] px-4 py-3 text-sm"
                  >
                    <span className="text-slate-400">Round {round.round}</span>
                    <span className="tabular-nums text-white">You offered {formatZAR(round.agentOfferZAR)}</span>
                    <span
                      className={`tabular-nums ${
                        round.storeResponse === 'accepted'
                          ? 'text-emerald-300'
                          : round.storeResponse === 'countered'
                            ? 'text-amber-200'
                            : 'text-rose-300'
                      }`}
                    >
                      {round.storeResponse === 'accepted'
                        ? `Accepted ${formatZAR(round.storePriceZAR ?? round.agentOfferZAR)}`
                        : round.storeResponse === 'countered'
                          ? `Store asked ${formatZAR(round.storePriceZAR ?? 0)}`
                          : 'Store ended talks'}
                    </span>
                    {round.storeMessage && (
                      <p className="flex basis-full items-start gap-1.5 text-xs leading-relaxed text-slate-300">
                        <Sparkles
                          className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${round.engine === 'muse' ? 'text-sky-300' : 'text-slate-500'}`}
                          aria-hidden="true"
                        />
                        <span>
                          <span className="text-slate-500">
                            Store agent{round.engine === 'muse' ? ' (Muse Spark)' : ''}: 
                          </span>
                          "{round.storeMessage}"
                        </span>
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        {/* ── sticky action bar ── */}
        <div className="shrink-0 border-t border-white/[0.07] bg-[#080e1f] px-5 pt-3 pb-2">
          {message && (
            <p
              className={`mb-2 text-center text-xs font-semibold ${message.tone === 'ok' ? 'text-emerald-300' : 'text-rose-300'}`}
              role="status"
            >
              {message.text}
            </p>
          )}

          {/* primary CTA: Buy Now + Buy Later */}
          {renderPrimary()}

          {/* secondary row: Negotiate | Park | Watch */}
          <div className="mt-2 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => onNegotiate(deal.storeId)}
              disabled={!canNegotiate || busy || !(reading?.inRange ?? false)}
              className={`${BTN} bg-emerald-500/15 border border-emerald-400/30 px-2 text-xs text-emerald-200 hover:bg-emerald-500/25`}
            >
              <Handshake className="h-4 w-4 text-emerald-400" />
              {deal.status === 'agreed'
                ? 'Re-negotiate'
                : deal.status === 'discovered'
                  ? 'Negotiate'
                  : 'Try again'}
            </button>

            <button
              type="button"
              onClick={() => { onPark(deal, price, bestOffer); onClose(); }}
              disabled={isParked || deal.status === 'paid' || busy}
              className={`${BTN} bg-white/[0.07] px-2 text-xs text-slate-100 hover:bg-white/[0.12]`}
            >
              <SquareParking className="h-4 w-4 text-amber-300" />
              {isParked ? 'Parked ✓' : 'Park Deal'}
            </button>

            <button
              type="button"
              onClick={() => {
                onWatch(deal, price);
                setMessage({
                  tone: 'ok',
                  text: `Watching! You'll hear when it drops under ${formatZAR(Math.round(price * 0.9))}.`,
                });
              }}
              disabled={isWatched || deal.status === 'paid'}
              className={`${BTN} bg-white/[0.07] px-2 text-xs text-slate-100 hover:bg-white/[0.12]`}
            >
              <Eye className="h-4 w-4 text-sky-400" />
              {isWatched ? 'Watching ✓' : 'Watch'}
            </button>
          </div>
        </div>
      </div>

      {/* ── PayPal sheet ── */}
      {showPayPal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
          <PayPalPaymentContainer
            amount={Math.round((price * 0.054) * 100) / 100}
            currency="USD"
            currentDeviceView={currentDeviceView ?? 'desktop'}
            storeName={deal.location.outletName}
            itemName={deal.ad.itemName}
            storeId={deal.storeId}
            sku={deal.ad.sku}
            onPaymentSuccess={refId => {
              setShowPayPal(false);
              if (onPayWithPayPal) onPayWithPayPal(deal.storeId, refId);
              onClose();
            }}
            onCancel={() => setShowPayPal(false)}
          />
        </div>
      )}
    </>
  );
}
