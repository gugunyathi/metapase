import { useState } from 'react';
import { Bot, Check, Gift, Handshake, LoaderCircle, MapPin, ShieldCheck } from 'lucide-react';
import type { UserPasskeyAuth } from '../types/metapase';
import { api } from '../lib/api';
import MuseBadge from './MuseBadge';

const NAMES = ['Naledi', 'Thabo', 'Zola', 'Amara', 'Kito', 'Sipho', 'Nova', 'Atlas'];

const makeId = (): string => `user_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;

interface AgentOnboardingProps {
  onCreated: (auth: UserPasskeyAuth) => void;
}

/** First screen for a new shopper. One button creates their agent: no form, no sign-up. */
export default function AgentOnboarding({ onCreated }: AgentOnboardingProps) {
  const [phase, setPhase] = useState<'idle' | 'creating' | 'ready'>('idle');
  const [agentName, setAgentName] = useState<string>('');

  const create = async () => {
    if (phase !== 'idle') return;
    setPhase('creating');
    const name = `${NAMES[Math.floor(Math.random() * NAMES.length)]}, your Muse agent`;
    const userId = makeId();
    const { agent } = await api.createUserAgent({ userId, agentName: name });
    setAgentName(agent.agentName);
    setPhase('ready');
    window.setTimeout(() => {
      onCreated({
        signedIn: true,
        userId: agent.userId,
        userName: 'You',
        email: '',
        credentialId: null,
        authMethod: 'sandbox_passkey',
        signedInAt: Date.now(),
        agentId: agent.agentId,
        agentName: agent.agentName,
        agentCreditBalanceZAR: agent.creditBalanceZAR,
        promoCode: 'WELCOME-R1000-ACTIVE'
      });
    }, 1100);
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="onboarding-title" className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-[#050814] p-5">
      <div className="w-full max-w-md py-8">
        <div className="mb-6 flex justify-center"><MuseBadge /></div>
        <h1 id="onboarding-title" className="text-center text-3xl font-extrabold leading-tight text-white sm:text-4xl">Shop with an agent that haggles for you</h1>
        <p className="mx-auto mt-3 max-w-sm text-center text-sm text-slate-400">Walk past a store and your agent negotiates with that store’s own agent, then buys the deal or parks it for you.</p>

        <ul className="mx-auto mt-6 max-w-sm space-y-3 text-sm text-slate-300">
          <li className="flex items-start gap-3"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" /><span>Finds offers within 50 m, indoors and out</span></li>
          <li className="flex items-start gap-3"><Handshake className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" /><span>Haggles with each store’s agent, never above your budget</span></li>
          <li className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" /><span>Buys within your limit, or parks the deal for your OK</span></li>
        </ul>

        <button
          type="button"
          onClick={() => void create()}
          disabled={phase !== 'idle'}
          className="mx-auto mt-8 flex w-full max-w-sm items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-6 py-4 text-base font-extrabold text-slate-950 transition hover:bg-emerald-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200 disabled:opacity-80"
        >
          {phase === 'idle' && <><Bot className="h-5 w-5" aria-hidden="true" />Create my agent</>}
          {phase === 'creating' && <><LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />Creating your agent…</>}
          {phase === 'ready' && <><Check className="h-5 w-5" aria-hidden="true" />{agentName} is ready</>}
        </button>
        <p className="mx-auto mt-3 flex max-w-sm items-center justify-center gap-1.5 text-center text-xs text-slate-500"><Gift className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />Includes R1,000 welcome credit. No sign-up.</p>
      </div>
    </div>
  );
}
