import { useId, useRef } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { MATCH_RADIUS_M } from '../config/venue';
import { cardinal, normalizeDeg, signedAngleDelta, toDeg } from '../lib/geo';

export type CompassTone = 'store' | 'deal' | 'agreed' | 'paid' | 'problem';

export interface CompassTarget {
  id: string;
  label: string;
  bearingDeg: number | null;
  distanceM: number;
  tone: CompassTone;
}

interface CompassProps {
  heading: number;
  draggable: boolean;
  onHeadingChange: (deg: number) => void;
  targets: CompassTarget[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  scanning: boolean;
  facing: boolean;
  maxWidth?: number;
}

export const TONE_COLOR: Record<CompassTone, string> = {
  store: '#64748b',
  deal: '#fbbf24',
  agreed: '#34d399',
  paid: '#38bdf8',
  problem: '#fb7185'
};

const CENTER = 160;
const RADAR_RADIUS = 118;
const RINGS = [10, 25, 50];
const TICKS = Array.from({ length: 72 }, (_, index) => index * 5);
const CARDINAL_LABELS: { deg: number; text: string }[] = [
  { deg: 0, text: 'N' },
  { deg: 90, text: 'E' },
  { deg: 180, text: 'S' },
  { deg: 270, text: 'W' }
];

const project = (bearingDeg: number, distanceM: number) => {
  const clamped = Math.min(distanceM, MATCH_RADIUS_M);
  const radius = Math.max(10, (clamped / MATCH_RADIUS_M) * RADAR_RADIUS);
  const rad = (bearingDeg * Math.PI) / 180;
  return { x: CENTER + radius * Math.sin(rad), y: CENTER - radius * Math.cos(rad), outside: distanceM > MATCH_RADIUS_M };
};

export default function Compass({ heading, draggable, onHeadingChange, targets, selectedId, onSelect, scanning, facing, maxWidth = 340 }: CompassProps) {
  const uid = useId().replace(/:/g, '');
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ startAngle: number; startHeading: number } | null>(null);
  const selected = targets.find(target => target.id === selectedId && target.bearingDeg !== null) ?? null;

