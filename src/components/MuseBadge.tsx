import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { getMuseStatus } from '../lib/muse';
import type { MuseStatusView } from '../lib/muse';

const POLL_MS = 45_000;

/** Shows whether the agents are reasoning with Muse Spark right now or running on their built-in rules. */
export default function MuseBadge() {
  const [status, setStatus] = useState<MuseStatusView | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      void getMuseStatus().then(next => {
        if (!cancelled) setStatus(next);
      });
    };
    load();
    const timer = window.setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const live = status?.state === 'live';
  const degraded = status?.state === 'degraded';
  const label = live ? 'Muse Spark' : degraded ? 'Muse paused' : 'Rules agent';
  const detail = live
    ? `Agents and stores are reasoning with ${status?.model ?? 'Muse Spark'}${status?.avgLatencyMs ? `, about ${status.avgLatencyMs} ms a call` : ''}.`
    : degraded
      ? `Muse Spark isn’t answering right now (${status?.lastError ?? 'no reply'}). The built-in rules are covering.`
      : status === undefined
        ? 'Checking Muse Spark…'
        : 'No Muse Spark connection here, so the agents use their built-in rules. Add MODEL_API_KEY on the server to turn Muse on.';

  const tone = live ? 'border-sky-300/50 bg-sky-400/10 text-sky-200' : degraded ? 'border-amber-300/40 bg-amber-300/10 text-amber-200' : 'border-white/10 bg-white/5 text-slate-400';
  return (
    <span title={detail} className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${tone}`}>
      <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="hidden min-[340px]:inline">{label}</span>
    </span>
  );
}
