import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent, PointerEvent, ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Navigation2 } from 'lucide-react';
import { Deal, NodeReading } from '../types/metapase';
import { MATCH_RADIUS_M } from '../config/venue';
import { normalizeDeg, signedAngleDelta } from '../lib/geo';
import { formatDistance } from '../lib/format';
import DealCard from './DealCard';

export interface CarouselEntry {
  deal: Deal;
  reading: NodeReading | undefined;
  matches: boolean;
}

export interface PinRequest {
  id: string;
  at: number;
}

interface DealCarouselProps {
  entries: CarouselEntry[];
  heading: number;
  speedMps: number;
  lastTurnAt: number;
  pinRequest: PinRequest | null;
  onFocusChange: (storeId: string) => void;
  onNegotiate: (storeId: string) => void;
  onPay: (storeId: string) => void;
  emptyState: ReactNode;
  compact?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
  flashId?: string | null;
  onOpen?: (storeId: string) => void;
}

interface CarouselItem extends CarouselEntry {
  id: string;
  bearing: number;
  bearingKnown: boolean;
  closeness: number;
  distanceM: number;
}

type CarouselMode = 'single' | 'dragging' | 'pinned' | 'paused' | 'following' | 'facing' | 'cycling';

const TURN_FOLLOW_MS = 2500;
const FACING_HOLD_MS = 10000;
const PIN_MS = 9000;
const FACING_DEG = 12;
const GAP_PX = 18;
const VISIBLE_RADIUS = 3.4;
const SPRING_K = 22;
const SPRING_C = 2 * Math.sqrt(SPRING_K);
const DRAG_THRESHOLD_PX = 6;

export const cruiseFor = (speedMps: number, count: number): number => {
  const countFactor = Math.min(2, Math.max(0.75, count / 4));
  return Math.min(1.2, Math.max(0.12, (0.16 + 0.22 * Math.max(0, speedMps)) * countFactor));
};

const wrap = (value: number, size: number): number => ((value % size) + size) % size;

const nearestEquivalent = (target: number, from: number, size: number): number => target + size * Math.round((from - target) / size);

const sideLabel = (item: CarouselItem, heading: number): string => {
  if (!item.bearingKnown) return 'right here';
  const relative = signedAngleDelta(item.bearing, heading);
  const angle = Math.abs(relative);
  if (angle <= 15) return 'ahead';
  if (angle >= 150) return 'behind you';
  return relative < 0 ? 'to your left' : 'to your right';
};

const motionLabel = (speedMps: number): string => {
  if (speedMps < 0.2) return 'Standing still';
  if (speedMps < 2.2) return `Walking, ${speedMps.toFixed(1)} m/s`;
  return `Moving fast, ${speedMps.toFixed(1)} m/s`;
};

const headingIndexFor = (items: CarouselItem[], heading: number): number => {
  const count = items.length;
  if (count < 2) return 0;
  for (let index = 0; index < count; index++) {
    const start = items[index].bearing;
    const end = items[(index + 1) % count].bearing;
    const span = normalizeDeg(end - start) || 360;
    const offset = normalizeDeg(heading - start);
    if (offset < span) return index + offset / span;
  }
  return 0;
};

const aheadIndexFor = (items: CarouselItem[], heading: number): number => {
  let best = 0;
  let bestAngle = Number.POSITIVE_INFINITY;
  items.forEach((item, index) => {
    const angle = item.bearingKnown ? Math.abs(signedAngleDelta(item.bearing, heading)) : 0;
    if (angle < bestAngle) {
      bestAngle = angle;
      best = index;
    }
  });
  return best;
};

