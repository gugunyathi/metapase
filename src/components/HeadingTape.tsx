import { cardinal, normalizeDeg, signedAngleDelta } from '../lib/geo';
import { formatDistance } from '../lib/format';
import { CompassTarget, TONE_COLOR } from './Compass';

interface HeadingTapeProps {
  heading: number;
  targets: CompassTarget[];
  selectedId: string | null;
}

const WIDTH = 600;
const HEIGHT = 84;
const HALF_SPAN = 50;

const xFor = (delta: number): number => WIDTH / 2 + (delta / HALF_SPAN) * (WIDTH / 2);

export default function HeadingTape({ heading, targets, selectedId }: HeadingTapeProps) {
  const start = Math.ceil((heading - HALF_SPAN) / 5) * 5;
  const ticks: number[] = [];
  for (let deg = start; deg <= heading + HALF_SPAN; deg += 5) ticks.push(deg);
  const located = targets.filter(target => target.bearingDeg !== null);
  const leftCount = located.filter(target => signedAngleDelta(target.bearingDeg as number, heading) < -HALF_SPAN).length;
  const rightCount = located.filter(target => signedAngleDelta(target.bearingDeg as number, heading) > HALF_SPAN).length;

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full" role="img" aria-label={`Heading ${Math.round(heading)} degrees ${cardinal(heading)}`}>
      <defs>
        <linearGradient id="tape-fade" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#050814" stopOpacity="1" />
          <stop offset="12%" stopColor="#050814" stopOpacity="0" />
          <stop offset="88%" stopColor="#050814" stopOpacity="0" />
          <stop offset="100%" stopColor="#050814" stopOpacity="1" />
        </linearGradient>
      </defs>
      {ticks.map(deg => {
        const x = xFor(deg - heading);
        const value = normalizeDeg(deg);
        const isCardinal = value % 45 === 0;
        const isMajor = value % 15 === 0;
        return (
          <g key={deg}>
            <line x1={x} x2={x} y1={10} y2={isCardinal ? 30 : isMajor ? 24 : 18} stroke={value === 0 ? '#fb7185' : 'rgba(110,231,183,0.6)'} strokeWidth={isCardinal ? 2 : 1} />
            {(isCardinal || isMajor) && (
              <text x={x} y={44} fill={isCardinal ? '#d1fae5' : 'rgba(110,231,183,0.55)'} fontSize={isCardinal ? 14 : 10} fontWeight={isCardinal ? 700 : 400} textAnchor="middle">
                {isCardinal ? cardinal(value) : value}
              </text>
            )}
          </g>
        );
      })}
      {located.map(target => {
        const delta = signedAngleDelta(target.bearingDeg as number, heading);
        if (Math.abs(delta) > HALF_SPAN) return null;
        const x = xFor(delta);
        const selected = target.id === selectedId;
        const color = TONE_COLOR[target.tone];
        return (
          <g key={target.id}>
            <polygon points={`${x},54 ${x - 7},66 ${x + 7},66`} fill={color} opacity={selected ? 1 : 0.7} />
            <text x={x} y={80} fill={color} fontSize={selected ? 11 : 10} fontWeight={selected ? 700 : 500} textAnchor="middle">
              {target.label} {formatDistance(target.distanceM)}
            </text>
          </g>
        );
      })}
      <line x1={WIDTH / 2} x2={WIDTH / 2} y1={2} y2={34} stroke="#f8fafc" strokeWidth={2} />
      <rect x={0} y={0} width={WIDTH} height={HEIGHT} fill="url(#tape-fade)" pointerEvents="none" />
      {leftCount > 0 && <text x={8} y={62} fill="#6ee7b7" fontSize="12" fontWeight={700}>‹ {leftCount}</text>}
      {rightCount > 0 && <text x={WIDTH - 8} y={62} fill="#6ee7b7" fontSize="12" fontWeight={700} textAnchor="end">{rightCount} ›</text>}
    </svg>
  );
}
