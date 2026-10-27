import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import {
  Bell, Fingerprint, ShoppingBag, Trash2, UserRound, Vibrate,
  CreditCard, Calendar, ChevronDown, ChevronUp, CheckCircle2,
  Clock, ShieldCheck, Sparkles, RefreshCw
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { AppPreferences, UserProfile } from '../types/metapase';
import ControlPanel from '../components/ControlPanel';
import type { ControlPanelProps } from '../components/ControlPanel';
import PageHeader from '../components/PageHeader';
import { api, ApiCreditSummary } from '../lib/api';
import { formatZAR } from '../lib/format';

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
  const [creditSummary, setCreditSummary] = useState<ApiCreditSummary | null>(null);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const [payingPlanId, setPayingPlanId] = useState<string | null>(null);
  const [payToast, setPayToast] = useState<string | null>(null);
  const [loadingCredit, setLoadingCredit] = useState<boolean>(false);

  const fetchCreditSummary = async () => {
    setLoadingCredit(true);
    try {
      const res = await api.getCreditPlans('user_shopper_01');
      if (res && res.ok) {
        setCreditSummary(res);
      }
    } catch {
      // offline fallback
    } finally {
      setLoadingCredit(false);
    }
  };

  useEffect(() => {
    fetchCreditSummary();
  }, []);

  const handlePayInstallment = async (planId: string) => {
    setPayingPlanId(planId);
    try {
      const res = await api.payInstallment(planId);
      if (res.ok && res.data?.plan) {
        setPayToast(res.data.message || 'Installment paid successfully!');
        fetchCreditSummary();
        setTimeout(() => setPayToast(null), 3500);
      }
    } catch {
      setPayToast('Failed to process payment');
      setTimeout(() => setPayToast(null), 3000);
    } finally {
      setPayingPlanId(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Settings" subtitle="Your profile, payments and how the agent shops for you" action={status} />

      {/* Floating Toast */}
      {payToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-emerald-400 px-4 py-2 text-xs font-black text-slate-950 shadow-2xl animate-bounce">
          <CheckCircle2 className="h-4 w-4" />
          <span>{payToast}</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          {/* User Profile Section */}
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

          {/* Point of Sale Auto-Financing & 12-Month Installment Plans */}
          <section className="relative overflow-hidden rounded-3xl border border-amber-400/30 bg-gradient-to-br from-amber-950/20 via-slate-900/60 to-slate-950 p-5 backdrop-blur shadow-lg shadow-amber-950/30">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-400/15 text-amber-300 border border-amber-400/25">
                  <CreditCard className="h-5 w-5" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-white">Point-of-Sale Auto-Financing</h2>
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-400/30">
                      <Sparkles className="h-3 w-3" /> 0% APR 12 Months
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">Automatic deficit credit with 12 equal monthly installments</p>
                </div>
              </div>

              <button
                type="button"
                onClick={fetchCreditSummary}
                disabled={loadingCredit}
                className="grid h-8 w-8 place-items-center rounded-xl bg-white/5 text-slate-400 hover:text-white transition"
                title="Refresh credit facility"
              >
                <RefreshCw className={`h-4 w-4 ${loadingCredit ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Credit Limit & Balance Bar */}
            <div className="mt-4 rounded-2xl bg-black/40 p-4 border border-white/[0.06]">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Pre-Approved Credit Limit</span>
                  <p className="text-xl font-black text-amber-300">
                    {formatZAR(creditSummary?.creditLimitZAR ?? 25000)}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Available Line</span>
                  <p className="text-sm font-bold text-emerald-400">
                    {formatZAR(creditSummary?.availableCreditZAR ?? 24167)}
                  </p>
                </div>
              </div>

              {/* Facility Utilization Progress Bar */}
              <div className="mt-2.5">
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-amber-300 transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.max(5, (((creditSummary?.remainingDebtZAR ?? 833) / (creditSummary?.creditLimitZAR ?? 25000)) * 100)))}%`
                    }}
                  />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Current Active Debt: <strong className="text-slate-200">{formatZAR(creditSummary?.remainingDebtZAR ?? 833)}</strong></span>
                  <span>{creditSummary?.activePlansCount ?? 1} Active Financed Purchase{(creditSummary?.activePlansCount ?? 1) > 1 ? 's' : ''}</span>
                </div>
              </div>

              <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-400/5 p-2.5 border border-amber-400/10 text-[11px] text-slate-300 leading-relaxed">
                <ShieldCheck className="h-4 w-4 text-amber-300 shrink-0 mt-0.5" />
                <span>
                  <strong>Zero Purchase Friction:</strong> If your wallet or agent credit is short at checkout, Metapase automatically finances the shortfall over 12 monthly installments.
                </span>
              </div>
            </div>

            {/* Financed Items & Installment Schedules */}
            <div className="mt-4 space-y-3">
              <h3 className="text-xs font-bold text-white flex items-center justify-between">
                <span>Active 12-Month Payment Plans ({creditSummary?.plans?.length ?? 0})</span>
                <span className="text-[10px] text-slate-400">Fixed equal monthly debits</span>
              </h3>

              {(!creditSummary?.plans || creditSummary.plans.length === 0) ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-5 text-center">
                  <Clock className="mx-auto h-6 w-6 text-slate-500 mb-1" />
                  <p className="text-xs font-semibold text-slate-400">No active installment plans</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Purchases exceeding wallet balance will automatically appear here with a 12-month payment plan.</p>
                </div>
              ) : (
                creditSummary.plans.map(plan => {
                  const isExpanded = expandedPlanId === plan.planId;
                  const percentPaid = Math.round((plan.monthsPaid / plan.termMonths) * 100);

                  return (
                    <div
                      key={plan.planId}
                      className="overflow-hidden rounded-2xl border border-white/[0.08] bg-slate-900/80 transition"
                    >
                      <div className="p-3.5 space-y-2">
                        {/* Title & Status */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white">{plan.itemName}</span>
                              <span className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase ${
                                plan.status === 'PAID_OFF'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                              }`}>
                                {plan.status === 'PAID_OFF' ? 'Paid Off' : `Month ${plan.monthsPaid}/12 Paid`}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400">{plan.storeName} • {plan.mallName}</p>
                          </div>

                          <div className="text-right">
                            <p className="text-sm font-black text-amber-300">{formatZAR(plan.monthlyInstallmentZAR)}<span className="text-[10px] font-normal text-slate-400">/mo</span></p>
                            <p className="text-[10px] text-slate-400">Remaining: {formatZAR(plan.remainingBalanceZAR)}</p>
                          </div>
                        </div>

                        {/* 12-Month Segment Progress Bar */}
                        <div className="space-y-1">
                          <div className="grid grid-cols-12 gap-1 h-2">
                            {Array.from({ length: 12 }, (_, idx) => {
                              const isPaid = idx < plan.monthsPaid;
                              const isCurrent = idx === plan.monthsPaid && plan.status !== 'PAID_OFF';
                              return (
                                <div
                                  key={idx}
                                  className={`rounded-sm transition ${
                                    isPaid
                                      ? 'bg-emerald-400 shadow-sm shadow-emerald-400/20'
                                      : isCurrent
                                      ? 'bg-amber-400 animate-pulse'
                                      : 'bg-white/10'
                                  }`}
                                  title={`Month ${idx + 1}: ${isPaid ? 'Paid' : isCurrent ? 'Next Due' : 'Upcoming'}`}
                                />
                              );
                            })}
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                            <span>Financed: {formatZAR(plan.financedAmountZAR)} (Wallet: {formatZAR(plan.walletContributionZAR)})</span>
                            <span className="font-semibold text-emerald-400">{percentPaid}% completed</span>
                          </div>
                        </div>

                        {/* Actions: Pay Next Installment & Expand Schedule */}
                        <div className="pt-2 flex items-center justify-between gap-2 border-t border-white/[0.06]">
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
                            <Calendar className="h-3.5 w-3.5 text-amber-400" />
                            <span>Next: <strong>{new Date(plan.nextDueDate).toLocaleDateString()}</strong></span>
                          </div>

                          <div className="flex items-center gap-2">
                            {plan.status !== 'PAID_OFF' && (
                              <button
                                type="button"
                                onClick={() => handlePayInstallment(plan.planId)}
                                disabled={payingPlanId === plan.planId}
                                className="rounded-xl bg-emerald-400 px-3 py-1 text-xs font-bold text-slate-950 hover:bg-emerald-300 transition disabled:opacity-50"
                              >
                                {payingPlanId === plan.planId ? 'Processing...' : `Pay Next (${formatZAR(plan.monthlyInstallmentZAR)})`}
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setExpandedPlanId(isExpanded ? null : plan.planId)}
                              className="rounded-xl bg-white/5 p-1.5 text-slate-300 hover:bg-white/10 hover:text-white transition"
                              title={isExpanded ? 'Collapse Schedule' : 'View 12-Month Schedule'}
                            >
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Expandable 12-Month Schedule Breakdown */}
                      {isExpanded && (
                        <div className="border-t border-white/[0.08] bg-black/50 p-3.5 space-y-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">12-Month Installment Schedule:</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {plan.schedule.map(item => (
                              <div
                                key={item.month}
                                className={`rounded-xl p-2 border text-[11px] ${
                                  item.status === 'PAID'
                                    ? 'border-emerald-500/20 bg-emerald-950/20 text-emerald-300'
                                    : 'border-white/[0.06] bg-slate-900/60 text-slate-300'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold">Month {item.month}</span>
                                  <span className={`text-[9px] font-extrabold ${item.status === 'PAID' ? 'text-emerald-400' : 'text-amber-400'}`}>
                                    {item.status}
                                  </span>
                                </div>
                                <p className="mt-0.5 text-xs font-black">{formatZAR(item.amountZAR)}</p>
                                <p className="text-[9px] text-slate-500">{new Date(item.dueDate).toLocaleDateString()}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Payment Section */}
          <section className={PANEL}>
            <h2 className="text-sm font-semibold text-white">Payment & Biometrics</h2>
            <div className="mt-3 flex items-center gap-3 rounded-2xl bg-black/30 p-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-400/15 text-emerald-300"><Fingerprint className="h-5 w-5" /></span>
              <div>
                <p className="text-sm font-semibold text-white">Meta Pay Passkey</p>
                <p className="text-xs text-slate-400">Authenticated with biometric WebAuthn (Touch ID, Face ID, Windows Hello)</p>
              </div>
            </div>
          </section>

          {/* App Preferences */}
          <section className={PANEL}>
            <h2 className="text-sm font-semibold text-white">App preferences</h2>
            <div className="mt-1 divide-y divide-white/[0.06]">
              <ToggleRow icon={ShoppingBag} label="Auto-buy matching deals" description={autoBuyForced ? 'Always on with demo stores, so simulated buys go straight to your Bag. Switch to the live backend to choose.' : 'When the agent agrees a price within your budget on something you’re after, it pays straight away and the item goes to your Bag. Passkey payments still ask for your fingerprint or face.'} checked={autoBuyForced || prefs.autoBuy} disabled={autoBuyForced} onChange={value => onPrefsChange({ ...prefs, autoBuy: value })} />
              <ToggleRow icon={Vibrate} label="Haptic feedback" description="Buzz when you face a deal, a price is agreed, or a payment goes through." checked={prefs.haptics} onChange={value => onPrefsChange({ ...prefs, haptics: value })} />
              <ToggleRow icon={Bell} label="Read results aloud" description="Speak agreements and payments in every view, not just Voice." checked={prefs.voice} onChange={value => onPrefsChange({ ...prefs, voice: value })} />
            </div>
          </section>

          {/* Clear Data */}
          <section className={PANEL}>
            <h2 className="text-sm font-semibold text-white">Your data</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">Your timeline, cart, parked items, watch list and purchases are saved in this browser and database.</p>
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

