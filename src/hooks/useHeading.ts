import { useCallback, useEffect, useRef, useState } from 'react';
import { normalizeDeg, signedAngleDelta } from '../lib/geo';

type OrientationWithCompass = DeviceOrientationEvent & { webkitCompassHeading?: number };
type PermissionCapable = { requestPermission?: () => Promise<'granted' | 'denied'> };

export type HeadingSource = 'sensor' | 'manual';
export type HeadingPermission = 'unknown' | 'granted' | 'denied' | 'unsupported';

const SMOOTHING = 0.2;

const initialPermission = (): HeadingPermission => {
  if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window) || !window.DeviceOrientationEvent) return 'unsupported';
  const api = window.DeviceOrientationEvent as unknown as PermissionCapable;
  return typeof api.requestPermission === 'function' ? 'unknown' : 'granted';
};

export interface HeadingState {
  heading: number;
  source: HeadingSource;
  permission: HeadingPermission;
  requestPermission: () => Promise<void>;
  setManualHeading: (deg: number) => void;
}

export function useHeading(): HeadingState {
  const [heading, setHeading] = useState<number>(0);
  const [source, setSource] = useState<HeadingSource>('manual');
  const [permission, setPermission] = useState<HeadingPermission>(initialPermission);
  const headingRef = useRef<number>(0);
  const sourceRef = useRef<HeadingSource>('manual');

  useEffect(() => {
    if (permission !== 'granted') return;
    const handle = (event: Event) => {
      const orientation = event as OrientationWithCompass;
      let raw: number | null = null;
      if (typeof orientation.webkitCompassHeading === 'number' && !Number.isNaN(orientation.webkitCompassHeading)) {
        raw = orientation.webkitCompassHeading;
      } else if (orientation.absolute && orientation.alpha !== null) {
        raw = 360 - orientation.alpha;
      }
      if (raw === null) return;
      const screenAngle = window.screen?.orientation?.angle ?? 0;
      const target = normalizeDeg(raw + screenAngle);
      const next = sourceRef.current === 'sensor'
        ? normalizeDeg(headingRef.current + signedAngleDelta(target, headingRef.current) * SMOOTHING)
        : target;
      headingRef.current = next;
      sourceRef.current = 'sensor';
      setHeading(next);
      setSource('sensor');
    };
    window.addEventListener('deviceorientationabsolute', handle);
    window.addEventListener('deviceorientation', handle);
    return () => {
      window.removeEventListener('deviceorientationabsolute', handle);
      window.removeEventListener('deviceorientation', handle);
    };
  }, [permission]);

  const requestPermission = useCallback(async () => {
    const api = window.DeviceOrientationEvent as unknown as PermissionCapable | undefined;
    if (!api || typeof api.requestPermission !== 'function') {
      setPermission(api ? 'granted' : 'unsupported');
      return;
    }
    try {
      const result = await api.requestPermission();
      setPermission(result === 'granted' ? 'granted' : 'denied');
    } catch {
      setPermission('denied');
    }
  }, []);

  const setManualHeading = useCallback((deg: number) => {
    if (sourceRef.current === 'sensor') return;
    headingRef.current = normalizeDeg(deg);
    setHeading(headingRef.current);
  }, []);

  return { heading, source, permission, requestPermission, setManualHeading };
}
