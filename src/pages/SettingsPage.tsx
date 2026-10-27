import type { ReactNode } from 'react';
import { Bell, Fingerprint, ShoppingBag, Trash2, UserRound, Vibrate } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { AppPreferences, UserProfile } from '../types/metapase';
import ControlPanel from '../components/ControlPanel';
import type { ControlPanelProps } from '../components/ControlPanel';
import PageHeader from '../components/PageHeader';

interface SettingsPageProps {
  profile: UserProfile;
  onProfileChange: (profile: UserProfile) => void;
  prefs: AppPreferences;
  onPrefsChange: (prefs: AppPreferences) => void;
  controls: ControlPanelProps;
  onClearHistory: () => void;
  status?: ReactNode;
  autoBuyForced?: boolean;
}

const PANEL = 'rounded-3xl border border-white/[0.06] bg-white/[0.02] p-5 backdrop-blur';

const initialsOf = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'You';
  return parts.slice(0, 2).map(part => part[0]?.toUpperCase() ?? '').join('');
};

function ToggleRow({ icon: Icon, label, description, checked, onChange, disabled = false }: { icon: LucideIcon; label: string; description: string; checked: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="flex gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/5 text-slate-300"><Icon className="h-4 w-4" /></span>
        <div>
          <p className="text-sm font-semibold text-white">{label}</p>
          <p className="text-xs leading-relaxed text-slate-400">{description}</p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 ${checked ? 'bg-emerald-400' : 'bg-white/10'}`}
      >
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-6' : 'left-1'}`} />
      </button>
    </div>
  );
}

export default function SettingsPage({ profile, onProfileChange, prefs, onPrefsChange, controls, onClearHistory, status, autoBuyForced = false }: SettingsPageProps) {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Settings" subtitle="Your profile, payments and how the agent shops for you" action={status} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <section className={PANEL}>
            <div className="flex items-center gap-4">
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-amber-300 text-lg font-extrabold text-slate-950">{initialsOf(profile.name)}</span>
              <div className="min-w-0">
                <p className="truncate text-lg font-bold text-white">{profile.name.trim() || 'Add your name'}</p>
                <p className="text-xs text-slate-400">Member since {new Date(profile.memberSince).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</p>
              </div>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="flex items-center gap-1.5 text-xs text-slate-400"><UserRound className="h-3.5 w-3.5" />Name</span>
                <input type="text" value={profile.name} autoComplete="name" placeholder="Your name" onChange={event => onProfileChange({ ...profile, name: event.target.value })} className="mt-1.5 w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-emerald-300/60 focus:outline-none" />
              </label>
              <label className="block">
                <span className="text-xs text-slate-400">Email for receipts</span>
                <input type="email" value={profile.email} autoComplete="email" placeholder="you@example.com" onChange={event => onProfileChange({ ...profile, email: event.target.value })} className="mt-1.5 w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-emerald-300/60 focus:outline-none" />
              </label>
            </div>
          </section>

          <section className={PANEL}>
            <h2 className="text-sm font-semibold text-white">Payment</h2>
            <div className="mt-3 flex items-center gap-3 rounded-2xl bg-black/30 p-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-400/15 text-emerald-300"><Fingerprint className="h-5 w-5" /></span>
              <div>
                <p className="text-sm font-semibold text-white">Meta Pay</p>
                <p className="text-xs text-slate-400">Every purchase needs your biometric passkey</p>
              </div>
            </div>
          </section>

          <section className={PANEL}>
            <h2 className="text-sm font-semibold text-white">App preferences</h2>
            <div className="mt-1 divide-y divide-white/[0.06]">
              <ToggleRow icon={ShoppingBag} label="Auto-buy matching deals" description={autoBuyForced ? 'Always on with demo stores, so simulated buys go straight to your Bag. Switch to the live backend to choose.' : 'When the agent agrees a price within your budget on something you’re after, it pays straight away and the item goes to your Bag. Passkey payments still ask for your fingerprint or face.'} checked={autoBuyForced || prefs.autoBuy} disabled={autoBuyForced} onChange={value => onPrefsChange({ ...prefs, autoBuy: value })} />
              <ToggleRow icon={Vibrate} label="Haptic feedback" description="Buzz when you face a deal, a price is agreed, or a payment goes through." checked={prefs.haptics} onChange={value => onPrefsChange({ ...prefs, haptics: value })} />
              <ToggleRow icon={Bell} label="Read results aloud" description="Speak agreements and payments in every view, not just Voice." checked={prefs.voice} onChange={value => onPrefsChange({ ...prefs, voice: value })} />
            </div>
          </section>

          <section className={PANEL}>
            <h2 className="text-sm font-semibold text-white">Your data</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">Your timeline, cart, parked items, watch list and purchases are saved in this browser only.</p>
            <button type="button" onClick={onClearHistory} className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-white/[0.05] px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:bg-rose-400/15 hover:text-rose-200">
              <Trash2 className="h-3.5 w-3.5" />Clear saved history
            </button>
          </section>
        </div>
        <div>
          <ControlPanel {...controls} />
        </div>
      </div>
    </div>
  );
}
