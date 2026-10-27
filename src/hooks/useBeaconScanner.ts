import { useCallback, useEffect, useRef, useState } from 'react';
import { HardwareBeaconScanner, scanningSupport } from '../lib/bluetoothScanner';
import type { DiscoveredBeacon } from '../lib/bluetoothScanner';

export type ScanStatus = 'idle' | 'starting' | 'scanning' | 'error';

export interface LiveBeacon {
  rssi: number;
  txPower: number | null;
  lastSeen: number;
}

export interface BeaconScannerState {
  supported: boolean;
  unsupportedReason: string | null;
  status: ScanStatus;
  error: string | null;
  beacons: Record<string, LiveBeacon>;
  start: () => Promise<void>;
  stop: () => void;
}

const FLUSH_MS = 500;
const EXPIRE_MS = 6000;
const SMOOTHING = 0.35;

export function useBeaconScanner(): BeaconScannerState {
  const support = scanningSupport();
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [beacons, setBeacons] = useState<Record<string, LiveBeacon>>({});
  const bufferRef = useRef<Record<string, LiveBeacon>>({});
  const scannerRef = useRef<HardwareBeaconScanner | null>(null);

  useEffect(() => {
    if (status !== 'scanning') return;
    const timer = window.setInterval(() => {
      const now = Date.now();
      const next: Record<string, LiveBeacon> = {};
      for (const [uuid, beacon] of Object.entries(bufferRef.current)) if (now - beacon.lastSeen <= EXPIRE_MS) next[uuid] = beacon;
      bufferRef.current = next;
      setBeacons({ ...next });
    }, FLUSH_MS);
    return () => window.clearInterval(timer);
  }, [status]);

  const handleBeacon = useCallback((beacon: DiscoveredBeacon) => {
    const previous = bufferRef.current[beacon.uuid];
    const rssi = previous && Date.now() - previous.lastSeen < EXPIRE_MS ? previous.rssi + (beacon.rssi - previous.rssi) * SMOOTHING : beacon.rssi;
    bufferRef.current[beacon.uuid] = { rssi, txPower: beacon.txPower, lastSeen: beacon.timestamp };
  }, []);

  const stop = useCallback(() => {
    scannerRef.current?.stop();
    scannerRef.current = null;
    bufferRef.current = {};
    setBeacons({});
    setStatus('idle');
  }, []);

  const start = useCallback(async () => {
    if (scannerRef.current?.active) return;
    setError(null);
    setStatus('starting');
    const scanner = new HardwareBeaconScanner(handleBeacon);
    try {
      await scanner.start();
      scannerRef.current = scanner;
      setStatus('scanning');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Bluetooth scanning failed to start.');
      setStatus('error');
    }
  }, [handleBeacon]);

  useEffect(() => () => scannerRef.current?.stop(), []);

  return { supported: support.supported, unsupportedReason: support.reason, status, error, beacons, start, stop };
}
