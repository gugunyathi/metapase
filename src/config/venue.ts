import { GeoPoint, StoreNode } from '../types/metapase';

export const DEFAULT_VENUE_ANCHOR: GeoPoint = { lat: -26.107567, lng: 28.056702 };

export const MATCH_RADIUS_M = 50;
export const OUTDOOR_ACCURACY_M = 25;
export const SCAN_INTERVAL_MS = 6000;
export const STALE_AFTER_MS = 30000;
export const MAX_ROUNDS = 5;
export const OPENING_OFFER_RATIO = 0.75;
export const PATH_LOSS_EXPONENT = 2.5;

export const STORE_NODES: StoreNode[] = [
  { id: 'zara', beaconUuid: 'b9407f30-f5f8-466e-aff9-25556b57fe6e', name: 'Zara', tagline: 'Apparel clearance', category: 'apparel', offsetEastM: 6, offsetNorthM: 4, floor: 0, txPower: -59, defaultRssi: -76 },
  { id: 'woolworths', beaconUuid: 'a3217f30-f5f8-466e-aff9-25556b57fe6f', name: 'Woolworths', tagline: 'Gourmet delicatessen', category: 'groceries', offsetEastM: -12, offsetNorthM: 9, floor: 0, txPower: -59, defaultRssi: -84 },
  { id: 'nike', beaconUuid: 'c8107f30-f5f8-466e-aff9-25556b57fe70', name: 'Nike', tagline: 'Performance footwear', category: 'footwear', offsetEastM: 18, offsetNorthM: -14, floor: 0, txPower: -59, defaultRssi: -89 },
  { id: 'dischem', beaconUuid: 'd4417f30-f5f8-466e-aff9-25556b57fe71', name: 'Dis-Chem', tagline: 'Beauty and wellness', category: 'beauty', offsetEastM: -25, offsetNorthM: -22, floor: 0, txPower: -59, defaultRssi: -93 },
  { id: 'istore', beaconUuid: 'e5527f30-f5f8-466e-aff9-25556b57fe72', name: 'iStore', tagline: 'Devices and accessories', category: 'electronics', offsetEastM: 30, offsetNorthM: 26, floor: 0, txPower: -59, defaultRssi: -98 }
];
