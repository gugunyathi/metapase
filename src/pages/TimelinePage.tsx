import { useMemo, useState } from 'react';
import { BadgePercent, Heart, PackageCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { TimelineEvent, TimelineKind, WatchItem } from '../types/metapase';
import { formatDayLabel, formatTimeOfDay, formatZAR } from '../lib/format';
import ItemTile from '../components/ItemTile';
import PageHeader from '../components/PageHeader';

type Filter = 'all' | TimelineKind;

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'wishlist', label: 'Wishlist' },
  { id: 'bought', label: 'Bought' },
  { id: 'promotion', label: 'On promotion' }
];

const KIND_META: Record<TimelineKind, { label: string; icon: LucideIcon; dot: string; chip: string }> = {
  wishlist: { label: 'Wishlist', icon: Heart, dot: 'bg-rose-400', chip: 'bg-rose-400/15 text-rose-200' },
  bought: { label: 'Bought', icon: PackageCheck, dot: 'bg-sky-400', chip: 'bg-sky-400/15 text-sky-200' },
  promotion: { label: 'On promotion', icon: BadgePercent, dot: 'bg-amber-300', chip: 'bg-amber-300/15 text-amber-200' }
};

const EMPTY_TEXT: Record<Filter, string> = {
  all: 'Your history starts here. Deals the agent finds, items you watch and everything you buy will line up on this timeline.',
  wishlist: 'No watched items yet. Open Parked on the home screen and choose Watch to follow an item’s price.',
  bought: 'Nothing bought yet. Paid items appear here with their receipts.',
  promotion: 'No promotions yet. They appear as soon as the agent finds deals near you.'
};

interface TimelinePageProps {
  timeline: TimelineEvent[];
  watchlist: WatchItem[];
  onRemoveWatch: (id: string) => void;
}

export default function TimelinePage({ timeline, watchlist, onRemoveWatch }: TimelinePageProps) {
  const [filter, setFilter] = useState<Filter>('all');
  const counts = useMemo(() => ({
    all: timeline.length,
    wishlist: timeline.filter(event => event.kind === 'wishlist').length,
    bought: timeline.filter(event => event.kind === 'bought').length,
    promotion: timeline.filter(event => event.kind === 'promotion').length
  }), [timeline]);

  const groups = useMemo(() => {
    const visible = timeline.filter(event => filter === 'all' || event.kind === filter).sort((a, b) => b.at - a.at);
    const result: { label: string; events: TimelineEvent[] }[] = [];
    for (const event of visible) {
      const label = formatDayLabel(event.at);
      const last = result[result.length - 1];
      if (last && last.label === label) last.events.push(event);
      else result.push({ label, events: [event] });
    }
    return result;
  }, [timeline, filter]);

  const watchBySku = useMemo(() => new Map(watchlist.map(item => [item.sku, item])), [watchlist]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Timeline" subtitle="Your wishlist, purchases and the promotions found around you" />
      <div className="mb-8 flex flex-wrap gap-2" role="tablist" aria-label="Filter timeline">
        {FILTERS.map(option => (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={filter === option.id}
            onClick={() => setFilter(option.id)}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${filter === option.id ? 'bg-white text-slate-950' : 'bg-white/[0.05] text-slate-300 hover:bg-white/10'}`}
          >
            {option.label}
            <span className={`rounded-full px-1.5 text-[11px] tabular-nums ${filter === option.id ? 'bg-slate-950/10' : 'bg-white/10'}`}>{counts[option.id]}</span>
          </button>
        ))}
      </div>

      {groups.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-white/10 p-8 text-center text-sm leading-relaxed text-slate-400">{EMPTY_TEXT[filter]}</p>
      ) : (
        <div className="space-y-10">
          {groups.map(group => (
            <section key={group.label}>
              <h2 className="sticky top-20 z-10 mb-4 inline-block rounded-full bg-[#050814]/90 px-3 py-1 text-xs font-semibold text-slate-300 backdrop-blur">{group.label}</h2>
              <ol className="relative space-y-4 pl-8 before:absolute before:bottom-2 before:left-[11px] before:top-2 before:w-px before:bg-gradient-to-b before:from-white/20 before:via-white/10 before:to-transparent">
                {group.events.map(event => {
                  const meta = KIND_META[event.kind];
                  const Icon = meta.icon;
                  const watched = event.kind === 'wishlist' ? watchBySku.get(event.item.sku) : undefined;
                  return (
                    <li key={event.id} className="metapase-card-in relative">
                      <span className={`absolute -left-[26px] top-5 h-3 w-3 rounded-full ring-4 ring-[#050814] ${meta.dot}`} />
                      <article className="rounded-3xl border border-white/[0.06] bg-white/[0.03] p-4 backdrop-blur">
                        <div className="flex items-start gap-3">
                          <ItemTile category={event.item.category} />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.chip}`}><Icon className="h-3 w-3" />{meta.label}</span>
                              <span className="text-[11px] tabular-nums text-slate-500">{formatTimeOfDay(event.at)}</span>
                            </div>
                            <p className="mt-1.5 truncate text-[15px] font-semibold text-white">{event.item.itemName}</p>
                            <p className="text-xs text-slate-400">{event.item.outletName}</p>
                            <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{event.note}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-base font-bold tabular-nums text-amber-200">{formatZAR(event.priceZAR)}</p>
                            {event.priceZAR < event.item.stickerPriceZAR && <p className="text-[11px] tabular-nums text-slate-500 line-through">{formatZAR(event.item.stickerPriceZAR)}</p>}
                          </div>
                        </div>
                        {watched && (
                          <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-black/25 px-3 py-2">
                            <span className="text-xs text-slate-300">{watched.alertAt ? 'Back nearby now' : 'Watching'} for under <span className="font-semibold text-white">{formatZAR(watched.targetPriceZAR)}</span></span>
                            <button type="button" onClick={() => onRemoveWatch(watched.id)} className="text-xs font-semibold text-slate-400 transition hover:text-rose-200">Stop watching</button>
                          </div>
                        )}
                      </article>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
