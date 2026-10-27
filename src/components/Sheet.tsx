import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  tone?: 'amber' | 'emerald';
  children: ReactNode;
}

export default function Sheet({ open, onClose, title, subtitle, icon: Icon, tone = 'emerald', children }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    panelRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-stretch sm:justify-end" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close" onClick={onClose} className="metapase-fade-in absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="metapase-sheet-in relative flex max-h-[88vh] w-full flex-col rounded-t-[2rem] border border-white/10 bg-[#0a0f1d] shadow-2xl outline-none sm:max-h-none sm:w-[440px] sm:rounded-none sm:rounded-l-[2rem]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-start gap-3 p-5">
          {Icon && (
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${tone === 'amber' ? 'bg-amber-300/15 text-amber-200' : 'bg-emerald-400/15 text-emerald-300'}`}>
              <Icon className="h-5 w-5" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold tracking-tight text-white">{title}</h2>
            {subtitle && <p className="text-xs leading-relaxed text-slate-400">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/[0.06] text-slate-300 transition hover:bg-white/10">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-6">{children}</div>
      </div>
    </div>
  );
}
