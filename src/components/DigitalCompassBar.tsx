import { Navigation2, RotateCcw, RotateCw, Settings2 } from 'lucide-react';
import { HeadingSource } from '../hooks/useHeading';
import { useElementWidth } from '../hooks/useElementWidth';
import { cardinal, normalizeDeg } from '../lib/geo';
import { formatDistance } from '../lib/format';

interface DigitalCompassBarProps {
  heading: number;
  source: HeadingSource;
  targetName: string | null;
  targetBearing: number | null;
  relative: number | null;
  distanceM: number | null;
  guidance: string;
  facing: boolean;
  onTurn: (deltaDeg: number) => void;
  onOpenSettings?: () => void;
}

export type BarSize = 'xs' | 'sm' | 'md' | 'lg';

export const barSizeFor = (width: number): BarSize => {
  if (width === 0) return 'md';
  if (width < 250) return 'xs';
  if (width < 340) return 'sm';
  if (width < 480) return 'md';
  return 'lg';
};

const LAYOUT: Record<BarSize, { height: number; dial: number; showTargetBearing: boolean; showGuidance: boolean; showDistance: boolean; turnButtons: 'none' | 'icon' | 'text'; showSettings: boolean; pillMax: string; text: string }> = {
  xs: { height: 52, dial: 32, showTargetBearing: false, showGuidance: false, showDistance: false, turnButtons: 'none', showSettings: false, pillMax: '100%', text: 'text-xs' },
  sm: { height: 56, dial: 36, showTargetBearing: false, showGuidance: true, showDistance: false, turnButtons: 'icon', showSettings: false, pillMax: '9rem', text: 'text-[13px]' },
  md: { height: 60, dial: 44, showTargetBearing: true, showGuidance: true, showDistance: true, turnButtons: 'icon', showSettings: true, pillMax: '11rem', text: 'text-sm' },
  lg: { height: 60, dial: 44, showTargetBearing: true, showGuidance: true, showDistance: true, turnButtons: 'text', showSettings: true, pillMax: '13rem', text: 'text-sm' }
};

const TURN_STEP = 30;

function MiniDial({ heading, targetBearing, facing, size }: { heading: number; targetBearing: number | null; facing: boolean; size: number }) {
  const rad = targetBearing !== null ? (targetBearing * Math.PI) / 180 : 0;
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className="shrink-0" aria-hidden="true">
      <circle cx="24" cy="24" r="21" fill="#0b1324" stroke={facing ? '#34d399' : 'rgba(255,255,255,0.14)'} strokeWidth={facing ? 2 : 1} />
      <g transform={`rotate(${-heading} 24 24)`} style={{ transition: 'transform 200ms linear' }}>
        <line x1="24" y1="5" x2="24" y2="11" stroke="#fb7185" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="43" y1="24" x2="38" y2="24" stroke="rgba(226,232,240,0.6)" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="24" y1="43" x2="24" y2="38" stroke="rgba(226,232,240,0.6)" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="5" y1="24" x2="10" y2="24" stroke="rgba(226,232,240,0.6)" strokeWidth="1.5" strokeLinecap="round" />
        {targetBearing !== null && (
          <>
            <line x1="24" y1="24" x2={24 + 13 * Math.sin(rad)} y2={24 - 13 * Math.cos(rad)} stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="24" y1="24" x2={24 - 9 * Math.sin(rad)} y2={24 + 9 * Math.cos(rad)} stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
            <circle cx={24 + 16 * Math.sin(rad)} cy={24 - 16 * Math.cos(rad)} r="2.6" fill="#34d399" />
          </>
        )}
      </g>
      <polygon points="24,0.5 21,5 27,5" fill="#f8fafc" />
      <circle cx="24" cy="24" r="2.4" fill="#f8fafc" />
    </svg>
  );
}

