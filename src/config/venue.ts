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
  { id: 'istore', beaconUuid: 'e5527f30-f5f8-466e-aff9-25556b57fe72', name: 'iStore', tagline: 'Devices and accessories', category: 'electronics', offsetEastM: 30, offsetNorthM: 26, floor: 0, txPower: -59, defaultRssi: -98 },
  { id: 'lego', beaconUuid: 'f6637f30-f5f8-466e-aff9-25556b57fe73', name: 'LEGO Store', tagline: 'Iconic builder sets & Minifigures', category: 'electronics', offsetEastM: -8, offsetNorthM: -18, floor: 0, txPower: -59, defaultRssi: -82 },
  { id: 'sony', beaconUuid: 'a7747f30-f5f8-466e-aff9-25556b57fe74', name: 'Sony Center', tagline: 'Audio, cameras & PlayStation', category: 'electronics', offsetEastM: -18, offsetNorthM: 14, floor: 0, txPower: -59, defaultRssi: -84 },
  { id: 'dyson', beaconUuid: 'b8857f30-f5f8-466e-aff9-25556b57fe75', name: 'Dyson Demo Store', tagline: 'Cordless vacuums & hair styling', category: 'electronics', offsetEastM: 12, offsetNorthM: 10, floor: 0, txPower: -59, defaultRssi: -79 },
  { id: 'nespresso', beaconUuid: 'c9967f30-f5f8-466e-aff9-25556b57fe76', name: 'Nespresso Boutique', tagline: 'Vertuo barista coffee machines', category: 'groceries', offsetEastM: -14, offsetNorthM: -22, floor: 0, txPower: -59, defaultRssi: -87 },
  { id: 'lindt', beaconUuid: 'da077f30-f5f8-466e-aff9-25556b57fe77', name: 'Lindt Chocolatier', tagline: 'Swiss artisan chocolates & pralines', category: 'groceries', offsetEastM: 8, offsetNorthM: -20, floor: 0, txPower: -59, defaultRssi: -83 },
  { id: 'lelabo', beaconUuid: 'eb187f30-f5f8-466e-aff9-25556b57fe78', name: 'Le Labo Fragrances', tagline: 'Handcrafted luxury parfums', category: 'beauty', offsetEastM: 24, offsetNorthM: -10, floor: 0, txPower: -59, defaultRssi: -89 },
  { id: 'hoka', beaconUuid: 'fc297f30-f5f8-466e-aff9-25556b57fe79', name: 'HOKA Running', tagline: 'Maximalist road & trail runners', category: 'footwear', offsetEastM: -10, offsetNorthM: 12, floor: 0, txPower: -59, defaultRssi: -80 }
];
