import { Bluetooth, BluetoothSearching, Bot, Building2, LocateFixed, RefreshCw, Satellite, Sparkles } from 'lucide-react';
import { DataSource, EngineStats, GeoFix, IntentFilter, NodeReading, ResolvedMode, VenueMode } from '../types/metapase';
import { MATCH_RADIUS_M, SCAN_INTERVAL_MS } from '../config/venue';
import { formatClock, formatDistance, formatZAR } from '../lib/format';
import { API_BASE } from '../lib/api';

export interface ControlPanelProps {
  autopilot: boolean;
  onAutopilotChange: (value: boolean) => void;
  isScanning: boolean;
  lastScanAt: number | null;
  serviceOnline: boolean | null;
  onScanNow: () => void;
  dataSource: DataSource;
  onDataSourceChange: (source: DataSource) => void;
  venuePref: VenueMode;
  onVenuePrefChange: (mode: VenueMode) => void;
  resolvedMode: ResolvedMode;
  fix: GeoFix | null;
  geoError: string | null;
  geoSupported: boolean;
  onCenterVenue: () => void;
  intent: IntentFilter;
  onIntentChange: (intent: IntentFilter) => void;
  maxBudgetZAR: number;
  onBudgetChange: (value: number) => void;
  readings: NodeReading[];
  rssiMap: Record<string, number>;
  onRssiChange: (storeId: string, value: number) => void;
  stats: EngineStats;
  onReset: () => void;
  beaconScan: {
    supported: boolean;
    unsupportedReason: string | null;
    status: 'idle' | 'starting' | 'scanning' | 'error';
    error: string | null;
    heardCount: number;
    onStart: () => void;
    onStop: () => void;
  };
  liveNodeIds: Set<string>;
  onSimulateRun?: () => void;
}

const PANEL = 'rounded-3xl border border-white/[0.06] bg-white/[0.02] p-5 backdrop-blur';

const INTENT_OPTIONS: { id: IntentFilter; label: string }[] = [
  { id: 'any', label: 'Anything' },
  { id: 'apparel', label: 'Apparel' },
  { id: 'footwear', label: 'Footwear' },
  { id: 'groceries', label: 'Groceries' },
  { id: 'electronics', label: 'Electronics' },
  { id: 'beauty', label: 'Beauty' }
];

const SOURCE_OPTIONS: { id: DataSource; label: string }[] = [
  { id: 'live', label: 'Live backend' },
  { id: 'demo', label: 'Demo stores' }
];

const VENUE_OPTIONS: { id: VenueMode; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'indoor', label: 'Indoor' },
  { id: 'outdoor', label: 'Outdoor' }
];

