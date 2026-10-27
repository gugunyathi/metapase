import { useEffect, useRef } from 'react';
import { LogEntry } from '../types/metapase';

const SOURCE_LABEL: Record<LogEntry['source'], string> = {
  SYSTEM: 'System',
  BLE_RADIO: 'Radio',
  LLAMA_AGENT: 'Agent',
  META_PAY: 'Meta Pay'
};

const TYPE_COLOR: Record<LogEntry['type'], string> = {
  info: 'text-slate-300',
  success: 'text-emerald-300',
  warning: 'text-amber-200',
  error: 'text-rose-300'
};

interface ActivityLogProps {
  logs: LogEntry[];
  heightClass?: string;
}

export default function ActivityLog({ logs, heightClass = 'h-64' }: ActivityLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = scrollRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [logs]);

  return (
    <section className="flex flex-col rounded-3xl border border-white/[0.06] bg-white/[0.02] backdrop-blur">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
        <h2 className="text-sm font-semibold text-white">Agent activity</h2>
        <span className="text-xs text-slate-500">{logs.length} events</span>
      </div>
      <div ref={scrollRef} className={`${heightClass} space-y-2 overflow-y-auto px-5 py-3 text-[13px] leading-relaxed`} role="log" aria-live="polite">
        {logs.length === 0 && <p className="text-slate-500">Nothing yet. The agent logs every scan, offer and payment here.</p>}
        {logs.map(entry => (
          <div key={entry.id} className="grid grid-cols-[auto_auto_1fr] items-baseline gap-2">
            <span className="tabular-nums text-xs text-slate-600">{entry.timestamp}</span>
            <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[11px] text-slate-400">{SOURCE_LABEL[entry.source]}</span>
            <span className={TYPE_COLOR[entry.type]}>{entry.message}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
