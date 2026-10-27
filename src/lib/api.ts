import { BargainRequest, BargainResponse, DataSource, DealClient, ProximityPingPayload, ProximityResponse, SettleRequest, SettleResponse } from '../types/metapase';
import { demoClient } from './demoBackend';
import { timeoutSignal } from './device';
import { authorizePayment, forgetPasskey } from './metaPay';
import type { JsonResult } from './metaPay';

export const API_BASE: string = (import.meta.env.VITE_METAPASE_API_BASE as string | undefined) ?? 'http://localhost:3000';

const REQUEST_TIMEOUT_MS = 8000;

const postJson = async <T>(path: string, body: unknown): Promise<JsonResult<T>> => {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: timeoutSignal(REQUEST_TIMEOUT_MS)
  });
  let data: T | null = null;
  try {
    data = (await response.json()) as T;
  } catch {
    data = null;
  }
  return { ok: response.ok, status: response.status, data };
};

export const pingProximity = async (payload: ProximityPingPayload): Promise<ProximityResponse | null> => {
  const result = await postJson<ProximityResponse>('/api/proximity/ping', payload);
  if (!result.ok || !result.data || !result.data.adContext || !result.data.resolvedLocation) return null;
  return result.data;
};

export const submitBargain = async (payload: BargainRequest): Promise<BargainResponse> => {
  const result = await postJson<BargainResponse>('/api/agent/bargain', payload);
  if (!result.ok || !result.data) throw new Error(`Bargain request failed (HTTP ${result.status})`);
  return result.data;
};

type SettleReply = SettleResponse & { error?: string; message?: string };

const settleOnce = async (transactionToken: string): Promise<JsonResult<SettleReply>> => {
  const authPayload = await authorizePayment(postJson, transactionToken);
  return postJson<SettleReply>('/api/pay/settle', { transactionToken, authPayload });
};

export const settlePayment = async (payload: SettleRequest): Promise<SettleResponse> => {
  let result = await settleOnce(payload.transactionToken);
  if (!result.ok && result.data?.error === 'UNKNOWN_CREDENTIAL') {
    forgetPasskey();
    result = await settleOnce(payload.transactionToken);
  }
  if (result.status === 401) return { success: false };
  if (!result.ok || !result.data) throw new Error(result.data?.message ?? `Settlement failed (HTTP ${result.status})`);
  return result.data;
};

export const liveClient: DealClient = {
  label: API_BASE,
  ping: pingProximity,
  bargain: submitBargain,
  settle: settlePayment
};

export const getClient = (source: DataSource): DealClient => (source === 'demo' ? demoClient : liveClient);

export const DEFAULT_DATA_SOURCE: DataSource = import.meta.env.VITE_METAPASE_DATA_SOURCE === 'demo' ? 'demo' : 'live';
