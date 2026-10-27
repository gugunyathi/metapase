import { useEffect, useRef } from 'react';
import { DealCategory } from '../types/metapase';
import { CATEGORY_STYLE } from './DealCard';
import { formatZAR } from '../lib/format';

export interface Flight {
  key: number;
  from: { x: number; y: number; width: number; height: number };
  to: { x: number; y: number };
  itemName: string;
  category: DealCategory;
  priceZAR: number;
  tone: 'amber' | 'emerald';
  onDone: () => void;
}

export default function FlightLayer({ flight }: { flight: Flight | null }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!flight || !element) return;
    if (typeof element.animate !== 'function') {
      flight.onDone();
      return;
    }
    const dx = flight.to.x - (flight.from.x + flight.from.width / 2);
    const dy = flight.to.y - (flight.from.y + flight.from.height / 2);
    const animation = element.animate(
      [
        { transform: 'translate(0px, 0px) scale(1) rotate(0deg)', opacity: 1, offset: 0 },
        { transform: `translate(${dx * 0.12}px, ${dy * 0.12 + 36}px) scale(0.9) rotate(3deg)`, opacity: 1, offset: 0.28 },
        { transform: `translate(${dx}px, ${dy}px) scale(0.06) rotate(-20deg)`, opacity: 0.35, offset: 1 }
      ],
      { duration: 950, easing: 'cubic-bezier(0.55, 0, 0.7, 0.25)', fill: 'forwards' }
    );
    let settled = false;
    animation.onfinish = () => {
      if (settled) return;
      settled = true;
      flight.onDone();
    };
    return () => {
      settled = true;
      animation.cancel();
    };
  }, [flight]);

  if (!flight) return null;
  const style = CATEGORY_STYLE[flight.category];
  const Icon = style.icon;
  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed z-[75]"
      style={{ left: flight.from.x, top: flight.from.y, width: flight.from.width, height: flight.from.height, transformOrigin: 'center center' }}
    >
      <div className={`flex h-full flex-col overflow-hidden rounded-3xl border bg-slate-900 ${flight.tone === 'amber' ? 'border-amber-300/70 shadow-[0_0_60px_rgba(251,191,36,0.55)]' : 'border-emerald-300/70 shadow-[0_0_60px_rgba(52,211,153,0.55)]'}`}>
        <div className={`relative flex-1 bg-gradient-to-br ${style.tile}`}>
          <Icon className="absolute bottom-2 right-2 h-16 w-16 text-white/25" />
        </div>
        <div className="p-4">
          <p className="line-clamp-2 text-sm font-semibold text-white">{flight.itemName}</p>
          <p className="mt-1 text-xl font-extrabold tabular-nums text-amber-200">{formatZAR(flight.priceZAR)}</p>
        </div>
      </div>
    </div>
  );
}