export default function DigitalCompassBar({ heading, source, targetName, targetBearing, relative, distanceM, guidance, facing, onTurn, onOpenSettings }: DigitalCompassBarProps) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const size = barSizeFor(width);
  const layout = LAYOUT[size];
  const roundedHeading = normalizeDeg(Math.round(heading));
  const turnButtons: 'none' | 'icon' | 'text' = source === 'manual' ? layout.turnButtons : 'none';
  const roundButton = 'inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-white/[0.06] text-xs font-semibold tabular-nums text-slate-200 transition hover:bg-white/10';

  return (
    <div
      ref={ref}
      data-size={size}
      style={{ height: layout.height }}
      className={`flex min-w-0 flex-nowrap items-center gap-1.5 overflow-hidden rounded-2xl border transition-colors ${size === 'xs' ? 'px-2' : 'px-2.5'} ${facing ? 'border-emerald-400/40 bg-emerald-400/[0.07]' : 'border-white/[0.08] bg-black/40'}`}
    >
      {source === 'manual' && turnButtons === 'none' ? (
        <button type="button" onClick={() => onTurn(TURN_STEP)} aria-label={`Turn right ${TURN_STEP} degrees`} title="Tap to turn" className="shrink-0 rounded-full transition active:scale-95">
          <MiniDial heading={heading} targetBearing={targetBearing} facing={facing} size={layout.dial} />
        </button>
      ) : (
        <MiniDial heading={heading} targetBearing={targetBearing} facing={facing} size={layout.dial} />
      )}

      <div className="min-w-[3.75rem] flex-1 overflow-hidden">
        <div className={`flex items-baseline gap-1.5 overflow-hidden whitespace-nowrap font-bold tabular-nums ${layout.text}`}>
          <span className="shrink-0 text-emerald-300">{cardinal(heading)} {roundedHeading}°</span>
          {layout.showTargetBearing && targetBearing !== null && <span className="truncate text-slate-400">· {normalizeDeg(Math.round(targetBearing))}°</span>}
        </div>
        {layout.showGuidance && (
          <div className={`flex items-center gap-1 overflow-hidden text-[11px] ${facing ? 'text-emerald-300' : 'text-slate-400'}`}>
            <Navigation2 className="h-3 w-3 shrink-0 transition-transform duration-300" style={{ transform: `rotate(${relative ?? 0}deg)` }} />
            <span className="truncate">{guidance}</span>
          </div>
        )}
      </div>

      {targetName && (
        <span
          title={targetName}
          style={{ maxWidth: layout.pillMax }}
          className={`inline-flex min-w-0 flex-[0_1_auto] items-center gap-1.5 whitespace-nowrap rounded-full border border-amber-300/50 bg-amber-300/10 font-bold uppercase tracking-wider text-amber-200 ${size === 'xs' ? 'h-7 px-2 text-[10px]' : 'h-8 px-3 text-[11px]'}`}
        >
          <span className={`h-2 w-2 shrink-0 rounded-full ${facing ? 'bg-emerald-300' : 'bg-amber-300'}`} />
          <span className="min-w-0 truncate">{targetName}</span>
          {layout.showDistance && distanceM !== null && Number.isFinite(distanceM) && (
            <span className="shrink-0 font-semibold normal-case tracking-normal tabular-nums text-amber-200/70">{formatDistance(distanceM)}</span>
          )}
        </span>
      )}

      {turnButtons !== 'none' && (
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={() => onTurn(-TURN_STEP)} aria-label={`Turn left ${TURN_STEP} degrees`} className={`${roundButton} h-8 ${turnButtons === 'text' ? 'px-3' : 'w-8'}`}>
            <RotateCcw className="h-3.5 w-3.5" />{turnButtons === 'text' && <span>-{TURN_STEP}°</span>}
          </button>
          <button type="button" onClick={() => onTurn(TURN_STEP)} aria-label={`Turn right ${TURN_STEP} degrees`} className={`${roundButton} h-8 ${turnButtons === 'text' ? 'px-3' : 'w-8'}`}>
            {turnButtons === 'text' && <span>+{TURN_STEP}°</span>}<RotateCw className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {source === 'sensor' && size !== 'xs' && (
        <span className="shrink-0 whitespace-nowrap rounded-full bg-emerald-400/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">Live</span>
      )}

      {onOpenSettings && layout.showSettings && (
        <button type="button" onClick={onOpenSettings} aria-label="Settings" className={`${roundButton} h-8 w-8`}>
          <Settings2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