export default function DealCarousel({ entries, heading, speedMps, lastTurnAt, pinRequest, onFocusChange, onNegotiate, onPay, emptyState, compact = false, leading, trailing, flashId = null, onOpen }: DealCarouselProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [viewportWidth, setViewportWidth] = useState<number>(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mode, setMode] = useState<CarouselMode>('single');

  const positionRef = useRef<number>(0);
  const velocityRef = useRef<number>(0);
  const pinnedUntilRef = useRef<number>(0);
  const pinnedTargetRef = useRef<number | null>(null);
  const hoverRef = useRef<boolean>(false);
  const dragRef = useRef<{ pointerId: number; startX: number; startPosition: number; lastX: number; lastT: number; velocityPx: number; active: boolean } | null>(null);
  const suppressClickRef = useRef<boolean>(false);
  const activeIdRef = useRef<string | null>(null);
  const modeRef = useRef<CarouselMode>('single');
  const orderRef = useRef<string[]>([]);
  const reducedMotionRef = useRef<boolean>(false);

  const items: CarouselItem[] = useMemo(
    () =>
      entries
        .filter(entry => entry.reading?.inRange)
        .map(entry => {
          const bearing = entry.reading?.bearingDeg ?? null;
          const distanceM = entry.reading?.distanceM ?? MATCH_RADIUS_M;
          return {
            ...entry,
            id: entry.deal.storeId,
            bearing: bearing ?? 0,
            bearingKnown: bearing !== null,
            closeness: Math.max(0, Math.min(1, 1 - distanceM / MATCH_RADIUS_M)),
            distanceM
          };
        })
        .sort((a, b) => a.bearing - b.bearing || a.distanceM - b.distanceM),
    [entries]
  );

  const cardWidth = (() => {
    if (viewportWidth <= 0) return compact ? 232 : 280;
    if (compact) return Math.round(Math.min(232, Math.max(140, viewportWidth * 0.92)));
    const ratio = viewportWidth < 420 ? 0.84 : viewportWidth < 640 ? 0.7 : 0.62;
    return Math.round(Math.min(300, Math.max(180, viewportWidth * ratio)));
  })();
  const narrowHeader = viewportWidth > 0 && viewportWidth < 260;
  const stateRef = useRef({ items, heading, speedMps, lastTurnAt, cardWidth });
  useEffect(() => {
    stateRef.current = { items, heading, speedMps, lastTurnAt, cardWidth };
  });

  useLayoutEffect(() => {
    const previous = orderRef.current;
    const next = items.map(item => item.id);
    orderRef.current = next;
    if (previous.length === 0 || next.length === 0) {
      if (next.length > 0 && previous.length === 0) positionRef.current = aheadIndexFor(items, heading);
      return;
    }
    const centeredIndex = wrap(Math.round(positionRef.current), previous.length);
    const centeredId = previous[centeredIndex];
    const newIndex = next.indexOf(centeredId);
    const fraction = positionRef.current - Math.round(positionRef.current);
    positionRef.current = newIndex >= 0 ? newIndex + fraction : Math.min(centeredIndex, next.length - 1);
    if (pinnedTargetRef.current !== null) {
      const pinnedId = previous[wrap(Math.round(pinnedTargetRef.current), previous.length)];
      const pinnedIndex = next.indexOf(pinnedId);
      pinnedTargetRef.current = pinnedIndex >= 0 ? pinnedIndex : null;
    }
  }, [items]);

  useEffect(() => {
    if (activeId) onFocusChange(activeId);
  }, [activeId, onFocusChange]);

  useEffect(() => {
    if (!pinRequest) return;
    const index = stateRef.current.items.findIndex(item => item.id === pinRequest.id);
    if (index < 0) return;
    pinnedTargetRef.current = index;
    pinnedUntilRef.current = pinRequest.at + PIN_MS;
  }, [pinRequest]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      reducedMotionRef.current = query.matches;
    };
    update();
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const measure = () => setViewportWidth(element.clientWidth);
    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const observer = new ResizeObserver(() => measure());
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let frame = 0;
    let last = typeof performance !== 'undefined' ? performance.now() : Date.now();

    const tick = (time: number) => {
      const dt = Math.min(0.05, Math.max(0, (time - last) / 1000));
      last = time;
      const { items: list, heading: currentHeading, speedMps: speed, lastTurnAt: turnAt, cardWidth: width } = stateRef.current;
      const count = list.length;
      const now = Date.now();
      let position = positionRef.current;
      let velocity = velocityRef.current;
      let nextMode: CarouselMode;
      let target: number | null = null;

      if (count < 2) {
        nextMode = 'single';
        target = 0;
      } else if (dragRef.current?.active) {
        nextMode = 'dragging';
      } else if (now < pinnedUntilRef.current) {
        nextMode = 'pinned';
        if (pinnedTargetRef.current !== null) target = pinnedTargetRef.current;
        else if (Math.abs(velocity) < 0.45) target = Math.round(position);
      } else if (hoverRef.current) {
        nextMode = 'paused';
        target = Math.round(position);
      } else if (now - turnAt < TURN_FOLLOW_MS) {
        nextMode = 'following';
        target = headingIndexFor(list, currentHeading);
      } else {
        const aheadIndex = aheadIndexFor(list, currentHeading);
        const ahead = list[aheadIndex];
        const facing = ahead && ahead.bearingKnown && Math.abs(signedAngleDelta(ahead.bearing, currentHeading)) <= FACING_DEG && now - turnAt < FACING_HOLD_MS;
        if (facing) {
          nextMode = 'facing';
          target = aheadIndex;
        } else {
          nextMode = 'cycling';
        }
      }

      if (nextMode === 'pinned' && now >= pinnedUntilRef.current - 16) pinnedTargetRef.current = null;

      if (nextMode !== 'dragging' && count > 0) {
        if (reducedMotionRef.current) {
          if (target !== null) position = nearestEquivalent(target, position, Math.max(count, 1));
          velocity = 0;
        } else if (target !== null) {
          const goal = count > 0 ? nearestEquivalent(target, position, count) : 0;
          const acceleration = SPRING_K * (goal - position) - SPRING_C * velocity;
          velocity += acceleration * dt;
          position += velocity * dt;
        } else if (nextMode === 'cycling') {
          const cruise = cruiseFor(speed, count);
          velocity += (cruise - velocity) * (1 - Math.exp(-dt * 1.6));
          position += velocity * dt;
        } else {
          velocity *= Math.exp(-dt * 2.6);
          position += velocity * dt;
        }
      }

      if (count > 0) position = wrap(position, count);
      positionRef.current = position;
      velocityRef.current = velocity;

      const spacing = width + GAP_PX;
      list.forEach((item, index) => {
        const element = cardRefs.current.get(item.id);
        if (!element) return;
        let offset = count > 0 ? wrap(index - position, count) : 0;
        if (offset >= count / 2) offset -= count;
        const distance = Math.abs(offset);
        const edgeFade = count < 2 ? 1 : Math.max(0, Math.min(1, (count / 2 - distance) / 0.6));
        const depthScale = 1 - Math.min(distance, 3) * 0.085;
        const scale = depthScale * (0.9 + 0.1 * item.closeness);
        const rotate = Math.max(-38, Math.min(38, -offset * 16));
        const fade = distance <= 0.5 ? 1 : Math.max(0, 1 - (distance - 0.5) * 0.34);
        const opacity = fade * edgeFade * (distance <= 0.5 ? 1 : 0.6 + 0.4 * item.closeness);
        const hidden = distance > VISIBLE_RADIUS || opacity < 0.02;
        element.style.transform = `translate3d(${offset * spacing}px, 0, ${-distance * 70}px) rotateY(${rotate}deg) scale(${scale})`;
        element.style.opacity = String(opacity);
        element.style.zIndex = String(1000 - Math.round(distance * 100));
        element.style.visibility = hidden ? 'hidden' : 'visible';
        element.style.pointerEvents = hidden || distance > 1.6 ? 'none' : 'auto';
      });

      if (progressRef.current) {
        const fraction = nextMode === 'cycling' ? position - Math.floor(position) : 0;
        progressRef.current.style.width = `${fraction * 100}%`;
      }

      const centered = count > 0 ? list[wrap(Math.round(position), count)].id : null;
      if (centered !== activeIdRef.current) {
        activeIdRef.current = centered;
        setActiveId(centered);
      }
      if (nextMode !== modeRef.current) {
        modeRef.current = nextMode;
        setMode(nextMode);
      }
      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const pinTo = (index: number) => {
    pinnedTargetRef.current = index;
    pinnedUntilRef.current = Date.now() + PIN_MS;
  };

  const focusAndPin = (storeId: string) => {
    const index = items.findIndex(item => item.id === storeId);
    if (index >= 0) pinTo(index);
  };

  const step = (direction: 1 | -1) => {
    if (items.length < 2) return;
    pinTo(Math.round(positionRef.current) + direction);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (items.length < 2 || (event.pointerType === 'mouse' && event.button !== 0)) return;
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startPosition: positionRef.current, lastX: event.clientX, lastT: performance.now(), velocityPx: 0, active: false };
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    if (!drag.active) {
      if (Math.abs(dx) < DRAG_THRESHOLD_PX) return;
      drag.active = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    const nowT = performance.now();
    const elapsed = Math.max(1, nowT - drag.lastT);
    const instant = ((event.clientX - drag.lastX) / elapsed) * 1000;
    drag.velocityPx = drag.velocityPx * 0.7 + instant * 0.3;
    drag.lastX = event.clientX;
    drag.lastT = nowT;
    positionRef.current = drag.startPosition - dx / (cardWidth + GAP_PX);
    velocityRef.current = 0;
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag || !drag.active) return;
    suppressClickRef.current = true;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    velocityRef.current = Math.max(-6, Math.min(6, -drag.velocityPx / (cardWidth + GAP_PX)));
    pinnedTargetRef.current = null;
    pinnedUntilRef.current = Date.now() + PIN_MS;
  };

  const handleClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (!suppressClickRef.current) return;
    suppressClickRef.current = false;
    event.stopPropagation();
    event.preventDefault();
  };

  const activeIndex = Math.max(0, items.findIndex(item => item.id === activeId));

  const modeText: Record<CarouselMode, string> = {
    single: items.length === 1 ? 'One deal in range' : 'No deals in range',
    dragging: 'Browsing',
    pinned: 'Paused on your pick',
    paused: 'Paused while you look',
    following: 'Following where you face',
    facing: 'Holding the deal you’re facing',
    cycling: speedMps >= 0.2 ? 'Gliding faster while you move' : 'Gliding through nearby deals'
  };

  return (
    <div>
      <div className="relative z-[1002] mb-3 flex items-center gap-2">
        <div className="flex flex-1 justify-start">{leading}</div>
        <div className={`min-w-0 text-center text-xs ${narrowHeader ? 'hidden' : ''}`}>
          <p className="truncate font-semibold text-white">{items.length ? `${items.length} deal${items.length === 1 ? '' : 's'} within ${MATCH_RADIUS_M} m` : `Deals within ${MATCH_RADIUS_M} m`}</p>
          <p className="truncate text-slate-400">{motionLabel(speedMps)}</p>
        </div>
        <div className="flex flex-1 justify-end">{trailing}</div>
      </div>

      <div
        ref={viewportRef}
        className={`relative overflow-hidden ${items.length > 1 ? 'cursor-grab touch-pan-y active:cursor-grabbing' : ''}`}
        style={{ perspective: '1400px' }}
        aria-roledescription="carousel"
        aria-label="Nearby deals"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerEnter={event => {
          if (event.pointerType === 'mouse') hoverRef.current = true;
        }}
        onPointerLeave={event => {
          if (event.pointerType === 'mouse') hoverRef.current = false;
        }}
        onClickCapture={handleClickCapture}
      >
        {items.length === 0 ? (
          emptyState
        ) : (
          <>
            <div className="grid justify-items-center py-3" style={{ transformStyle: 'preserve-3d' }}>
              {items.map(item => {
                const active = item.id === activeId;
                const relative = item.bearingKnown ? signedAngleDelta(item.bearing, heading) : 0;
                return (
                  <div
                    key={item.id}
                    ref={element => {
                      if (element) cardRefs.current.set(item.id, element);
                      else cardRefs.current.delete(item.id);
                    }}
                    className="select-none"
                    data-deal-card={item.id}
                    style={{ gridArea: '1 / 1', width: cardWidth, willChange: 'transform, opacity', transformOrigin: 'center center' }}
                    aria-current={active ? 'true' : undefined}
                  >
                    <div className="metapase-card-in">
                      <div className={`mb-2 flex h-5 items-center justify-center gap-1.5 truncate whitespace-nowrap text-xs font-semibold ${active ? 'text-emerald-300' : 'text-slate-400'}`}>
                        <Navigation2 className="h-3.5 w-3.5 transition-transform duration-300" style={{ transform: `rotate(${relative}deg)` }} />
                        {formatDistance(item.distanceM)} {sideLabel(item, heading)}
                      </div>
                      <div className={item.id === flashId ? 'metapase-flash rounded-3xl' : 'rounded-3xl'}>
                        <DealCard
                          deal={item.deal}
                          reading={item.reading}
                          heading={heading}
                          selected={active}
                          matchesIntent={item.matches}
                          variant={compact ? 'compact' : 'full'}
                          onSelect={storeId => {
                            focusAndPin(storeId);
                            onOpen?.(storeId);
                          }}
                          onNegotiate={onNegotiate}
                          onPay={onPay}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="pointer-events-none absolute inset-y-0 left-0 z-[1001] w-12 bg-gradient-to-r from-[#070b17] to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-[1001] w-12 bg-gradient-to-l from-[#070b17] to-transparent" />
          </>
        )}
      </div>

      {items.length > 0 && (
        <div className="mt-3 flex items-center justify-between gap-3">
          <button type="button" onClick={() => step(-1)} disabled={items.length < 2} aria-label="Previous deal" className="grid h-9 w-9 place-items-center rounded-full bg-white/[0.06] text-slate-200 transition hover:bg-white/10 disabled:opacity-30">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <span className="sr-only" aria-live="polite">Deal {activeIndex + 1} of {items.length}</span>
            <div className="h-0.5 w-28 overflow-hidden rounded-full bg-white/10">
              <div ref={progressRef} className="h-full rounded-full bg-emerald-300/70" style={{ width: '0%' }} />
            </div>
            <span className="text-[11px] text-slate-500">{modeText[mode]}</span>
          </div>
          <button type="button" onClick={() => step(1)} disabled={items.length < 2} aria-label="Next deal" className="grid h-9 w-9 place-items-center rounded-full bg-white/[0.06] text-slate-200 transition hover:bg-white/10 disabled:opacity-30">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
