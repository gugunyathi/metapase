import { useState } from 'react';
import { Navigation2, Check, MapPin, Compass, Building2, AlertCircle, LoaderCircle, Shield } from 'lucide-react';
import type { GeoFix } from '../types/metapase';

interface LocationPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestLocation: () => Promise<GeoFix | null>;
  onUseSimulated: () => void;
}

export default function LocationPromptModal({
  isOpen,
  onClose,
  onRequestLocation,
  onUseSimulated
}: LocationPromptModalProps) {
  const [phase, setPhase] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [coordsSummary, setCoordsSummary] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAllowLocation = async () => {
    setPhase('requesting');
    setErrorMessage(null);
    try {
      const fix = await onRequestLocation();
      if (fix) {
        setCoordsSummary(`${fix.lat.toFixed(4)}, ${fix.lng.toFixed(4)} (±${Math.round(fix.accuracyM)}m)`);
        setPhase('granted');
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setPhase('idle');
      }
    } catch (err) {
      setPhase('denied');
      const msg = err instanceof Error ? err.message : 'Unable to acquire location.';
      setErrorMessage(msg);
    }
  };

  const handleSimulated = () => {
    onUseSimulated();
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="location-prompt-title"
      className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-black/75 p-4 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-[#070b19] p-6 shadow-2xl sm:p-8">
        {/* Glow accent */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 h-32 w-48 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" />

        {/* Icon & Title */}
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-amber-300 text-slate-950 shadow-[0_10px_35px_-8px_rgba(52,211,153,0.5)]">
            <Navigation2 className={`h-8 w-8 ${phase === 'requesting' ? 'animate-pulse' : ''}`} />
            {phase === 'granted' && (
              <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-emerald-500 text-white">
                <Check className="h-4 w-4 stroke-[3]" />
              </span>
            )}
          </div>

          <h2 id="location-prompt-title" className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            {phase === 'granted' ? 'Location Enabled!' : 'Enable Location Tracking'}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            {phase === 'granted'
              ? `Tracking active at ${coordsSummary}. Discovering real-time deals around you.`
              : 'MetaPase uses your live GPS position to detect nearby stores within 50 metres, point your compass straight to deals, and match promotions.'}
          </p>
        </div>

        {/* Features / Benefits List */}
        {phase !== 'granted' && (
          <div className="mt-6 space-y-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-xs text-slate-300">
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              <div>
                <strong className="text-white">50m Proximity Radar:</strong> Automatically bargains with stores as you walk or drive by.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Compass className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
              <div>
                <strong className="text-white">Heading & Bearings:</strong> Calculates turn-by-turn direction straight to store entrances.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
              <div>
                <strong className="text-white">Auto-Geofenced Malls:</strong> Switches inventory as you enter Bel Air, Fourways, Northgate, or Blueberry Square.
              </div>
            </div>
          </div>
        )}

        {/* Denied / Error guidance */}
        {phase === 'denied' && (
          <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
            <div className="space-y-1">
              <p className="font-semibold text-rose-100">Location permission was not granted</p>
              <p className="text-[11px] leading-relaxed text-rose-300">
                {errorMessage || 'To use live GPS, please allow location in your browser address bar. You can continue with simulated venue mode in the meantime.'}
              </p>
            </div>
          </div>
        )}

        {/* Success confirmation */}
        {phase === 'granted' && (
          <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-bold text-emerald-300">
            <Check className="h-4 w-4 text-emerald-400" />
            <span>Connected to GPS location. Loading nearby stores...</span>
          </div>
        )}

        {/* Action Buttons */}
        {phase !== 'granted' && (
          <div className="mt-6 space-y-2.5">
            <button
              type="button"
              onClick={handleAllowLocation}
              disabled={phase === 'requesting'}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 to-emerald-300 px-5 py-3.5 text-sm font-extrabold text-slate-950 shadow-lg shadow-emerald-400/20 transition hover:brightness-105 active:scale-[0.99] disabled:opacity-70"
            >
              {phase === 'requesting' ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin text-slate-950" />
                  <span>Waiting for Browser Permission…</span>
                </>
              ) : (
                <>
                  <Navigation2 className="h-4 w-4" />
                  <span>Allow Location Tracking</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleSimulated}
              disabled={phase === 'requesting'}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              Continue with Simulated Mall Location
            </button>
          </div>
        )}

        {/* Privacy Note */}
        <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-500">
          <Shield className="h-3 w-3 text-slate-400" />
          <span>Location is processed on-device for proximity matching only.</span>
        </p>
      </div>
    </div>
  );
}

