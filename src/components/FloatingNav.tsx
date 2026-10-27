import { useEffect, useRef, useState } from 'react';
import { History, House, Settings, ShoppingCart, Telescope, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PageId } from '../types/metapase';

export const NAV_ITEMS: { id: PageId; label: string; icon: LucideIcon }[] = [
  { id: 'home', label: 'Home', icon: House },
  { id: 'discover', label: 'Discover', icon: Telescope },
  { id: 'timeline', label: 'Timeline', icon: History },
  { id: 'cart', label: 'Cart', icon: ShoppingCart },
  { id: 'settings', label: 'Settings', icon: Settings }
];

interface FloatingNavProps {
  page: PageId;
  onNavigate: (page: PageId) => void;
  badges: Partial<Record<PageId, number>>;
  bumpKey?: number;
}

export default function FloatingNav({ page, onNavigate, badges, bumpKey = 0 }: FloatingNavProps) {
  const [open, setOpen] = useState<boolean>(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = NAV_ITEMS.find(item => item.id === page) ?? NAV_ITEMS[0];
  const CurrentIcon = current.icon;
  const totalBadge = Object.values(badges).reduce<number>((sum, value) => sum + (value ?? 0), 0);

  useEffect(() => {
    if (!open) return;
    const handlePointer = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('pointerdown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="fixed z-50 flex flex-col items-end gap-3"
      style={{ right: 'calc(1rem + env(safe-area-inset-right, 0px))', bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <nav
        id="metapase-nav"
        aria-label="Main"
        className={`flex flex-col items-end gap-2.5 transition-all duration-300 ${open ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 opacity-0'}`}
      >
        {NAV_ITEMS.map((item, index) => {
          const Icon = item.icon;
          const active = item.id === page;
          const badge = badges[item.id] ?? 0;
          return (
            <button
              key={item.id}
              type="button"
              tabIndex={open ? 0 : -1}
              onClick={() => {
                onNavigate(item.id);
                setOpen(false);
              }}
              aria-current={active ? 'page' : undefined}
              className={`group flex items-center gap-3 transition-all duration-300 ${open ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'}`}
              style={{ transitionDelay: open ? `${(NAV_ITEMS.length - index) * 35}ms` : '0ms' }}
            >
              <span className={`rounded-full px-3 py-1.5 text-xs font-semibold shadow-lg backdrop-blur-xl transition ${active ? 'bg-white text-slate-950' : 'bg-slate-900/90 text-slate-200 group-hover:bg-slate-800'}`}>{item.label}</span>
              <span className={`relative grid h-12 w-12 place-items-center rounded-full border shadow-xl backdrop-blur-xl transition ${active ? 'border-emerald-300/60 bg-emerald-400 text-slate-950' : 'border-white/10 bg-slate-900/90 text-slate-200 group-hover:border-white/25'}`}>
                <Icon className="h-5 w-5" />
                {badge > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-amber-300 px-1 text-[10px] font-bold text-slate-950">{badge}</span>}
              </span>
            </button>
          );
        })}
      </nav>
      <span key={bumpKey} data-corner="cart" className={`inline-flex ${bumpKey > 0 ? 'metapase-bump' : ''}`}>
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        aria-expanded={open}
        aria-controls="metapase-nav"
        aria-label={open ? 'Close menu' : `Open menu. You’re on ${current.label}`}
        className="relative grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-amber-300 text-slate-950 shadow-[0_14px_40px_-10px_rgba(52,211,153,0.75)] transition hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-300"
      >
        <span className={`transition-transform duration-300 ${open ? 'rotate-90' : 'rotate-0'}`}>{open ? <X className="h-6 w-6" /> : <CurrentIcon className="h-6 w-6" />}</span>
        {!open && totalBadge > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-slate-950 px-1 text-[10px] font-bold text-amber-200 ring-2 ring-amber-300">{totalBadge}</span>}
      </button>
      </span>
    </div>
  );
}
