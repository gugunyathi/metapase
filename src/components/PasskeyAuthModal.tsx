import { useState } from 'react';
import { Fingerprint, X, Loader2, Gift, Check, Bot } from 'lucide-react';
import { UserPasskeyAuth } from '../types/metapase';
import { passkeysAvailable } from '../lib/metaPay';

interface PasskeyAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (auth: UserPasskeyAuth) => void;
  initialMode?: 'signin' | 'signup';
}

export default function PasskeyAuthModal({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'signup'
}: PasskeyAuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [name, setName] = useState<string>('Gugu Nyathi');
  const [email, setEmail] = useState<string>('gugu@metapase.app');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePasskeyAuth = async () => {
    setLoading(true);
    setError(null);

    const isWebAuthn = passkeysAvailable();
    let credentialId: string | null = null;
    let authMethod: 'webauthn_passkey' | 'sandbox_passkey' = 'sandbox_passkey';

    if (isWebAuthn) {
      try {
        const challengeBytes = new Uint8Array(32);
        crypto.getRandomValues(challengeBytes);

        if (mode === 'signup') {
          const userIdBytes = new Uint8Array(16);
          crypto.getRandomValues(userIdBytes);

          const cred = (await navigator.credentials.create({
            publicKey: {
              challenge: challengeBytes,
              rp: { name: 'MetaPase Proximity Commerce', id: window.location.hostname },
              user: {
                id: userIdBytes,
                name: email || 'shopper@metapase.app',
                displayName: name || 'MetaPase Shopper'
              },
              pubKeyCredParams: [
                { type: 'public-key', alg: -7 },  // ES256
                { type: 'public-key', alg: -257 }, // RS256
                { type: 'public-key', alg: -8 }   // Ed25519
              ],
              authenticatorSelection: {
                userVerification: 'preferred',
                residentKey: 'preferred'
              },
              timeout: 60000
            }
          })) as PublicKeyCredential | null;

          if (cred) {
            credentialId = cred.id;
            authMethod = 'webauthn_passkey';
          }
        } else {
          // Sign In
          const assertion = (await navigator.credentials.get({
            publicKey: {
              challenge: challengeBytes,
              rpId: window.location.hostname,
              userVerification: 'preferred',
              timeout: 60000
            }
          })) as PublicKeyCredential | null;

          if (assertion) {
            credentialId = assertion.id;
            authMethod = 'webauthn_passkey';
          }
        }
      } catch (err: any) {
        // Fallback gracefully to biometric / sandbox PIN simulation if cancelled or untrusted domain
        console.warn('[PasskeyAuth] Hardware WebAuthn prompt completed/bypassed, activating sandbox passkey:', err);
      }
    }

    // Provision user & auto-create personal shopping agent with R1,000 credit
    await new Promise(r => setTimeout(r, 600));

    const userId = `user_${Math.random().toString(36).slice(2, 9)}`;
    const authData: UserPasskeyAuth = {
      signedIn: true,
      userId,
      userName: name.trim() || 'Meta Shopper',
      email: email.trim() || 'shopper@metapase.app',
      credentialId: credentialId ?? `passkey_cred_${Math.random().toString(36).slice(2, 10)}`,
      authMethod,
      signedInAt: Date.now(),
      agentId: `agent_personal_${userId}`,
      agentName: `${name.trim() || 'Personal'} Shopper Agent`,
      agentCreditBalanceZAR: 1000, // Promo R1,000 credit
      promoCode: 'WELCOME-R1000-PROMO'
    };

    try {
      localStorage.setItem('metapase:auth', JSON.stringify(authData));
    } catch {
      // storage quota fallback
    }

    setLoading(false);
    onSuccess(authData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-b from-slate-900 via-[#0a0f24] to-[#050814] p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-white/10 text-slate-400 hover:text-white transition"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Promo Gift Header */}
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400/20 to-purple-400/20 px-3 py-1 text-xs font-bold text-amber-300 border border-amber-400/30">
            <Gift className="h-3.5 w-3.5 text-amber-300" />
            Promo R1,000 Autonomous Credit
          </span>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-amber-300 text-slate-950 font-black">
              <Fingerprint className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-xl font-black text-white">
                {mode === 'signup' ? 'Create Passkey Account' : 'Sign In with Passkey'}
              </h2>
              <p className="text-xs text-slate-400">
                Fast, passwordless sign in with Face ID, Touch ID or Windows Hello.
              </p>
            </div>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="mt-5 grid grid-cols-2 gap-1 rounded-2xl bg-white/[0.05] p-1 border border-white/[0.06]">
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`rounded-xl py-2 text-xs font-bold transition ${
              mode === 'signup' ? 'bg-amber-300 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            New Account (+R1,000)
          </button>
          <button
            type="button"
            onClick={() => setMode('signin')}
            className={`rounded-xl py-2 text-xs font-bold transition ${
              mode === 'signin' ? 'bg-amber-300 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign In with Passkey
          </button>
        </div>

        {/* Form Inputs */}
        <div className="mt-4 space-y-3">
          {mode === 'signup' && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Your Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Gugu Nyathi"
                className="w-full rounded-xl border border-white/10 bg-slate-800/80 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="e.g. gugu@metapase.app"
              className="w-full rounded-xl border border-white/10 bg-slate-800/80 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Promo Perks Card */}
        <div className="mt-4 rounded-2xl border border-amber-400/20 bg-gradient-to-r from-amber-950/30 to-purple-950/30 p-3.5 space-y-1.5 text-xs">
          <p className="font-bold text-amber-200 flex items-center gap-1.5">
            <Bot className="h-4 w-4 text-purple-300" />
            Automatic Personal Shopping Agent Provisioning:
          </p>
          <ul className="space-y-1 text-slate-300 text-[11px]">
            <li className="flex items-center gap-1.5">
              <Check className="h-3 w-3 text-emerald-400 shrink-0" />
              <span><strong>R1,000.00 Promo Credit</strong> loaded automatically for autonomous buys</span>
            </li>
            <li className="flex items-center gap-1.5">
              <Check className="h-3 w-3 text-emerald-400 shrink-0" />
              <span>Voice & text wishlist monitoring across 31 Meta Merchant stores</span>
            </li>
            <li className="flex items-center gap-1.5">
              <Check className="h-3 w-3 text-emerald-400 shrink-0" />
              <span>Hardware biometric passkey security (no passwords to remember)</span>
            </li>
          </ul>
        </div>

        {error && (
          <p className="mt-3 text-xs text-red-400 font-semibold">{error}</p>
        )}

        {/* Action Button */}
        <div className="mt-5 space-y-2">
          <button
            type="button"
            disabled={loading}
            onClick={() => void handlePasskeyAuth()}
            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-300 via-amber-200 to-emerald-300 py-3 text-sm font-black text-slate-950 transition hover:opacity-95 disabled:opacity-50 shadow-lg shadow-amber-300/15"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Fingerprint className="h-4 w-4" />
            )}
            {mode === 'signup' ? 'Create Passkey & Claim R1,000' : 'Authenticate with Passkey'}
          </button>

          <p className="text-center text-[11px] text-slate-500">
            Powered by WebAuthn & Personal Agent Protocol
          </p>
        </div>
      </div>
    </div>
  );
}