  const pointerAngle = (clientX: number, clientY: number): number => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return toDeg(Math.atan2(clientX - (rect.left + rect.width / 2), -(clientY - (rect.top + rect.height / 2))));
  };

  const handlePointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (!draggable) return;
    if ((event.target as Element).closest('[data-target]')) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { startAngle: pointerAngle(event.clientX, event.clientY), startHeading: heading };
  };

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!dragRef.current) return;
    const delta = signedAngleDelta(pointerAngle(event.clientX, event.clientY), dragRef.current.startAngle);
    onHeadingChange(normalizeDeg(dragRef.current.startHeading - delta));
  };

  const endDrag = (event: PointerEvent<SVGSVGElement>) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    if (!draggable) return;
    const step = event.shiftKey ? 15 : 5;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      onHeadingChange(normalizeDeg(heading - step));
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      onHeadingChange(normalizeDeg(heading + step));
    } else if (event.key === 'Home') {
      event.preventDefault();
      onHeadingChange(0);
    }
  };

  return (
    <div className="mx-auto w-full" style={{ maxWidth }}>
      <svg
        ref={svgRef}
        viewBox="0 0 320 320"
        className={`h-auto w-full touch-none select-none rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-300 ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
        role="slider"
        aria-label="Compass heading"
        aria-valuemin={0}
        aria-valuemax={359}
        aria-valuenow={Math.round(heading)}
        aria-valuetext={`${Math.round(heading)} degrees ${cardinal(heading)}`}
        tabIndex={draggable ? 0 : -1}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={handleKeyDown}
      >
        <defs>
          <radialGradient id={`${uid}-face`} cx="50%" cy="45%" r="60%">
            <stop offset="0%" stopColor="#13213a" />
            <stop offset="70%" stopColor="#0a1222" />
            <stop offset="100%" stopColor="#060a15" />
          </radialGradient>
          <linearGradient id={`${uid}-sweep`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0.28" />
          </linearGradient>
          <filter id={`${uid}-glow`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle cx={CENTER} cy={CENTER} r={157} fill={`url(#${uid}-face)`} stroke={facing ? '#34d399' : 'rgba(255,255,255,0.09)'} strokeWidth={facing ? 2.5 : 1} filter={facing ? `url(#${uid}-glow)` : undefined} />

        {RINGS.map(ring => (
          <circle key={ring} cx={CENTER} cy={CENTER} r={(ring / MATCH_RADIUS_M) * RADAR_RADIUS} fill="none" stroke="rgba(148,163,184,0.16)" strokeDasharray="2 5" />
        ))}
        {RINGS.map(ring => (
          <text key={`label-${ring}`} x={CENTER + 4} y={CENTER - (ring / MATCH_RADIUS_M) * RADAR_RADIUS + 11} fill="rgba(148,163,184,0.55)" fontSize="8.5">{ring} m</text>
        ))}

        {scanning && (
          <g className="animate-[spin_2.6s_linear_infinite]" style={{ transformOrigin: `${CENTER}px ${CENTER}px`, transformBox: 'view-box' }}>
            <path d={`M${CENTER} ${CENTER} L${CENTER - RADAR_RADIUS * Math.sin(Math.PI / 6)} ${CENTER - RADAR_RADIUS * Math.cos(Math.PI / 6)} A${RADAR_RADIUS} ${RADAR_RADIUS} 0 0 1 ${CENTER} ${CENTER - RADAR_RADIUS} Z`} fill={`url(#${uid}-sweep)`} />
          </g>
        )}

        <g transform={`rotate(${-heading} ${CENTER} ${CENTER})`}>
          {TICKS.map(deg => {
            const major = deg % 30 === 0;
            return (
              <line
                key={deg}
                x1={CENTER}
                y1={8}
                x2={CENTER}
                y2={major ? 20 : 14}
                stroke={deg === 0 ? '#fb7185' : major ? 'rgba(226,232,240,0.7)' : 'rgba(148,163,184,0.35)'}
                strokeWidth={major ? 2 : 1}
                strokeLinecap="round"
                transform={`rotate(${deg} ${CENTER} ${CENTER})`}
              />
            );
          })}
          {TICKS.filter(deg => deg % 30 === 0 && deg % 90 !== 0).map(deg => {
            const rad = (deg * Math.PI) / 180;
            const x = CENTER + 128 * Math.sin(rad);
            const y = CENTER - 128 * Math.cos(rad);
            return (
              <text key={`deg-${deg}`} x={x} y={y} fill="rgba(148,163,184,0.6)" fontSize="9" textAnchor="middle" dominantBaseline="central" transform={`rotate(${heading} ${x} ${y})`}>{deg}</text>
            );
          })}
          {CARDINAL_LABELS.map(({ deg, text }) => {
            const rad = (deg * Math.PI) / 180;
            const x = CENTER + 131 * Math.sin(rad);
            const y = CENTER - 131 * Math.cos(rad);
            return (
              <text key={text} x={x} y={y} fill={text === 'N' ? '#fb7185' : '#e2e8f0'} fontSize="15" fontWeight={700} textAnchor="middle" dominantBaseline="central" transform={`rotate(${heading} ${x} ${y})`}>{text}</text>
            );
          })}

          {selected && selected.bearingDeg !== null && (
            <g transform={`rotate(${selected.bearingDeg} ${CENTER} ${CENTER})`} className="transition-transform">
              <polygon points={`${CENTER},${CENTER - 106} ${CENTER + 7},${CENTER} ${CENTER - 7},${CENTER}`} fill="#34d399" filter={`url(#${uid}-glow)`} />
              <polygon points={`${CENTER - 7},${CENTER} ${CENTER + 7},${CENTER} ${CENTER},${CENTER + 72}`} fill="#fbbf24" opacity={0.85} />
            </g>
          )}

          {targets.map(target => {
            if (target.bearingDeg === null || !Number.isFinite(target.distanceM)) return null;
            const point = project(target.bearingDeg, target.distanceM);
            const isSelected = target.id === selectedId;
            const color = TONE_COLOR[target.tone];
            return (
              <g key={target.id} data-target="" className="cursor-pointer" onClick={() => onSelect(target.id)}>
                <title>{target.label}</title>
                {isSelected && <circle cx={point.x} cy={point.y} r={13} fill="none" stroke={color} strokeOpacity={0.6} strokeWidth={1.5} />}
                <circle cx={point.x} cy={point.y} r={16} fill="transparent" />
                <circle cx={point.x} cy={point.y} r={isSelected ? 7 : 5} fill={point.outside ? 'transparent' : color} stroke={color} strokeWidth={point.outside ? 1.5 : 0} />
              </g>
            );
          })}
        </g>

        <polygon points={`${CENTER},1 ${CENTER - 8},15 ${CENTER + 8},15`} fill="#f8fafc" />
        <circle cx={CENTER} cy={CENTER} r={31} fill="#050814" stroke="rgba(255,255,255,0.1)" />
        <text x={CENTER} y={CENTER - 4} fill="#f8fafc" fontSize="17" fontWeight={700} textAnchor="middle" dominantBaseline="central">{Math.round(normalizeDeg(heading)) % 360}°</text>
        <text x={CENTER} y={CENTER + 13} fill="#94a3b8" fontSize="9.5" textAnchor="middle" dominantBaseline="central">{cardinal(heading)}</text>
      </svg>
    </div>
  );
}
