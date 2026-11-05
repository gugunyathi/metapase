import React, { useState } from 'react';
import { 
  Volume2, 
  Wallet, 
  Navigation2, 
  ShoppingBag, 
  Sparkles, 
  CheckSquare, 
  Square, 
  RotateCcw, 
  RotateCw,
  Compass,
  ArrowRight,
  Radio,
  Eye,
  Minimize2,
  Maximize2
} from 'lucide-react';
import HeadingTape from './HeadingTape';
import type { CompassTarget } from './Compass';
import type { Deal, NodeReading, WishlistItem } from '../types/metapase';

interface WatchDeviceFrameProps {
  children: React.ReactNode;
}

export function WatchDeviceFrame({ children }: WatchDeviceFrameProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (isFullscreen) {
    return (
      <div className="mx-auto w-full max-w-[380px] space-y-3">
        <div className="flex items-center justify-between px-2 text-xs text-slate-400">
          <span>⌚ Watch Fullscreen Mode</span>
          <button 
            type="button" 
            onClick={() => setIsFullscreen(false)} 
            className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-xs text-slate-200 hover:bg-white/20"
          >
            <Minimize2 className="h-3 w-3" /> Show Watch Frame
          </button>
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-2 sm:py-6">
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          Apple Watch Ultra · 49mm Titanium Preview
        </span>
        <button
          type="button"
          onClick={() => setIsFullscreen(true)}
          className="rounded-full bg-white/5 p-1 text-slate-400 hover:bg-white/10 hover:text-white transition"
          title="Switch to borderless watch view"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div 
        className="relative mx-auto drop-shadow-[0_30px_60px_rgba(0,0,0,0.9)] select-none"
        style={{ 
          width: '320px', 
          maxWidth: '100%', 
          aspectRatio: '311 / 540' 
        }}
      >
        {/* Transparent Watch Casing with Straps */}
        <img 
          src="/assets/devices/watch-device-transparent.png" 
          alt="Apple Watch Frame" 
          className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10" 
        />

        {/* Cutout Bezel Edge with Glass Highlight */}
        <img 
          src="/assets/devices/watch-frame-cutout.png" 
          alt="Watch Bezel Overlay" 
          className="absolute inset-0 w-full h-full object-contain pointer-events-none z-30 opacity-90" 
        />

        {/* Live Interactive Watch Screen Viewport */}
        <div 
          className="absolute z-20 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden bg-[#070b14] text-slate-100 flex flex-col"
          style={{
            left: '12.2%',
            top: '25.0%',
            width: '68.8%',
            height: '50.0%',
            borderRadius: '26px',
            boxShadow: 'inset 0 0 16px rgba(0,0,0,0.9)'
          }}
        >
          {/* Subtle OLED Glass Sheen */}
          <div className="pointer-events-none absolute inset-0 z-40 rounded-[26px] bg-gradient-to-tr from-white/[0.04] via-transparent to-white/[0.08] border border-white/[0.08]" />

          {/* Interactive Screen Content */}
          <div className="relative z-10 p-2.5 space-y-2 text-xs">
            {children}
          </div>
        </div>
      </div>
      <p className="mt-4 text-center text-[11px] text-slate-500">
        Scroll inside the watch screen with mouse wheel or touch · Tap items to buy & negotiate
      </p>
    </div>
  );
}

interface CarDeviceFrameProps {
  children: React.ReactNode;
}

export function CarDeviceFrame({ children }: CarDeviceFrameProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (isFullscreen) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2 text-xs text-slate-400">
          <span>🚗 Car Touchscreen Fullscreen</span>
          <button 
            type="button" 
            onClick={() => setIsFullscreen(false)} 
            className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs text-slate-200 hover:bg-white/20"
          >
            <Minimize2 className="h-3 w-3" /> Show Dashboard Frame
          </button>
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-2 sm:py-4">
      <div className="mb-3 flex items-center justify-between w-full max-w-5xl px-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300">
          <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          Tesla / EV 15-inch Center Infotainment Dashboard Preview
        </span>
        <button
          type="button"
          onClick={() => setIsFullscreen(true)}
          className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-xs text-slate-400 hover:bg-white/10 hover:text-white transition"
          title="Switch to full car display"
        >
          <Maximize2 className="h-3.5 w-3.5" /> Fullscreen Display
        </button>
      </div>

      {/* Dashboard Mockup Frame */}
      <div 
        className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-2xl sm:rounded-3xl border border-white/10 bg-[#060810] shadow-[0_30px_80px_rgba(0,0,0,0.9)] select-none"
        style={{ aspectRatio: '877 / 431' }}
      >
        {/* Car Interior & Dashboard Graphic */}
        <img 
          src="/assets/devices/car-device.jpg" 
          alt="Car Dashboard Interior" 
          className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
        />

        {/* Live Interactive Infotainment Touchscreen Area */}
        <div 
          className="absolute z-20 overflow-y-auto [scrollbar-width:thin] bg-[#070b14] text-slate-100 flex flex-col border border-white/15"
          style={{
            left: '18.24%',
            top: '1.86%',
            width: '63.4%',
            height: '70.53%',
            borderRadius: '14px 14px 4px 4px',
            boxShadow: 'inset 0 0 25px rgba(0,0,0,0.85)'
          }}
        >
          {/* Subtle Screen Reflection Glare */}
          <div className="pointer-events-none absolute inset-0 z-30 rounded-[14px] bg-gradient-to-b from-white/[0.05] via-transparent to-transparent" />

          {/* Screen Content */}
          <div className="relative z-10 p-3 sm:p-4 space-y-4">
            {children}
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-slate-500">
        🚗 Drive-By Proximity Mode · Autonomous shopping & hands-free checkout while parked
      </p>
    </div>
  );
}

interface MuseDeviceFrameProps {
  directionSentence: string;
  isScanning: boolean;
  selectedDeal: Deal | null | undefined;
  onSpeak: () => void;
  onPay: (storeId: string) => void;
  formatZAR: (val: number) => string;
  compassPanel?: React.ReactNode;
}

export function MuseDeviceFrame({
  directionSentence,
  isScanning,
  selectedDeal,
  onSpeak,
  onPay,
  formatZAR,
  compassPanel
}: MuseDeviceFrameProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (isFullscreen) {
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <div className="flex items-center justify-between px-2 text-xs text-slate-400">
          <span>🎙️ Muse Fullscreen Communicator</span>
          <button 
            type="button" 
            onClick={() => setIsFullscreen(false)} 
            className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs text-slate-200 hover:bg-white/20"
          >
            <Minimize2 className="h-3 w-3" /> Show Handheld Device
          </button>
        </div>
        <section className="rounded-[2rem] border border-white/[0.06] bg-white/[0.02] p-8 text-center backdrop-blur">
          <div className="flex h-16 items-end justify-center gap-1.5" aria-hidden="true">
            {[0.35, 0.7, 0.5, 1, 0.6, 0.85, 0.4, 0.65, 0.3].map((scale, index) => (
              <span 
                key={index} 
                className={`w-2 rounded-full bg-gradient-to-t from-emerald-500 to-amber-200 ${isScanning ? 'animate-pulse' : ''}`} 
                style={{ height: `${Math.round(scale * 64)}px`, animationDelay: `${index * 80}ms` }} 
              />
            ))}
          </div>
          <p className="mx-auto mt-6 max-w-md text-lg leading-relaxed text-slate-100" aria-live="polite">{directionSentence}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={onSpeak} className="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-300">
              <Volume2 className="h-4 w-4" />Read directions aloud
            </button>
            {selectedDeal?.status === 'agreed' && (
              <button type="button" onClick={() => onPay(selectedDeal.storeId)} className="inline-flex items-center gap-2 rounded-full bg-amber-300 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-200">
                <Wallet className="h-4 w-4" />Pay {formatZAR(selectedDeal.negotiatedPriceZAR ?? 0)}
              </button>
            )}
          </div>
          <p className="mt-4 text-xs text-slate-500">Agreements, payments and errors are read aloud while this view is open.</p>
        </section>
        {compassPanel}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-2 sm:py-4">
      <div className="mb-3 flex items-center justify-between w-full max-w-md px-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300">
          <span className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
          Muse AI Voice Pebble · Handheld Hardware Preview
        </span>
        <button
          type="button"
          onClick={() => setIsFullscreen(true)}
          className="rounded-full bg-white/5 p-1 text-slate-400 hover:bg-white/10 hover:text-white transition"
          title="Fullscreen communicator"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Handheld Device Container */}
      <div 
        className="relative mx-auto w-[320px] max-w-full overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-[0_25px_60px_rgba(0,0,0,0.9)] select-none"
        style={{ aspectRatio: '299 / 370' }}
      >
        {/* Realistic Photograph of Hand Holding Pebble against Sky */}
        <img 
          src="/assets/devices/muse-device.jpg" 
          alt="Muse Handheld Device" 
          className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
        />

        {/* Live Interactive Screen Viewport in Device Center */}
        <div 
          className="absolute z-20 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden bg-[#070b14]/95 text-slate-100 flex flex-col justify-between p-3.5 border border-white/10"
          style={{
            left: '19.4%',
            top: '27.5%',
            width: '64.2%',
            height: '47.0%',
            borderRadius: '20px',
            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.9)'
          }}
        >
          {/* Subtle Glass Sheen */}
          <div className="pointer-events-none absolute inset-0 z-30 rounded-[20px] bg-gradient-to-tr from-white/[0.04] via-transparent to-white/[0.06]" />

          {/* Animated Waveform Bars */}
          <div className="relative z-10 flex h-7 items-end justify-center gap-1 pt-1" aria-hidden="true">
            {[0.4, 0.75, 0.55, 1, 0.65, 0.9, 0.45, 0.7, 0.35].map((scale, index) => (
              <span 
                key={index} 
                className={`w-1 rounded-full bg-gradient-to-t from-emerald-400 to-amber-200 ${isScanning ? 'animate-pulse' : ''}`} 
                style={{ height: `${Math.round(scale * 24)}px`, animationDelay: `${index * 80}ms` }} 
              />
            ))}
          </div>

          {/* Directional Audio Speech Text */}
          <p className="relative z-10 text-center text-[10px] sm:text-[11px] leading-tight text-slate-200 line-clamp-3 font-medium my-1">
            {directionSentence}
          </p>

          {/* Action Buttons */}
          <div className="relative z-10 flex flex-col gap-1 w-full mt-auto">
            <button 
              type="button" 
              onClick={onSpeak} 
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-emerald-400 px-3 py-1.5 text-[10px] font-black text-slate-950 transition hover:bg-emerald-300 shadow-sm shadow-emerald-400/30 active:scale-95"
            >
              <Volume2 className="h-3 w-3 shrink-0" />
              <span>Read directions aloud</span>
            </button>

            {selectedDeal?.status === 'agreed' && (
              <button 
                type="button" 
                onClick={() => onPay(selectedDeal.storeId)} 
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-amber-300 px-3 py-1.5 text-[10px] font-black text-slate-950 transition hover:bg-amber-200 active:scale-95"
              >
                <Wallet className="h-3 w-3 shrink-0" />
                <span>Pay {formatZAR(selectedDeal.negotiatedPriceZAR ?? 0)}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-slate-400 max-w-sm">
        Voice-first proximity computing · Directions and agreements are automatically read aloud
      </p>

      {/* Compass Controls & Deal List Below Device */}
      <div className="w-full max-w-2xl mt-4">
        {compassPanel}
      </div>
    </div>
  );
}

interface GlassesDeviceFrameProps {
  heading: number;
  targets: CompassTarget[];
  selectedId: string | null;
  selectedDeal: Deal | null | undefined;
  selectedReading: NodeReading | null | undefined;
  facing: boolean;
  relative: number | null;
  guidance: string;
  turnControls: React.ReactNode;
  formatZAR: (val: number) => string;
  formatDistance: (meters: number) => string;
  onPay: (storeId: string) => void;
  visibleDeals: Array<{ deal: Deal; reading?: NodeReading; matches: boolean }>;
  onSelectDeal: (storeId: string) => void;
  wishlist: WishlistItem[];
  activityLogs?: React.ReactNode;
}

export function GlassesDeviceFrame({
  heading,
  targets,
  selectedId,
  selectedDeal,
  selectedReading,
  facing,
  relative,
  guidance,
  turnControls,
  formatZAR,
  formatDistance,
  onPay,
  visibleDeals,
  onSelectDeal,
  wishlist,
  activityLogs
}: GlassesDeviceFrameProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({
    '0': true,
    '1': false,
    '2': false,
    '3': false
  });

  const toggleCheck = (idx: string) => {
    setCheckedItems(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const defaultShoppingList = [
    'Apples',
    'Spinach',
    'Eggs',
    'Garlic'
  ];

  const displayList = wishlist.length > 0 
    ? wishlist.slice(0, 4).map(w => w.originalText || w.query) 
    : defaultShoppingList;

  if (isFullscreen) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2 text-xs text-slate-400">
          <span>👓 Smart Glasses HUD Fullscreen</span>
          <button 
            type="button" 
            onClick={() => setIsFullscreen(false)} 
            className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs text-slate-200 hover:bg-white/20"
          >
            <Minimize2 className="h-3 w-3" /> Show Glasses Frame
          </button>
        </div>
        <section className="relative overflow-hidden rounded-[2rem] border border-emerald-500/20 bg-transparent p-6 shadow-none sm:p-8">
          <HeadingTape heading={heading} targets={targets} selectedId={selectedId} />
          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="flex gap-5">
              <div className="grid h-24 w-24 shrink-0 place-items-center rounded-full border border-emerald-400/30 bg-black/30">
                <Navigation2 className={`h-12 w-12 transition-transform duration-300 ${facing ? 'text-emerald-300' : 'text-emerald-100'}`} style={{ transform: `rotate(${relative ?? 0}deg)` }} />
              </div>
              <div className="min-w-0 space-y-1">
                <p className="text-sm text-emerald-300">{selectedReading ? `${selectedReading.node.name}, ${formatDistance(selectedReading.distanceM)}` : 'Looking for stores nearby'}</p>
                <p className="text-3xl font-bold tracking-tight text-white">{selectedDeal ? selectedDeal.ad.itemName : guidance}</p>
                {selectedDeal && (
                  <p className="text-2xl font-extrabold tabular-nums text-amber-200">
                    {formatZAR(selectedDeal.negotiatedPriceZAR ?? selectedDeal.ad.stickerPriceZAR)}
                    {selectedDeal.negotiatedPriceZAR !== null && <span className="ml-2 text-base font-medium text-slate-500 line-through">{formatZAR(selectedDeal.ad.stickerPriceZAR)}</span>}
                  </p>
                )}
                <p className={`text-sm font-semibold ${facing ? 'text-emerald-300' : 'text-slate-300'}`}>{guidance}</p>
              </div>
            </div>
          </div>
          <div className="mt-6">{turnControls}</div>
        </section>
        {activityLogs}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-2 sm:py-4">
      <div className="mb-3 flex items-center justify-between w-full max-w-4xl px-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          Smart AR Eyewear HUD · Retinal MicroLED Projection (110° FOV)
        </span>
        <button
          type="button"
          onClick={() => setIsFullscreen(true)}
          className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-xs text-slate-400 hover:bg-white/10 hover:text-white transition"
          title="Switch to full AR overlay"
        >
          <Maximize2 className="h-3.5 w-3.5" /> Fullscreen AR
        </button>
      </div>

      {/* Glasses Frame with Store Background Viewport */}
      <div 
        className="relative mx-auto w-full max-w-4xl overflow-hidden rounded-3xl select-none shadow-[0_30px_90px_rgba(0,0,0,0.95)]"
        style={{ aspectRatio: '813 / 433' }}
      >
        {/* Real Smart Glasses with Supermarket Store Backdrop */}
        <img 
          src="/assets/devices/glasses-device.png" 
          alt="Smart Glasses AR View" 
          className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none z-0"
        />

        {/* --- DYNAMIC LIVE AR HUD OVERLAYS --- */}

        {/* 1. Top Center Compass Ribbon Visor */}
        <div className="absolute top-3 sm:top-5 left-1/2 -translate-x-1/2 z-20 w-[90%] sm:w-[62%] max-w-[460px]">
          <div className="rounded-xl border border-emerald-400/30 bg-[#050914]/90 p-1.5 sm:p-2 backdrop-blur-md shadow-lg shadow-emerald-500/10">
            <HeadingTape heading={heading} targets={targets} selectedId={selectedId} />
          </div>
        </div>

        {/* 2. Left Lens AR Navigation Reticle & Turn Directions */}
        <div className="absolute left-6 sm:left-14 top-24 sm:top-28 z-20 flex flex-col gap-2 max-w-[170px] sm:max-w-[210px]">
          {/* Turn instruction pill */}
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-sky-400/40 bg-sky-500/25 px-2 py-0.5 text-[10px] sm:text-xs font-bold text-sky-200 backdrop-blur-sm">
              <Navigation2 className="h-3 w-3" />
              <span>{selectedReading ? `Go Straight ${formatDistance(selectedReading.distanceM)}` : 'Scanning Aisle'}</span>
            </div>
            <div>
              <span className="inline-block rounded-lg border border-sky-400/40 bg-sky-500/25 px-2 py-0.5 text-[10px] sm:text-xs font-bold text-sky-200 backdrop-blur-sm">
                {facing ? 'Straight Ahead' : relative && relative > 0 ? `Turn Right ${Math.round(relative)}°` : `Turn Left ${Math.round(Math.abs(relative ?? 0))}°`}
              </span>
            </div>
          </div>

          {/* Compass Radar Reticle */}
          <div className="relative mt-2 h-16 w-16 sm:h-20 sm:w-20">
            <div className="absolute inset-0 rounded-full border-2 border-emerald-400/40 bg-black/40 backdrop-blur-sm shadow-[0_0_15px_rgba(52,211,153,0.3)] grid place-items-center">
              <Navigation2 
                className={`h-7 w-7 sm:h-9 sm:w-9 transition-transform duration-300 ${facing ? 'text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'text-emerald-100'}`} 
                style={{ transform: `rotate(${relative ?? 0}deg)` }} 
              />
            </div>
            {/* Pulsing beacon ping */}
            <div className="absolute -inset-1 rounded-full border border-emerald-400/30 animate-ping opacity-30 pointer-events-none" />
          </div>

          {/* Audio Waveform equalizing box */}
          <div className="mt-1 flex items-center gap-1 rounded-lg border border-white/10 bg-black/50 px-2 py-1 backdrop-blur-sm w-fit">
            <Radio className="h-3 w-3 text-emerald-400 animate-pulse" />
            <div className="flex h-3 items-end gap-0.5">
              {[0.4, 0.9, 0.6, 1, 0.5, 0.8, 0.3].map((val, i) => (
                <span 
                  key={i} 
                  className="w-0.5 rounded-full bg-emerald-400" 
                  style={{ height: `${Math.round(val * 12)}px` }} 
                />
              ))}
            </div>
          </div>
        </div>

        {/* 3. Center AR Target Item Card */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-8 sm:bottom-12 z-20 w-[88%] sm:w-[50%] max-w-[340px]">
          {selectedDeal ? (
            <div className="group rounded-xl border border-emerald-400/40 bg-[#050814]/90 p-2 sm:p-2.5 backdrop-blur-md shadow-2xl transition hover:border-emerald-300">
              <div className="flex items-center justify-between text-[10px] text-emerald-300 font-semibold mb-1">
                <span>{selectedReading ? selectedReading.node.name : 'Target Beacon'}</span>
                <span>{selectedReading ? formatDistance(selectedReading.distanceM) : ''}</span>
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-white line-clamp-1">
                {selectedDeal.ad.itemName}
              </h4>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-sm sm:text-base font-extrabold text-amber-300 tabular-nums">
                  {formatZAR(selectedDeal.negotiatedPriceZAR ?? selectedDeal.ad.stickerPriceZAR)}
                </span>
                {selectedDeal.negotiatedPriceZAR !== null && (
                  <span className="text-[10px] text-slate-400 line-through">
                    {formatZAR(selectedDeal.ad.stickerPriceZAR)}
                  </span>
                )}
                <span className="ml-auto text-[10px] font-bold text-emerald-400">
                  {facing ? 'In Crosshairs' : guidance}
                </span>
              </div>
              <div className="mt-2 flex gap-1.5">
                <button
                  type="button"
                  onClick={() => onPay(selectedDeal.storeId)}
                  className="flex-1 rounded-lg bg-gradient-to-r from-amber-300 to-emerald-400 py-1 text-[11px] font-extrabold text-slate-950 transition hover:brightness-110 active:scale-95"
                >
                  Buy Now
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-400/30 bg-[#050814]/80 p-2 text-center text-xs text-slate-300 backdrop-blur-md">
              <p className="font-semibold text-emerald-300">Looking for aisle beacons…</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{guidance}</p>
            </div>
          )}
        </div>

        {/* 4. Right Lens AR Shopping List & Compact Deals */}
        <div className="absolute right-4 sm:right-10 top-12 sm:top-14 z-20 flex flex-col gap-2 max-w-[150px] sm:max-w-[185px]">
          {/* Shopping Checklist */}
          <div className="rounded-xl border border-sky-400/30 bg-[#050914]/85 p-2 backdrop-blur-md shadow-lg">
            <div className="flex items-center justify-between border-b border-white/10 pb-1 mb-1 text-[10px] font-extrabold text-sky-200">
              <span>Shopping List</span>
              <span className="text-amber-300 font-mono">R850</span>
            </div>
            <ul className="space-y-1 text-[10px] text-slate-200">
              {displayList.map((item, idx) => {
                const isChecked = !!checkedItems[String(idx)];
                return (
                  <li 
                    key={idx} 
                    onClick={() => toggleCheck(String(idx))}
                    className="flex items-center gap-1.5 cursor-pointer hover:text-white transition"
                  >
                    {isChecked ? (
                      <CheckSquare className="h-3 w-3 text-emerald-400 shrink-0" />
                    ) : (
                      <Square className="h-3 w-3 text-slate-400 shrink-0" />
                    )}
                    <span className={`truncate ${isChecked ? 'line-through text-slate-400' : ''}`}>
                      {item}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Compact Nearby Aisle Deals */}
          <div className="rounded-xl border border-emerald-500/30 bg-[#050914]/85 p-1.5 backdrop-blur-md max-h-[140px] sm:max-h-[160px] overflow-y-auto [scrollbar-width:none]">
            <p className="text-[9px] font-bold text-emerald-300 uppercase tracking-wider px-1 pb-1">
              Aisle Deals
            </p>
            <div className="space-y-1">
              {visibleDeals.slice(0, 3).map(({ deal, reading }) => (
                <div 
                  key={deal.storeId}
                  onClick={() => onSelectDeal(deal.storeId)}
                  className={`flex items-center gap-1.5 rounded-lg p-1 cursor-pointer transition text-left ${
                    deal.storeId === selectedId ? 'bg-emerald-500/25 border border-emerald-400/40' : 'hover:bg-white/5'
                  }`}
                >
                  {deal.ad.imageUrl ? (
                    <img 
                      src={deal.ad.imageUrl} 
                      alt={deal.ad.itemName} 
                      className="h-6 w-6 rounded object-cover shrink-0" 
                    />
                  ) : (
                    <div className="h-6 w-6 rounded bg-emerald-500/20 border border-emerald-400/30 grid place-items-center shrink-0">
                      <ShoppingBag className="h-3 w-3 text-emerald-300" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-bold text-white truncate">{deal.ad.itemName}</p>
                    <p className="text-[9px] font-extrabold text-amber-300 tabular-nums">
                      {formatZAR(deal.negotiatedPriceZAR ?? deal.ad.stickerPriceZAR)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Ambient Retinal Glow vignette */}
        <div className="pointer-events-none absolute inset-0 z-10 bg-radial-gradient from-transparent via-transparent to-black/40" />
      </div>

      {/* Compass Turn Controls under Glasses */}
      <div className="mt-3 flex items-center justify-center gap-3">
        {turnControls}
      </div>

      <p className="mt-2 text-center text-xs text-slate-500">
        👓 Retinal projection aligns AR targets directly with real-world aisle items as you look around
      </p>

      {activityLogs && (
        <div className="mt-4 w-full max-w-4xl">
          {activityLogs}
        </div>
      )}
    </div>
  );
}