export default function ControlPanel(props: ControlPanelProps) {
  const {
    autopilot, onAutopilotChange, isScanning, lastScanAt, serviceOnline, onScanNow, dataSource, onDataSourceChange,
    venuePref, onVenuePrefChange, resolvedMode, fix, geoError, geoSupported, onCenterVenue,
    intent, onIntentChange, maxBudgetZAR, onBudgetChange, readings, rssiMap, onRssiChange, stats, onReset, beaconScan, liveNodeIds, onSimulateRun
  } = props;

  const positioningText = (() => {
    if (resolvedMode === 'outdoor') {
      if (!geoSupported) return 'This browser has no location access.';
      if (geoError) return geoError;
      return fix ? `GPS fix, accurate to ${Math.round(fix.accuracyM)} m.` : 'Waiting for a GPS fix.';
    }
    if (venuePref === 'auto' && fix) return `Using beacon signals. GPS is only accurate to ${Math.round(fix.accuracyM)} m here.`;
    return 'Estimating your position from beacon signals.';
  })();

  const inRangeCount = readings.filter(reading => reading.inRange).length;

  return (
    <div className="space-y-5">
      <section className={PANEL}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${autopilot ? 'bg-emerald-400/15 text-emerald-300' : 'bg-white/5 text-slate-400'}`}><Bot className="h-5 w-5" /></span>
            <div>
              <h2 className="text-sm font-semibold text-white">Agent autopilot</h2>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-400">Scans every {SCAN_INTERVAL_MS / 1000} s and negotiates matching deals. You approve every payment.</p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={autopilot}
            aria-label="Agent autopilot"
            onClick={() => onAutopilotChange(!autopilot)}
            className={`relative h-7 w-12 shrink-0 rounded-full transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 ${autopilot ? 'bg-emerald-400' : 'bg-white/10'}`}
          >
            <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${autopilot ? 'left-6' : 'left-1'}`} />
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-1 rounded-2xl bg-black/30 p-1">
          {SOURCE_OPTIONS.map(option => (
            <button
              key={option.id}
              type="button"
              aria-pressed={dataSource === option.id}
              onClick={() => onDataSourceChange(option.id)}
              className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${dataSource === option.id ? 'bg-white text-slate-950' : 'text-slate-400 hover:text-white'}`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          {dataSource === 'demo' ? 'Simulated stores that bargain in this browser. Nothing is charged. A new shopping run starts every 40 s while autopilot is on.' : `Deals, offers and payments go to ${API_BASE}.`}
        </p>
        {dataSource === 'demo' && onSimulateRun && (
          <button type="button" onClick={onSimulateRun} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-300/15 px-3 py-2 text-xs font-semibold text-amber-200 transition hover:bg-amber-300/25">
            <Sparkles className="h-3.5 w-3.5" />Simulate a shopping run now
          </button>
        )}
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            {serviceOnline === false
              ? <span className="text-rose-300">{dataSource === 'live' ? `Deal service offline at ${API_BASE}` : 'Demo stores unavailable'}</span>
              : lastScanAt ? `Last scan ${formatClock(lastScanAt)}, ${inRangeCount} in range` : 'No scans yet'}
          </p>
          <button type="button" onClick={onScanNow} disabled={isScanning} className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/10 disabled:opacity-50">
            <RefreshCw className={`h-3.5 w-3.5 ${isScanning ? 'animate-spin' : ''}`} />Scan now
          </button>
        </div>
      </section>

      <section className={PANEL}>
        <h2 className="text-sm font-semibold text-white">Positioning</h2>
        <div className="mt-3 grid grid-cols-3 gap-1 rounded-2xl bg-black/30 p-1">
          {VENUE_OPTIONS.map(option => (
            <button
              key={option.id}
              type="button"
              aria-pressed={venuePref === option.id}
              onClick={() => onVenuePrefChange(option.id)}
              className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${venuePref === option.id ? 'bg-white text-slate-950' : 'text-slate-400 hover:text-white'}`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-slate-400">
          {resolvedMode === 'outdoor' ? <Satellite className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-300" /> : <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />}
          {positioningText}
        </p>
        <button type="button" onClick={onCenterVenue} disabled={!fix} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/5 disabled:opacity-40">
          <LocateFixed className="h-3.5 w-3.5" />Center the venue on my location
        </button>
      </section>

      <section className={PANEL}>
        <h2 className="text-sm font-semibold text-white">What you're after</h2>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {INTENT_OPTIONS.map(option => (
            <button
              key={option.id}
              type="button"
              aria-pressed={intent === option.id}
              onClick={() => onIntentChange(option.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${intent === option.id ? 'bg-amber-300 text-slate-950' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <label className="mt-5 block">
          <span className="flex items-baseline justify-between text-xs text-slate-400">
            <span>Most you'll pay per item</span>
            <span className="text-base font-bold tabular-nums text-white">{formatZAR(maxBudgetZAR)}</span>
          </span>
          <input type="range" min={100} max={3000} step={50} value={maxBudgetZAR} onChange={event => onBudgetChange(Number(event.target.value))} className="mt-2 w-full accent-amber-300" />
        </label>
      </section>

      <section className={PANEL}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Store signals</h2>
          <span className="text-xs text-slate-500">{inRangeCount} within {MATCH_RADIUS_M} m</span>
        </div>
        <div className="mt-3 rounded-2xl bg-black/30 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              {beaconScan.status === 'scanning' ? <BluetoothSearching className="h-4 w-4 shrink-0 text-sky-300" /> : <Bluetooth className="h-4 w-4 shrink-0 text-slate-400" />}
              <span className="truncate text-xs font-semibold text-slate-200">
                {beaconScan.status === 'scanning' ? `Scanning, ${beaconScan.heardCount} beacon${beaconScan.heardCount === 1 ? '' : 's'} heard` : 'Real beacon scanning'}
              </span>
            </div>
            {beaconScan.status === 'scanning' ? (
              <button type="button" onClick={beaconScan.onStop} className="shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-100 transition hover:bg-white/15">Stop</button>
            ) : (
              <button type="button" onClick={beaconScan.onStart} disabled={!beaconScan.supported || beaconScan.status === 'starting'} className="shrink-0 rounded-full bg-sky-400 px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-sky-300 disabled:opacity-40">
                {beaconScan.status === 'starting' ? 'Starting' : 'Scan'}
              </button>
            )}
          </div>
          {(!beaconScan.supported || beaconScan.error) && (
            <p className={`mt-2 text-[11px] leading-relaxed ${beaconScan.error ? 'text-rose-300' : 'text-slate-500'}`}>{beaconScan.error ?? beaconScan.unsupportedReason}</p>
          )}
        </div>
        <div className="mt-4 space-y-4">
          {readings.map(reading => {
            const closeness = Number.isFinite(reading.distanceM) ? Math.max(0, 1 - reading.distanceM / MATCH_RADIUS_M) : 0;
            return (
              <div key={reading.node.id}>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-slate-200">
                    {reading.node.name}
                    {liveNodeIds.has(reading.node.id) && <span className="rounded-full bg-sky-400/15 px-1.5 py-0.5 text-[10px] font-semibold text-sky-200">Live</span>}
                  </span>
                  <span className={reading.inRange ? 'text-emerald-300' : 'text-slate-500'}>
                    {formatDistance(reading.distanceM)}{reading.inRange ? '' : ', out of range'}{resolvedMode === 'indoor' ? `, ${rssiMap[reading.node.id]} dBm` : ''}
                  </span>
                </div>
                {resolvedMode === 'indoor' ? (
                  <input
                    type="range"
                    min={-100}
                    max={-50}
                    value={rssiMap[reading.node.id]}
                    disabled={liveNodeIds.has(reading.node.id)}
                    aria-label={`${reading.node.name} signal strength`}
                    onChange={event => onRssiChange(reading.node.id, Number(event.target.value))}
                    className="mt-1.5 w-full accent-emerald-400"
                  />
                ) : (
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div className="h-full rounded-full bg-sky-400 transition-all" style={{ width: `${closeness * 100}%` }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-xs leading-relaxed text-slate-500">
          {resolvedMode === 'indoor'
            ? 'Scan to use real beacons where your browser supports it. Otherwise set each store’s signal here to test indoor matching; a stronger signal means a closer store.'
            : 'Distances come from your GPS fix and each store’s mapped position.'}
        </p>
      </section>

      <section className={PANEL}>
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><Sparkles className="h-4 w-4 text-amber-300" />This session</h2>
          <button type="button" onClick={onReset} className="text-xs font-semibold text-slate-400 transition hover:text-white">Reset</button>
        </div>
        <dl className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-black/25 p-3"><dt className="text-[11px] text-slate-500">Saved</dt><dd className="mt-1 text-base font-bold tabular-nums text-emerald-300">{formatZAR(stats.savedZAR)}</dd></div>
          <div className="rounded-2xl bg-black/25 p-3"><dt className="text-[11px] text-slate-500">Spent</dt><dd className="mt-1 text-base font-bold tabular-nums text-white">{formatZAR(stats.spentZAR)}</dd></div>
          <div className="rounded-2xl bg-black/25 p-3"><dt className="text-[11px] text-slate-500">Purchases</dt><dd className="mt-1 text-base font-bold tabular-nums text-white">{stats.purchases}</dd></div>
        </dl>
      </section>
    </div>
  );
}
