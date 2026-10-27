import { GeoPoint } from '../types/metapase';
import { PATH_LOSS_EXPONENT } from '../config/venue';

const EARTH_RADIUS_M = 6371008.8;

export const toRad = (deg: number): number => (deg * Math.PI) / 180;

export const toDeg = (rad: number): number => (rad * 180) / Math.PI;

export const normalizeDeg = (deg: number): number => ((deg % 360) + 360) % 360;

export const signedAngleDelta = (target: number, from: number): number => {
  const delta = normalizeDeg(target - from);
  return delta > 180 ? delta - 360 : delta;
};

export const offsetToGeo = (anchor: GeoPoint, eastM: number, northM: number): GeoPoint => ({
  lat: anchor.lat + toDeg(northM / EARTH_RADIUS_M),
  lng: anchor.lng + toDeg(eastM / (EARTH_RADIUS_M * Math.cos(toRad(anchor.lat))))
});

export const haversineM = (a: GeoPoint, b: GeoPoint): number => {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
};

export const initialBearingDeg = (from: GeoPoint, to: GeoPoint): number => {
  const phi1 = toRad(from.lat);
  const phi2 = toRad(to.lat);
  const dLambda = toRad(to.lng - from.lng);
  const y = Math.sin(dLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);
  return normalizeDeg(toDeg(Math.atan2(y, x)));
};

export const rssiToDistanceM = (rssi: number, txPower: number, exponent: number = PATH_LOSS_EXPONENT): number =>
  10 ** ((txPower - rssi) / (10 * exponent));

export const distanceToRssi = (distanceM: number, txPower: number, exponent: number = PATH_LOSS_EXPONENT): number =>
  Math.round(txPower - 10 * exponent * Math.log10(Math.max(distanceM, 0.1)));

export const weightedCentroid = (samples: { point: GeoPoint; distanceM: number }[]): GeoPoint | null => {
  if (samples.length === 0) return null;
  let weightSum = 0;
  let lat = 0;
  let lng = 0;
  for (const sample of samples) {
    const weight = 1 / Math.max(sample.distanceM, 0.5) ** 2;
    weightSum += weight;
    lat += sample.point.lat * weight;
    lng += sample.point.lng * weight;
  }
  return { lat: lat / weightSum, lng: lng / weightSum };
};

const CARDINALS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

export const cardinal = (deg: number): string => CARDINALS[Math.round(normalizeDeg(deg) / 45) % 8];
