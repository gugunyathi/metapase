import { LoaderCircle, ShoppingCart, Trash2, Wallet } from 'lucide-react';
import { CartLine } from '../types/metapase';
import { formatZAR } from '../lib/format';
import ItemTile from '../components/ItemTile';
import PageHeader from '../components/PageHeader';

interface CartPageProps {
  lines: CartLine[];
  payingAll: boolean;
  onBuyLine: (line: CartLine) => void;
  onRemoveLine: (id: string) => void;
  onPayAll: () => void;
}

function CartRow({ line, payingAll, onBuyLine, onRemoveLine }: { line: CartLine; payingAll: boolean; onBuyLine: (line: CartLine) => void; onRemoveLine: (id: string) => void }) {
  const fallbackNote = line.origin === 'agreed' ? `${line.outletName}, price agreed by the agent` : `${line.outletName}, at the store’s last price`;
  return (
    <li className="metapase-card-in flex flex-wrap items-center gap-3 rounded-3xl border border-white/[0.06] bg-white/[0.03] p-4">
      <ItemTile category={line.category} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{line.itemName}</p>
        <p className={`truncate text-xs ${line.status === 'failed' ? 'text-rose-300' : 'text-slate-400'}`}>{line.note ?? fallbackNote}</p>
      </div>
      <div className="text-right">
        <p className="text-base font-bold tabular-nums text-amber-200">{formatZAR(line.priceZAR)}</p>
        {line.priceZAR < line.stickerPriceZAR && <p className="text-[11px] tabular-nums text-slate-500 line-through">{formatZAR(line.stickerPriceZAR)}</p>}
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onBuyLine(line)} disabled={line.status === 'buying' || payingAll} className="inline-flex items-center gap-2 rounded-2xl bg-amber-300 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-amber-200 disabled:opacity-60">
          {line.status === 'buying' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}{line.status === 'failed' ? 'Retry' : 'Pay'}
        </button>
        <button type="button" onClick={() => onRemoveLine(line.id)} aria-label={`Remove ${line.itemName}`} className="grid h-10 w-10 place-items-center rounded-2xl bg-white/[0.05] text-slate-400 transition hover:bg-rose-400/15 hover:text-rose-200">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}

export default function CartPage({ lines, payingAll, onBuyLine, onRemoveLine, onPayAll }: CartPageProps) {
  const total = lines.reduce((sum, line) => sum + line.priceZAR, 0);
  const savings = lines.reduce((sum, line) => sum + Math.max(0, line.stickerPriceZAR - line.priceZAR), 0);
  const busy = payingAll || lines.some(line => line.status === 'buying');

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div>
        <PageHeader title="Cart" subtitle="Parked items you chose to buy later, at the store’s last price" />
        {lines.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 p-8 text-center">
            <ShoppingCart className="mx-auto h-8 w-8 text-slate-600" />
            <p className="mt-3 text-sm font-semibold text-slate-200">Your cart is empty</p>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-400">Open Parked on the home screen and choose Buy later to add items here. Anything the agent buys goes straight to your Bag.</p>
          </div>
        ) : (
          <ul className="space-y-3">{lines.map(line => <CartRow key={line.id} line={line} payingAll={payingAll} onBuyLine={onBuyLine} onRemoveLine={onRemoveLine} />)}</ul>
        )}
      </div>
      <aside className="h-fit rounded-3xl border border-white/[0.06] bg-white/[0.03] p-5 backdrop-blur lg:sticky lg:top-24 lg:mt-[5.25rem]">
        <h2 className="text-sm font-semibold text-white">Summary</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-slate-400">Items</dt><dd className="tabular-nums text-white">{lines.length}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-400">You save</dt><dd className="tabular-nums text-emerald-300">{formatZAR(savings)}</dd></div>
          <div className="flex justify-between border-t border-white/[0.06] pt-3 text-base font-bold"><dt className="text-white">Total</dt><dd className="tabular-nums text-amber-200">{formatZAR(total)}</dd></div>
        </dl>
        <button type="button" onClick={onPayAll} disabled={lines.length === 0 || busy} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-300 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-200 disabled:opacity-50">
          {payingAll ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}Pay for everything with Meta Pay
        </button>
        <p className="mt-3 text-xs leading-relaxed text-slate-500">Each payment is confirmed with your biometric passkey.</p>
      </aside>
    </div>
  );
}
