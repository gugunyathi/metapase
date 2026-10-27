import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Trash2, X, Sparkles, Bot, Radio } from 'lucide-react';
import { WishlistItem } from '../types/metapase';
import { formatZAR } from '../lib/format';

interface WishlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  wishlist: WishlistItem[];
  onAddWishlistItem: (item: Omit<WishlistItem, 'id' | 'addedAt' | 'status'>) => void;
  onRemoveWishlistItem: (id: string) => void;
  onToggleAutoBuy: (id: string) => void;
  agentCreditBalanceZAR: number;
}

const QUICK_SUGGESTIONS = [
  { text: 'Tailored Linen Blazer', max: 1100 },
  { text: 'Nike Air Zoom Pegasus', max: 2100 },
  { text: 'HOKA Clifton 9 Running Shoes', max: 2500 },
  { text: 'Ethiopian Single-Origin Coffee', max: 180 },
  { text: 'Apple AirPods 4 ANC', max: 3600 },
  { text: 'Skin Republic Vitamin C Serum', max: 300 },
  { text: 'Fresh Atlantic Salmon', max: 200 }
];

export default function WishlistModal({
  isOpen,
  onClose,
  wishlist,
  onAddWishlistItem,
  onRemoveWishlistItem,
  onToggleAutoBuy,
  agentCreditBalanceZAR
}: WishlistModalProps) {
  const [inputText, setInputText] = useState<string>('');
  const [targetMaxPrice, setTargetMaxPrice] = useState<number>(1000);
  const [autoBuy, setAutoBuy] = useState<boolean>(true);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [voiceTranscript, setVoiceTranscript] = useState<string>('');
  const [speechSupported, setSpeechSupported] = useState<boolean>(true);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-ZA'; // South African English

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setVoiceTranscript(currentTranscript);
        setInputText(currentTranscript);
      };

      recognition.onerror = (event: any) => {
        console.warn('[WishlistModal] Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } catch (err) {
      console.warn('[WishlistModal] Could not initialize SpeechRecognition:', err);
      setSpeechSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
    };
  }, []);

  if (!isOpen) return null;

  const toggleSpeech = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      try { recognitionRef.current.stop(); } catch {}
      setIsListening(false);
    } else {
      setVoiceTranscript('');
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.warn('Speech start error:', err);
      }
    }
  };

  const handleAdd = (queryText: string, maxPrice: number) => {
    const cleaned = queryText.trim();
    if (!cleaned) return;
    onAddWishlistItem({
      query: cleaned,
      targetMaxPriceZAR: maxPrice,
      autoBuy
    });
    setInputText('');
    setVoiceTranscript('');
    if (isListening && recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      setIsListening(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/15 bg-gradient-to-b from-slate-900 via-[#0a0f24] to-[#050814] p-6 shadow-2xl [scrollbar-width:thin]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-white/10 text-slate-400 hover:text-white transition"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/20 px-3 py-1 text-xs font-bold text-purple-300 border border-purple-500/30">
              <Bot className="h-3.5 w-3.5" />
              Personal Shopping Agent Wishlist
            </span>
            <span className="text-xs font-bold text-amber-300 bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-400/20">
              Promo Balance: {formatZAR(agentCreditBalanceZAR)}
            </span>
          </div>

          <h2 className="text-xl font-black text-white pt-1">
            What are you shopping for?
          </h2>
          <p className="text-xs text-slate-400">
            Speak or type what you need. Your Personal Agent scans 31 store beacons in background and automatically buys or parks matching deals.
          </p>
        </div>

        {/* Voice & Text Input Box */}
        <div className="mt-5 rounded-2xl border border-white/10 bg-slate-800/50 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleAdd(inputText, targetMaxPrice);
              }}
              placeholder={isListening ? 'Listening to speech...' : 'Type or speak: e.g. "Zara linen blazer", "running shoes"'}
              className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
            />

            {/* Microphone Button for Voice-to-Text */}
            {speechSupported && (
              <button
                type="button"
                onClick={toggleSpeech}
                title={isListening ? 'Stop recording' : 'Speak your wishlist (Voice to Text)'}
                className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl transition ${
                  isListening
                    ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/50'
                    : 'bg-purple-600/30 text-purple-300 border border-purple-500/40 hover:bg-purple-600/50'
                }`}
              >
                {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
            )}

            <button
              type="button"
              onClick={() => handleAdd(inputText, targetMaxPrice)}
              disabled={!inputText.trim()}
              className="rounded-xl bg-amber-300 px-4 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-amber-200 disabled:opacity-40"
            >
              Add
            </button>
          </div>

          {/* Voice Listening Wave Indicator */}
          {isListening && (
            <div className="rounded-xl bg-purple-950/40 border border-purple-500/30 p-2.5 text-xs text-purple-200 animate-in fade-in space-y-1">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                  </span>
                  <span>Voice Recognition Active: Speak naturally...</span>
                </span>
                <span className="text-[11px] text-purple-300/70">Tap mic to stop</span>
              </div>
              {voiceTranscript && (
                <p className="font-mono text-[11px] text-purple-300 italic pt-0.5">
                  "{voiceTranscript}"
                </p>
              )}
            </div>
          )}

          {/* Budget & Auto-Buy Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Max Budget:</span>
              <div className="flex items-center gap-1">
                <span className="text-amber-300 font-bold">R</span>
                <input
                  type="number"
                  value={targetMaxPrice}
                  onChange={e => setTargetMaxPrice(Number(e.target.value))}
                  className="w-20 rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-xs text-white font-bold"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-slate-300 select-none">
              <input
                type="checkbox"
                checked={autoBuy}
                onChange={e => setAutoBuy(e.target.checked)}
                className="rounded border-white/20 bg-slate-900 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-[11px] font-semibold">
                🤖 Auto-Buy with Promo Credit (else Park)
              </span>
            </label>
          </div>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="mt-4 space-y-1.5">
          <p className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-amber-300" />
            Quick Suggestions from Mall Outlets:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_SUGGESTIONS.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleAdd(item.text, item.max)}
                className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-[11px] font-medium text-slate-300 transition hover:border-amber-400/40 hover:text-white"
              >
                + {item.text} ({formatZAR(item.max)})
              </button>
            ))}
          </div>
        </div>

        {/* Active Wishlist Items List */}
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Active Monitored Wishlist ({wishlist.length})
            </h3>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1">
              <Radio className="h-2.5 w-2.5" />
              Agent Proximity Listening Active
            </span>
          </div>

          {wishlist.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-slate-500 text-xs">
              Your wishlist is empty. Speak or type above to start autonomous matching!
            </div>
          ) : (
            <div className="space-y-2">
              {wishlist.map(item => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-slate-800/40 p-3 backdrop-blur"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-bold text-white">{item.query}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                        item.status === 'bought'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : item.status === 'parked'
                          ? 'bg-amber-400/20 text-amber-300'
                          : 'bg-purple-500/20 text-purple-300'
                      }`}>
                        {item.status === 'bought' ? '✓ Auto-Bought' : item.status === 'parked' ? '🅿️ Parked' : 'Scanning'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                      <span>Ceiling: <strong className="text-amber-200">{formatZAR(item.targetMaxPriceZAR)}</strong></span>
                      <span>Action: <strong className="text-slate-300">{item.autoBuy ? 'Auto-Buy (Credit)' : 'Park for review'}</strong></span>
                      {item.matchedPriceZAR && (
                        <span className="text-emerald-400">Matched at {formatZAR(item.matchedPriceZAR)}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onToggleAutoBuy(item.id)}
                      className={`rounded-xl px-2.5 py-1.5 text-[10px] font-bold transition border ${
                        item.autoBuy
                          ? 'border-purple-400/40 bg-purple-500/20 text-purple-300'
                          : 'border-white/10 bg-white/5 text-slate-400'
                      }`}
                      title="Toggle auto-buy vs park"
                    >
                      {item.autoBuy ? 'Auto-Buy' : 'Park'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveWishlistItem(item.id)}
                      className="grid h-7 w-7 place-items-center rounded-lg text-slate-500 hover:text-red-400 transition"
                      title="Remove from wishlist"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between">
          <p className="text-[11px] text-slate-400">
            Agent uses single-use virtual cards up to available R1,000 credit.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/20 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
