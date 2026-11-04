import { useState, useEffect, useRef, useMemo } from 'react';
import { parseWish, searchWebProducts, extractUrlProduct, type WebProductMatch } from '../lib/muse';
import { REAL_PRODUCTS, type CatalogProduct } from '../config/products';
import {
  Mic,
  MicOff,
  Trash2,
  X,
  Sparkles,
  Bot,
  Radio,
  Globe,
  ExternalLink,
  Link2,
  Search,
  Check,
  Loader2,
  Store,
  Tag,
  ShoppingBag
} from 'lucide-react';
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

const isUrlString = (text: string): boolean => {
  const trimmed = text.trim();
  if (!trimmed || trimmed.includes(' ')) return false;
  if (/^https?:\/\//i.test(trimmed)) return true;
  return /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/.*)?$/i.test(trimmed);
};

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
  const [reading, setReading] = useState<boolean>(false);
  const [readNote, setReadNote] = useState<string>('');

  // Realtime search & URL embed states
  const [webResults, setWebResults] = useState<WebProductMatch[]>([]);
  const [isSearchingWeb, setIsSearchingWeb] = useState<boolean>(false);
  const [hasSearchedWeb, setHasSearchedWeb] = useState<boolean>(false);
  const [embeddedPreview, setEmbeddedPreview] = useState<WebProductMatch | null>(null);
  const [isLoadingEmbed, setIsLoadingEmbed] = useState<boolean>(false);
  const [detectedUrl, setDetectedUrl] = useState<string | null>(null);

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

  // Detect URL typing or pasting
  useEffect(() => {
    const trimmed = inputText.trim();
    if (isUrlString(trimmed)) {
      setDetectedUrl(trimmed);
      let active = true;
      setIsLoadingEmbed(true);
      extractUrlProduct(trimmed)
        .then(res => {
          if (active) {
            setEmbeddedPreview(res);
            setIsLoadingEmbed(false);
          }
        })
        .catch(() => {
          if (active) setIsLoadingEmbed(false);
        });
      return () => {
        active = false;
      };
    } else {
      setDetectedUrl(null);
      setEmbeddedPreview(null);
      setIsLoadingEmbed(false);
    }
  }, [inputText]);

  // Reset web results when query changes
  useEffect(() => {
    setWebResults([]);
    setHasSearchedWeb(false);
  }, [inputText]);

  // Realtime search of mall products
  const localMatches = useMemo(() => {
    const q = inputText.trim().toLowerCase();
    if (!q || q.length < 2 || isUrlString(q)) return [];
    const tokens = q.split(/\s+/).filter(Boolean);
    return REAL_PRODUCTS.filter(p => {
      const searchable = `${p.itemName} ${p.storeName} ${p.category} ${p.tag} ${p.description}`.toLowerCase();
      return tokens.every(tok => searchable.includes(tok));
    }).slice(0, 6);
  }, [inputText]);

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

  const handleAdd = async (queryText: string, maxPrice: number) => {
    const cleaned = queryText.trim();
    if (!cleaned || reading) return;
    setReading(true);
    // Muse turns a sentence like "a smart blazer for a wedding under R1500" into a product, keywords, a price and an auto-buy choice.
    const parsed = await parseWish(cleaned);
    setReading(false);
    const budget = parsed.maxBudgetZAR ?? maxPrice;
    setReadNote(`${parsed.engine === 'muse' ? 'Muse AI analyzed' : 'Added'}: ${parsed.query}, up to R${budget}${parsed.autoBuy || autoBuy ? ', buys automatically' : ', asks first'}.`);
    onAddWishlistItem({
      query: parsed.query,
      keywords: parsed.keywords,
      category: parsed.category ?? undefined,
      originalText: cleaned,
      targetMaxPriceZAR: budget,
      autoBuy: parsed.autoBuy || autoBuy
    });
    setInputText('');
    setVoiceTranscript('');
    setWebResults([]);
    if (isListening && recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      setIsListening(false);
    }
  };

  const handleAddCatalogProduct = (product: CatalogProduct) => {
    onAddWishlistItem({
      query: product.itemName,
      keywords: [
        product.itemName.toLowerCase(),
        product.category,
        product.storeName.toLowerCase(),
        product.tag.toLowerCase(),
        ...product.itemName.toLowerCase().split(/\s+/).filter(w => w.length > 2)
      ],
      category: product.category,
      originalText: product.itemName,
      targetMaxPriceZAR: product.stickerPriceZAR,
      autoBuy,
      imageUrl: product.imageUrl,
      storeName: product.storeName
    });
    setReadNote(`Added "${product.itemName}" from ${product.storeName} to monitored wishlist.`);
    setInputText('');
  };

  const handleAddWebProduct = (item: WebProductMatch) => {
    onAddWishlistItem({
      query: item.title,
      keywords: [
        ...item.keywords,
        item.brand.toLowerCase(),
        item.category,
        ...item.title.toLowerCase().split(/\s+/).filter(w => w.length > 2)
      ],
      category: item.category,
      originalText: item.title,
      targetMaxPriceZAR: item.priceZAR || targetMaxPrice,
      autoBuy,
      imageUrl: item.imageUrl,
      brand: item.brand,
      sourceUrl: item.sourceUrl,
      isWebProduct: true
    });
    setReadNote(`Added web product "${item.title}" via Muse AI.`);
    setInputText('');
    setWebResults([]);
  };

  const handleAddEmbeddedUrl = (embed: WebProductMatch) => {
    onAddWishlistItem({
      query: embed.title,
      keywords: [
        ...embed.keywords,
        embed.brand.toLowerCase(),
        embed.category,
        ...embed.title.toLowerCase().split(/\s+/).filter(w => w.length > 2)
      ],
      category: embed.category,
      originalText: embed.sourceUrl || inputText,
      targetMaxPriceZAR: embed.priceZAR || targetMaxPrice,
      autoBuy,
      imageUrl: embed.imageUrl,
      brand: embed.brand,
      sourceUrl: embed.sourceUrl,
      embeddedUrl: embed.sourceUrl,
      isWebProduct: true
    });
    setReadNote(`Embedded product "${embed.title}" added to active monitored wishlist.`);
    setInputText('');
    setDetectedUrl(null);
    setEmbeddedPreview(null);
  };

  const handleGlobalWebSearch = async () => {
    const q = inputText.trim();
    if (!q || isSearchingWeb) return;
    setIsSearchingWeb(true);
    setHasSearchedWeb(true);
    try {
      const results = await searchWebProducts(q);
      setWebResults(results);
    } catch (err) {
      console.warn('[WishlistModal] Global search failed:', err);
    } finally {
      setIsSearchingWeb(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl border border-white/15 bg-gradient-to-b from-slate-900 via-[#0a0f24] to-[#050814] p-6 shadow-2xl [scrollbar-width:thin]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-white/10 text-slate-400 hover:text-white transition"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
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
            Type an item, brand name, paste a product URL, or speak. Your Personal Agent scans 31 store beacons in background and matches or buys deals.
          </p>
        </div>

        {/* Voice & Text Input Box */}
        <div className="mt-5 rounded-2xl border border-white/10 bg-slate-800/50 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    if (embeddedPreview) handleAddEmbeddedUrl(embeddedPreview);
                    else handleAdd(inputText, targetMaxPrice);
                  }
                }}
                placeholder={
                  isListening
                    ? 'Listening to speech...'
                    : 'Search brands, items, paste a product link (e.g. nike.com, amazon) or speak...'
                }
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none pr-10"
              />
              {inputText && (
                <button
                  type="button"
                  onClick={() => {
                    setInputText('');
                    setDetectedUrl(null);
                    setEmbeddedPreview(null);
                    setWebResults([]);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

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
              onClick={() => {
                if (embeddedPreview) handleAddEmbeddedUrl(embeddedPreview);
                else handleAdd(inputText, targetMaxPrice);
              }}
              disabled={!inputText.trim() || reading}
              className="rounded-xl bg-amber-300 px-4 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-amber-200 disabled:opacity-40 shrink-0"
            >
              {reading ? 'Reading…' : embeddedPreview ? 'Embed' : 'Add'}
            </button>
          </div>

          {readNote && <p role="status" className="text-xs text-sky-200">{readNote}</p>}

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

        {/* 1. URL DETECTED & EMBEDDED PRODUCT CARD */}
        {detectedUrl && (
          <div className="mt-4 rounded-2xl border border-violet-500/40 bg-gradient-to-r from-violet-950/40 via-purple-950/20 to-slate-900 p-4 shadow-lg animate-in fade-in space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-violet-300">
                <Link2 className="h-3.5 w-3.5 text-violet-400" />
                Detected Product URL — Auto Embedding:
              </span>
              <span className="text-[10px] text-slate-400 font-mono truncate max-w-[200px]">
                {detectedUrl}
              </span>
            </div>

            {isLoadingEmbed ? (
              <div className="flex items-center justify-center py-6 gap-2 text-xs text-violet-300">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Muse AI extracting product metadata & image from link...</span>
              </div>
            ) : embeddedPreview ? (
              <div className="flex items-center gap-3 bg-black/30 rounded-xl p-3 border border-white/10">
                <img
                  src={embeddedPreview.imageUrl}
                  alt={embeddedPreview.title}
                  className="h-16 w-16 rounded-lg object-cover border border-white/15 shrink-0 bg-slate-800"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-white truncate">
                      {embeddedPreview.title}
                    </span>
                    <span className="rounded-md bg-violet-500/20 px-2 py-0.5 text-[10px] font-bold text-violet-300 border border-violet-500/30">
                      {embeddedPreview.sourceDomain}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-1">
                    {embeddedPreview.description}
                  </p>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-amber-300">
                      Est. {formatZAR(embeddedPreview.priceZAR)}
                    </span>
                    <span className="text-[10px] text-slate-500 capitalize">
                      Category: {embeddedPreview.category}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleAddEmbeddedUrl(embeddedPreview)}
                  className="rounded-xl bg-violet-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-violet-500 transition shadow-lg shadow-violet-600/30 shrink-0 flex items-center gap-1.5"
                >
                  <Check className="h-3.5 w-3.5" />
                  Embed & Wish
                </button>
              </div>
            ) : null}
          </div>
        )}

        {/* 2. REALTIME INVENTORY SEARCH RESULTS */}
        {localMatches.length > 0 && (
          <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-950/10 p-3.5 space-y-2.5 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                <Store className="h-3.5 w-3.5 text-amber-400" />
                Live Mall Inventory & Deals ({localMatches.length} found):
              </span>
              <span className="text-[10px] text-amber-400/70">
                Instantly matched in Sandton City
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {localMatches.map(product => (
                <div
                  key={product.id}
                  className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-slate-900/80 p-2.5 hover:border-amber-400/40 transition group"
                >
                  <img
                    src={product.imageUrl}
                    alt={product.itemName}
                    className="h-12 w-12 rounded-lg object-cover shrink-0 border border-white/10"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white truncate group-hover:text-amber-200 transition">
                      {product.itemName}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      🏪 {product.storeName}
                    </p>
                    <p className="text-[11px] font-bold text-amber-300 pt-0.5">
                      {formatZAR(product.stickerPriceZAR)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddCatalogProduct(product)}
                    className="rounded-lg bg-amber-400/20 hover:bg-amber-400/40 border border-amber-400/40 text-amber-300 px-2.5 py-1.5 text-[10px] font-bold transition shrink-0"
                    title="Add to monitored wishlist"
                  >
                    + Wish
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. GLOBAL AI SEARCH VIA MUSE AI (IF NOT IN STORE OR REQUESTED) */}
        {inputText.trim().length >= 2 && !detectedUrl && (
          <div className="mt-3.5 space-y-3">
            <div className="flex items-center justify-between gap-2 bg-gradient-to-r from-sky-950/40 to-slate-900 border border-sky-500/20 rounded-xl p-2.5">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-sky-400" />
                <span className="text-xs text-sky-200">
                  Can't find it in local stores?
                </span>
              </div>
              <button
                type="button"
                onClick={handleGlobalWebSearch}
                disabled={isSearchingWeb}
                className="flex items-center gap-1.5 rounded-lg bg-sky-500/20 border border-sky-400/30 px-3 py-1.5 text-[11px] font-bold text-sky-300 hover:bg-sky-500/30 transition disabled:opacity-50"
              >
                {isSearchingWeb ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Searching Google & Web...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3 w-3 text-sky-300" />
                    Search Global Web via Muse AI
                  </>
                )}
              </button>
            </div>

            {/* Muse AI Web Search Results */}
            {webResults.length > 0 && (
              <div className="rounded-2xl border border-sky-500/30 bg-slate-900/90 p-3 space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-sky-300">
                    <Globe className="h-3.5 w-3.5 text-sky-400" />
                    Global Web & Google Shopping Matches ({webResults.length}):
                  </span>
                  <span className="text-[10px] text-sky-400/70">
                    Will match nearby store beacons when in range
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {webResults.map((webItem, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-black/40 p-2.5 hover:border-sky-400/40 transition"
                    >
                      <img
                        src={webItem.imageUrl}
                        alt={webItem.title}
                        className="h-12 w-12 rounded-lg object-cover shrink-0 border border-white/10"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <p className="text-xs font-bold text-white truncate">
                            {webItem.title}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                          <span>🏷️ {webItem.brand}</span>
                          <span className="text-sky-300">• {webItem.sourceDomain}</span>
                        </div>
                        <p className="text-[11px] font-bold text-amber-300 pt-0.5">
                          {formatZAR(webItem.priceZAR)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddWebProduct(webItem)}
                        className="rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-300 px-2.5 py-1.5 text-[10px] font-bold transition shrink-0"
                      >
                        + Wish
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

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
              Your wishlist is empty. Speak, type brands/items, or paste product URLs above to start autonomous matching!
            </div>
          ) : (
            <div className="space-y-2">
              {wishlist.map(item => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-slate-800/40 p-3 backdrop-blur hover:border-white/15 transition"
                >
                  {/* Thumbnail Image if item has an image */}
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.query}
                      className="h-12 w-12 rounded-xl object-cover shrink-0 border border-white/10 bg-slate-900"
                    />
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
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

                      {item.isWebProduct && (
                        <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[9px] font-bold text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                          <Globe className="h-2.5 w-2.5" />
                          Web Match
                        </span>
                      )}

                      {item.embeddedUrl && (
                        <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[9px] font-bold text-violet-300 border border-violet-500/30 flex items-center gap-1">
                          <Link2 className="h-2.5 w-2.5" />
                          Embedded Link
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5 flex-wrap">
                      {item.storeName && (
                        <span className="text-slate-300 flex items-center gap-1">
                          <Store className="h-3 w-3 text-slate-400" />
                          {item.storeName}
                        </span>
                      )}
                      {item.brand && (
                        <span className="text-slate-300 flex items-center gap-1">
                          <Tag className="h-3 w-3 text-slate-400" />
                          {item.brand}
                        </span>
                      )}
                      <span>Ceiling: <strong className="text-amber-200">{formatZAR(item.targetMaxPriceZAR)}</strong></span>
                      <span>Action: <strong className="text-slate-300">{item.autoBuy ? 'Auto-Buy (Credit)' : 'Park for review'}</strong></span>
                      {item.matchedPriceZAR && (
                        <span className="text-emerald-400 font-semibold">Matched at {formatZAR(item.matchedPriceZAR)}</span>
                      )}
                      {(item.sourceUrl || item.embeddedUrl) && (
                        <a
                          href={item.sourceUrl || item.embeddedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] text-sky-400 hover:text-sky-300 hover:underline"
                        >
                          <span>Source URL</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
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
