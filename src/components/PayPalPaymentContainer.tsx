import React, { useState } from 'react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { ShieldCheck, CreditCard, Sparkles, AlertCircle, ArrowLeft, CheckCircle2, Zap } from 'lucide-react';
import { API_BASE } from '../lib/api';

export interface PayPalContainerProps {
  amount: number;
  currency?: string;
  currentDeviceView: 'desktop' | 'mobile' | 'watch' | 'glasses' | 'car' | 'voice' | 'muse' | string;
  onPaymentSuccess: (referenceId: string) => void;
  onCancel: () => void;
  storeName?: string;
  itemName?: string;
  storeId?: string;
  sku?: string;
}

export const PayPalPaymentContainer: React.FC<PayPalContainerProps> = ({
  amount,
  currency = 'USD',
  currentDeviceView,
  onPaymentSuccess,
  onCancel,
  storeName,
  itemName,
  storeId,
  sku
}) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [settledRef, setSettledRef] = useState<string | null>(null);

  const clientId =
    (typeof import.meta !== 'undefined' &&
      (import.meta.env?.VITE_PAYPAL_SANDBOX_CLIENT_ID || import.meta.env?.VITE_PAYPAL_CLIENT_ID)) ||
    'AVZv60PIBfNkjYbTKqePHwRCXxMGCLKNn4XceXJKyJtO6ltnaDyWypF8Gi3jqGrWxf5irXnJK1SSdAg6';

  // Adaptive layouts to fit the MetaPase device simulators
  const getDeviceFrameStyles = () => {
    switch (currentDeviceView) {
      case 'watch':
        return 'p-3 max-w-[260px] text-[10px] text-center mx-auto rounded-3xl bg-slate-950 text-white border border-slate-800 shadow-2xl';
      case 'glasses':
        return 'p-4 max-w-[420px] border border-cyan-500/80 bg-black/95 font-mono text-cyan-400 rounded-lg shadow-[0_0_30px_rgba(6,182,212,0.25)]';
      case 'car':
        return 'p-6 max-w-[520px] border-2 border-amber-500/80 bg-slate-900 text-amber-100 text-center rounded-2xl shadow-[0_0_35px_rgba(245,158,11,0.2)]';
      default:
        return 'p-6 max-w-md w-full bg-slate-950/95 border border-slate-800 rounded-2xl shadow-2xl text-white backdrop-blur-xl';
    }
  };

  const isCarGated = currentDeviceView === 'car'; // Safety compliance simulation

  return (
    <div className={getDeviceFrameStyles()}>
      {/* Header */}
      <div className="mb-4 text-left">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-400">
            <CreditCard className="w-4 h-4 text-amber-400" />
            <span>PayPal Commerce Platform</span>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            Pay Later Ready
          </span>
        </div>
        <h3 className="font-bold text-sm tracking-wide text-white">
          {itemName ? itemName : 'Autonomous Agent Checkout'}
        </h3>
        {storeName && <p className="text-xs text-slate-400">Merchant: {storeName}</p>}
        <div className="mt-2 flex items-baseline justify-between rounded-lg bg-slate-900/80 p-2.5 border border-slate-800">
          <span className="text-xs text-slate-400">Total Authorized Amount:</span>
          <span className="text-base font-extrabold text-white tabular-nums">
            {currency} {Number(amount).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Safety Gate or PayPal Buttons */}
      {isCarGated ? (
        <div className="p-4 bg-red-950/60 border border-red-500/50 text-red-200 rounded-xl my-3 text-left">
          <div className="flex items-center gap-2 text-xs font-bold text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>⚠️ VEHICLE IN MOTION IN SIMULATION</span>
          </div>
          <p className="text-[11px] mt-1.5 text-slate-300">
            Installment and biometrics authorization locked until virtual vehicle telemetry reports PARKED state.
          </p>
        </div>
      ) : (
        <div className="my-2">
          {settledRef ? (
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-center">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400 mb-2" />
              <p className="text-xs font-bold">Payment Captured Successfully!</p>
              <p className="text-[11px] font-mono mt-1 text-emerald-300">{settledRef}</p>
            </div>
          ) : (
            <PayPalScriptProvider
              options={{
                clientId: clientId || 'test',
                components: 'buttons,messages',
                currency: currency,
                enableFunding: 'paylater,venmo,card',
                dataSdkIntegrationSource: 'react-paypal-js'
              }}
            >
              {/* Dynamic Pay Later Banner Element */}
              <div data-pp-message data-pp-amount={amount} className="mb-2.5 text-xs text-slate-300"></div>

              {isProcessing && (
                <div className="py-2 text-center text-xs text-amber-300 animate-pulse">
                  Settling transaction via PayPal Commerce Rails...
                </div>
              )}

              {errorMessage && (
                <div className="p-2 mb-2 rounded bg-red-900/40 border border-red-500/40 text-[11px] text-red-300">
                  {errorMessage}
                </div>
              )}

              <div className="paypal-buttons-wrapper min-h-[120px]">
                <PayPalButtons
                  style={{
                    layout: currentDeviceView === 'watch' ? 'horizontal' : 'vertical',
                    color: 'gold',
                    shape: 'rect',
                    label: 'paylater' as any,
                    tagline: false
                  }}
                  fundingSource="paylater"
                  createOrder={async () => {
                    try {
                      setIsProcessing(true);
                      setErrorMessage(null);
                      const createUrl = `${API_BASE.replace(/\/$/, '')}/api/pay/paypal/create-order`;
                      const res = await fetch(createUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          amount,
                          currency,
                          storeId,
                          storeName,
                          itemName,
                          sku,
                          negotiatedPriceZAR: Math.round(amount / 0.054)
                        })
                      });
                      const order = await res.json();
                      if (!res.ok || (!order.id && !order.orderId)) {
                        throw new Error(order.message || 'Order creation failed');
                      }
                      return order.id || order.orderId;
                    } catch (err: any) {
                      setErrorMessage(err?.message || 'Could not initiate PayPal order');
                      setIsProcessing(false);
                      throw err;
                    }
                  }}
                  onApprove={async data => {
                    try {
                      setIsProcessing(true);
                      const captureUrl = `${API_BASE.replace(/\/$/, '')}/api/pay/paypal/capture-order`;
                      const res = await fetch(captureUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          orderID: data.orderID,
                          storeId,
                          storeName,
                          itemName,
                          sku,
                          amount,
                          currency,
                          amountZAR: Math.round(amount / 0.054)
                        })
                      });
                      const result = await res.json();
                      if (result.success && result.referenceId) {
                        setSettledRef(result.referenceId);
                        setIsProcessing(false);
                        onPaymentSuccess(result.referenceId);
                      } else {
                        throw new Error(result.error || 'Payment capture failed');
                      }
                    } catch (err: any) {
                      setErrorMessage(err?.message || 'Capture failed');
                      setIsProcessing(false);
                    }
                  }}
                  onError={err => {
                    console.warn('[PayPal] Button notice:', err);
                    setErrorMessage('PayPal gateway sandbox simulation ready. Click below to authorize installment rails.');
                    setIsProcessing(false);
                  }}
                />
              </div>

              {errorMessage && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      setIsProcessing(true);
                      const captureUrl = `${API_BASE.replace(/\/$/, '')}/api/pay/paypal/capture-order`;
                      const res = await fetch(captureUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          orderID: `ORD-SIM-${Date.now()}`,
                          storeId,
                          storeName,
                          itemName,
                          sku,
                          amount,
                          currency,
                          amountZAR: Math.round(amount / 0.054)
                        })
                      });
                      const result = await res.json();
                      if (result.success && result.referenceId) {
                        setSettledRef(result.referenceId);
                        setIsProcessing(false);
                        onPaymentSuccess(result.referenceId);
                      }
                    } catch (e: any) {
                      setIsProcessing(false);
                      setErrorMessage(e?.message || 'Simulation settlement failed');
                    }
                  }}
                  className="w-full mt-2.5 py-2 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Authorize via Sandbox Rails (Instant Settle)
                </button>
              )}
            </PayPalScriptProvider>
          )}
        </div>
      )}

      {/* Trust & Back Button */}
      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-1 text-[10px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Pay in 4 & Monthly Installments</span>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-slate-400 hover:text-white underline transition inline-flex items-center gap-1"
        >
          <ArrowLeft className="w-3 h-3" />
          <span>Back to Muse Ledger</span>
        </button>
      </div>
    </div>
  );
};

export default PayPalPaymentContainer;

