import { useEffect, useState } from 'react';
import { GeoFix } from '../types/metapase';

export interface GeolocationState {
  fix: GeoFix | null;
  error: string | null;
  supported: boolean;
}

const getGeolocation = (): Geolocation | null => {
  try {
    if (typeof navigator === 'undefined') return null;
    const geo = navigator.geolocation as Geolocation | null | undefined;
    return geo && typeof geo.watchPosition === 'function' ? geo : null;
  } catch {
    return null;
  }
};

export function useGeolocation(enabled: boolean): GeolocationState {
  const supported = getGeolocation() !== null;
  const [fix, setFix] = useState<GeoFix | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const geo = getGeolocation();
    if (!enabled || !geo) return;
    let watchId: number | null = null;
    try {
      watchId = geo.watchPosition(
        position => {
          setFix({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracyM: position.coords.accuracy,
            speedMps: position.coords.speed !== null && Number.isFinite(position.coords.speed) ? position.coords.speed : null,
            timestamp: position.timestamp
          });
          setError(null);
        },
        failure => {
          if (failure.code === failure.PERMISSION_DENIED) setError('Location access is blocked here. Allow it in your browser to match outdoors.');
          else if (failure.code === failure.TIMEOUT) setError('Location timed out. Move somewhere with a clearer sky view.');
          else setError('Location is unavailable on this device.');
        },
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 }
      );
    } catch {
      setError('Location is blocked in this window. Open the app in its own tab to use GPS.');
      return;
    }
    return () => {
      try {
        if (watchId !== null) geo.clearWatch(watchId);
      } catch {
        return;
      }
    };
  }, [enabled]);

  return { fix, error, supported };
}
