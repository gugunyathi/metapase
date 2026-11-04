import { useCallback, useEffect, useState } from 'react';
import { GeoFix } from '../types/metapase';

export type GeolocationPermissionState = 'prompt' | 'granted' | 'denied' | 'unknown';

export interface GeolocationState {
  fix: GeoFix | null;
  error: string | null;
  supported: boolean;
  permission: GeolocationPermissionState;
  requestLocation: () => Promise<GeoFix | null>;
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
  const [permission, setPermission] = useState<GeolocationPermissionState>('unknown');

  // Query browser permission status if supported
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('permissions' in navigator)) return;
    let isSubscribed = true;
    navigator.permissions
      .query({ name: 'geolocation' })
      .then(status => {
        if (!isSubscribed) return;
        setPermission(status.state as GeolocationPermissionState);
        status.onchange = () => {
          if (isSubscribed) setPermission(status.state as GeolocationPermissionState);
        };
      })
      .catch(() => {
        // Permissions API not fully supported for geolocation in all browsers
      });
    return () => {
      isSubscribed = false;
    };
  }, []);

  const requestLocation = useCallback((): Promise<GeoFix | null> => {
    return new Promise((resolve, reject) => {
      const geo = getGeolocation();
      if (!geo) {
        const msg = 'Geolocation is not supported in this browser.';
        setError(msg);
        reject(new Error(msg));
        return;
      }
      geo.getCurrentPosition(
        position => {
          const newFix: GeoFix = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracyM: position.coords.accuracy,
            speedMps: position.coords.speed !== null && Number.isFinite(position.coords.speed) ? position.coords.speed : null,
            timestamp: position.timestamp
          };
          setFix(newFix);
          setError(null);
          setPermission('granted');
          try {
            localStorage.setItem('metapase:location_accepted', 'true');
          } catch {
            // storage may be restricted in sandboxes
          }
          resolve(newFix);
        },
        failure => {
          let msg = 'Unable to acquire location.';
          if (failure.code === failure.PERMISSION_DENIED) {
            msg = 'Location permission was denied. Please allow location in your browser settings to track proximity.';
            setPermission('denied');
          } else if (failure.code === failure.TIMEOUT) {
            msg = 'Location request timed out. Please try again.';
          } else if (failure.code === failure.POSITION_UNAVAILABLE) {
            msg = 'Location information is currently unavailable.';
          }
          setError(msg);
          reject(new Error(msg));
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });
  }, []);

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
          setPermission('granted');
        },
        failure => {
          if (failure.code === failure.PERMISSION_DENIED) {
            setError('Location access is blocked here. Allow it in your browser to match outdoors.');
            setPermission('denied');
          } else if (failure.code === failure.TIMEOUT) {
            setError('Location timed out. Move somewhere with a clearer sky view.');
          } else {
            setError('Location is unavailable on this device.');
          }
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

  return { fix, error, supported, permission, requestLocation };
}

