import { useState, useEffect } from 'react';
import {
  Building2, Package, History, Activity, TrendingUp,
  X, CheckCircle2, RefreshCw, Plus, Minus, QrCode,
  Zap, Bot
} from 'lucide-react';
import { api, ApiProductInventory, ApiMerchantAnalytics, ApiActivityLog, ApiTransactionReceipt } from '../lib/api';
import { formatZAR } from '../lib/format';

interface MerchantHubModalProps {
  initialStoreId?: string;
  onClose: () => void;
  onRedeemVoucher?: (voucherCode: string) => void;
}

export default function MerchantHubModal({
  initialStoreId = 'sc_zara',
  onClose,
  onRedeemVoucher
}: MerchantHubModalProps) {
  const [activeTab, setActiveTab] = useState<'inventory' | 'store_transactions' | 'user_ledger' | 'activity_audit'>('inventory');
  const [selectedStoreId, setSelectedStoreId] = useState<string>(initialStoreId);
  const [stores, setStores] = useState<Array<{ storeId: string; storeName: string; mallName: string; category: string }>>([]);
  const [inventory, setInventory] = useState<ApiProductInventory[]>([]);
  const [analytics, setAnalytics] = useState<ApiMerchantAnalytics | null>(null);
  const [storeTransactions, setStoreTransactions] = useState<ApiTransactionReceipt[]>([]);
  const [userTransactions, setUserTransactions] = useState<ApiTransactionReceipt[]>([]);
  const [activityLogs, setActivityLogs] = useState<ApiActivityLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [updatingSku, setUpdatingSku] = useState<string | null>(null);
  const [redeemingCode, setRedeemingCode] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Load list of all merchant stores
  useEffect(() => {
    api.getMerchants().then(res => {
      if (res && res.merchants) {
        setStores(res.merchants.map(m => ({
          storeId: m.storeId,
          storeName: m.storeName,
          mallName: m.mallName,
          category: m.category
        })));
      }
    });
  }, []);

  // Fetch data for selected store and tabs
  const refreshData = async () => {
    setLoading(true);
    try {
      // 1. Store Inventory
      const invRes = await api.getStoreInventory(selectedStoreId);
      if (invRes && invRes.inventory) {
        setInventory(invRes.inventory);
      }

      // 2. Store Analytics
      const anaRes = await api.getMerchantAnalytics(selectedStoreId);
      if (anaRes && anaRes.analytics) {
        setAnalytics(anaRes.analytics);
      }

      // 3. Store Sales Transactions
      const txRes = await api.getMerchantTransactions(selectedStoreId);
      if (txRes && txRes.transactions) {
        setStoreTransactions(txRes.transactions);
      }

      // 4. User Transactions Ledger
      const userTxRes = await api.getTransactions();
      if (userTxRes && userTxRes.transactions) {
        setUserTransactions(userTxRes.transactions);
      }

      // 5. System Activity Audit Trail
      const actRes = await api.getActivityLog({ limit: 50 });
      if (actRes && actRes.activities) {
        setActivityLogs(actRes.activities);
      }
    } catch {
      // Offline fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, [selectedStoreId]);

  // Handle live stock adjustment
  const handleStockChange = async (sku: string, currentStock: number, delta: number) => {
    const newQty = Math.max(0, currentStock + delta);
    setUpdatingSku(sku);
    try {
      const res = await api.updateProductStock(selectedStoreId, sku, newQty);
      if (res.ok && res.data?.item) {
        setInventory(prev => prev.map(item => item.sku === sku ? res.data!.item : item));
        showToast(`Stock updated: ${res.data.item.name} (${newQty} units)`);
      }
    } catch {
      showToast('Stock update failed');
    } finally {
      setUpdatingSku(null);
    }
  };

  // Handle in-store voucher redemption
  const handleRedeem = async (voucherCode: string) => {
    setRedeemingCode(voucherCode);
    try {
      const res = await api.redeemVoucher(voucherCode);
      if (res.ok && res.data?.receipt) {
        showToast(`Voucher ${voucherCode} REDEEMED successfully!`);
        refreshData();
        onRedeemVoucher?.(voucherCode);
      }
    } catch {
      showToast('Redemption failed');
    } finally {
      setRedeemingCode(null);
    }
  };

  const selectedStore = stores.find(s => s.storeId === selectedStoreId) ?? {
    storeId: selectedStoreId,
    storeName: 'Selected Merchant',
    mallName: 'Shopping Mall',
    category: 'Retail'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative flex flex-col w-full max-w-4xl h-[92vh] max-h-[860px] rounded-3xl border border-white/10 bg-slate-950 shadow-2xl overflow-hidden">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-emerald-500/90 px-4 py-2 text-xs font-bold text-slate-950 shadow-lg animate-bounce">
            <CheckCircle2 className="h-4 w-4" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Modal Top Bar */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-400/10 text-amber-300 border border-amber-400/20">
              <Building2 className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">Merchant & Database Control Console</h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  MongoDB / In-Memory Active
                </span>
              </div>
              <p className="text-xs text-slate-400">Manage stores, products, inventory, transactions, and live audit feed</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={refreshData}
              disabled={loading}
              className="grid h-8 w-8 place-items-center rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition disabled:opacity-50"
              title="Refresh Data"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Store Selector Bar & Tab Navigation */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-white/[0.08] px-6 py-3 bg-slate-900/40">
          {/* Store Selector Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 shrink-0">Store:</span>
            <select
              value={selectedStoreId}
              onChange={e => setSelectedStoreId(e.target.value)}
              className="rounded-xl border border-white/15 bg-slate-800 px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-amber-400 transition"
            >
              {stores.map(s => (
                <option key={s.storeId} value={s.storeId}>
                  {s.storeName} ({s.mallName})
                </option>
              ))}
            </select>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setActiveTab('inventory')}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition shrink-0 ${
                activeTab === 'inventory'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              <Package className="h-3.5 w-3.5" />
              <span>Inventory & Stock ({inventory.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('store_transactions')}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition shrink-0 ${
                activeTab === 'store_transactions'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Store Sales ({storeTransactions.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('user_ledger')}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition shrink-0 ${
                activeTab === 'user_ledger'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              <History className="h-3.5 w-3.5" />
              <span>User Receipts ({userTransactions.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('activity_audit')}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition shrink-0 ${
                activeTab === 'activity_audit'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              <Activity className="h-3.5 w-3.5" />
              <span>Live DB Feed ({activityLogs.length})</span>
            </button>
          </div>
        </div>

        {/* Analytics Highlights Banner */}
        {analytics && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 px-6 py-3 bg-slate-900/20 border-b border-white/[0.06]">
            <div className="rounded-2xl border border-white/[0.06] bg-slate-900/60 p-2.5">
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Gross Sales</span>
              <p className="mt-0.5 text-base font-black text-amber-300">{formatZAR(analytics.grossRevenueZAR)}</p>
              <span className="text-[10px] text-slate-400">{analytics.totalSalesCount} units sold</span>
            </div>

            <div className="rounded-2xl border border-white/[0.06] bg-slate-900/60 p-2.5">
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Shopper Discounts</span>
              <p className="mt-0.5 text-base font-black text-emerald-400">{formatZAR(analytics.totalSavingsZAR)}</p>
              <span className="text-[10px] text-emerald-400/80">Saved by buyers</span>
            </div>

            <div className="rounded-2xl border border-white/[0.06] bg-slate-900/60 p-2.5">
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Agent Autonomous</span>
              <p className="mt-0.5 text-base font-black text-purple-300">{analytics.autonomousSalesCount}</p>
              <span className="text-[10px] text-purple-300/80">Muse bot checkouts</span>
            </div>

            <div className="rounded-2xl border border-white/[0.06] bg-slate-900/60 p-2.5">
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">POS Redemptions</span>
              <p className="mt-0.5 text-base font-black text-sky-300">{analytics.redeemedCount} / {analytics.totalSalesCount}</p>
              <span className="text-[10px] text-sky-300/80">{analytics.pendingRedemptionCount} pending scan</span>
            </div>
          </div>
        )}

        {/* Tab 1: Store Inventory & Stock Management */}
        {activeTab === 'inventory' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-300">
                Live Inventory for <strong className="text-white">{selectedStore.storeName}</strong>
              </span>
              <span className="text-[11px] text-slate-400">
                Stored in MongoDB & In-Memory with Real-time mutations
              </span>
            </div>

            {inventory.length === 0 ? (
              <div className="grid place-items-center h-48 text-center">
                <Package className="h-8 w-8 text-slate-600 mb-2" />
                <p className="text-sm font-semibold text-slate-400">No products configured for this store yet.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {inventory.map(item => (
                  <div
                    key={item.sku}
                    className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-slate-900/60 p-4 backdrop-blur hover:border-white/15 transition"
                  >
                    <div className="flex gap-3">
                      {item.imageUrl && (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="h-16 w-16 rounded-xl object-cover shrink-0"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-mono text-[10px] font-semibold text-slate-400">{item.sku}</span>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            item.stockQuantity > 0
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                              : 'bg-rose-500/15 text-rose-400 border border-rose-500/25'
                          }`}>
                            {item.stockQuantity > 0 ? `${item.stockQuantity} in stock` : 'Out of stock'}
                          </span>
                        </div>
                        <h4 className="mt-0.5 truncate text-sm font-bold text-white">{item.name}</h4>
                        <p className="text-[11px] text-slate-400 line-clamp-1">{item.description}</p>

                        <div className="mt-2 flex items-baseline gap-2">
                          <span className="text-sm font-black text-amber-300">{formatZAR(item.basePriceZAR)}</span>
                          <span className="text-[11px] text-slate-500">Floor: {formatZAR(item.floorPriceZAR)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Stock Adjustment Controls */}
                    <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">Inventory Level:</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleStockChange(item.sku, item.stockQuantity, -1)}
                          disabled={item.stockQuantity <= 0 || updatingSku === item.sku}
                          className="grid h-7 w-7 place-items-center rounded-lg bg-white/5 text-slate-300 hover:bg-white/15 hover:text-white transition disabled:opacity-30"
                          title="Decrease Stock"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="min-w-7 text-center font-mono text-xs font-bold text-white">
                          {item.stockQuantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleStockChange(item.sku, item.stockQuantity, 1)}
                          disabled={updatingSku === item.sku}
                          className="grid h-7 w-7 place-items-center rounded-lg bg-amber-400/20 text-amber-300 hover:bg-amber-400/30 transition disabled:opacity-30"
                          title="Increase Stock"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Store Sales History Ledger */}
        {activeTab === 'store_transactions' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-300">
                Sales Ledger for <strong className="text-white">{selectedStore.storeName}</strong>
              </span>
              <span className="text-[11px] text-slate-400">
                {storeTransactions.length} transaction receipts recorded
              </span>
            </div>

            {storeTransactions.length === 0 ? (
              <div className="grid place-items-center h-48 text-center">
                <History className="h-8 w-8 text-slate-600 mb-2" />
                <p className="text-sm font-semibold text-slate-400">No transactions recorded for this merchant yet.</p>
                <p className="text-xs text-slate-500 mt-1">Try buying an item autonomously or with 1-click in the Discover tab.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {storeTransactions.map(tx => (
                  <div
                    key={tx.voucherCode}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-slate-900/60 p-4 backdrop-blur hover:border-white/15 transition"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          tx.purchasedBy === 'autonomous_personal_agent'
                            ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                            : 'bg-amber-400/15 text-amber-300 border border-amber-400/30'
                        }`}>
                          {tx.purchasedBy === 'autonomous_personal_agent' ? <Bot className="h-3 w-3" /> : <Zap className="h-3 w-3" />}
                          {tx.purchasedBy === 'autonomous_personal_agent' ? 'Autonomous Muse Bot' : '1-Click Direct'}
                        </span>
                        <span className="font-mono text-[11px] text-slate-400 font-semibold">{tx.voucherCode}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          tx.status === 'REDEEMED'
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : 'bg-sky-500/15 text-sky-300'
                        }`}>
                          {tx.status}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white">{tx.itemName}</h4>
                      <p className="text-[11px] text-slate-400">
                        {new Date(tx.timestamp).toLocaleString()} • Ref: {tx.authorizationRef}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/[0.06]">
                      <div className="text-right">
                        <p className="text-base font-black text-amber-300">{formatZAR(tx.amountZAR)}</p>
                        <p className="text-[10px] text-emerald-400 font-semibold">Saved {formatZAR(tx.savingsZAR)}</p>
                      </div>

                      {tx.status !== 'REDEEMED' && (
                        <button
                          type="button"
                          onClick={() => handleRedeem(tx.voucherCode)}
                          disabled={redeemingCode === tx.voucherCode}
                          className="flex items-center gap-1.5 rounded-xl bg-emerald-400 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-300 transition disabled:opacity-50"
                        >
                          <QrCode className="h-3.5 w-3.5" />
                          <span>Redeem POS</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: User Receipts & Redemptions */}
        {activeTab === 'user_ledger' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-300">
                User Transaction Receipts ({userTransactions.length})
              </span>
              <span className="text-[11px] text-slate-400">
                Cryptographic Vouchers & QR Payloads
              </span>
            </div>

            {userTransactions.length === 0 ? (
              <div className="grid place-items-center h-48 text-center">
                <History className="h-8 w-8 text-slate-600 mb-2" />
                <p className="text-sm font-semibold text-slate-400">No user purchases yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {userTransactions.map(tx => (
                  <div
                    key={tx.voucherCode}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-slate-900/60 p-4 backdrop-blur hover:border-white/15 transition"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-white">{tx.storeName}</span>
                        <span className="text-xs text-slate-500">• {tx.mallName}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          tx.status === 'REDEEMED' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-sky-500/15 text-sky-300'
                        }`}>
                          {tx.status}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-200">{tx.itemName}</h4>
                      <p className="font-mono text-xs text-amber-300/90">{tx.voucherCode}</p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/[0.06]">
                      <div className="text-right">
                        <p className="text-base font-black text-amber-300">{formatZAR(tx.amountZAR)}</p>
                        <p className="text-[10px] text-slate-400">{new Date(tx.timestamp).toLocaleDateString()}</p>
                      </div>

                      {tx.status !== 'REDEEMED' ? (
                        <button
                          type="button"
                          onClick={() => handleRedeem(tx.voucherCode)}
                          disabled={redeemingCode === tx.voucherCode}
                          className="flex items-center gap-1.5 rounded-xl bg-emerald-400 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-300 transition disabled:opacity-50"
                        >
                          <QrCode className="h-3.5 w-3.5" />
                          <span>Simulate Redeem</span>
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400">
                          <CheckCircle2 className="h-4 w-4" />
                          Redeemed
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Live System Activity Audit Trail */}
        {activeTab === 'activity_audit' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-2.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-300">
                System Activity Audit Trail ({activityLogs.length} events logged in database)
              </span>
              <span className="text-[11px] text-slate-400">
                Persisted in MongoDB & In-Memory
              </span>
            </div>

            {activityLogs.length === 0 ? (
              <div className="grid place-items-center h-48 text-center">
                <Activity className="h-8 w-8 text-slate-600 mb-2" />
                <p className="text-sm font-semibold text-slate-400">No activity logged yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {activityLogs.map(act => (
                  <div
                    key={act.activityId}
                    className="flex items-start gap-3 rounded-2xl border border-white/[0.06] bg-slate-900/50 p-3.5 backdrop-blur hover:border-white/10 transition"
                  >
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl text-xs font-black ${
                      act.type === 'AUTONOMOUS_PURCHASE'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : act.type === 'MANUAL_PURCHASE'
                        ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                        : act.type === 'VOUCHER_REDEEMED'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : act.type === 'BARGAIN_EVALUATION'
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                        : 'bg-white/10 text-slate-300'
                    }`}>
                      {act.type === 'AUTONOMOUS_PURCHASE' ? <Bot className="h-4 w-4" /> :
                       act.type === 'MANUAL_PURCHASE' ? <Zap className="h-4 w-4" /> :
                       act.type === 'VOUCHER_REDEEMED' ? <CheckCircle2 className="h-4 w-4" /> :
                       <Activity className="h-4 w-4" />}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                          {act.type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(act.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-white font-medium">{act.summary}</p>
                      {act.storeName && (
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {act.storeName} {act.mallId ? `• ${act.mallId}` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
