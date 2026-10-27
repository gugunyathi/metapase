export interface BLEBeacon {
  uuid: string;
  rssi: number;
}

export interface WiFiNode {
  bssid: string;
  rssi: number;
}

export interface ProximityResponse {
  resolvedLocation: {
    mallId: string;
    outletId: string;
    outletName: string;
  };
  adContext: {
    campaignId: string;
    sku: string;
    itemName: string;
    stickerPriceZAR: number;
    imageUrl?: string;
  };
}

export type DeviceProfile = 'glasses' | 'watch' | 'car' | 'muse' | 'mobile' | 'desktop';

export interface LogEntry {
  id: string;
  timestamp: string;
  source: 'SYSTEM' | 'BLE_RADIO' | 'LLAMA_AGENT' | 'META_PAY';
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export type DealCategory = 'apparel' | 'footwear' | 'groceries' | 'electronics' | 'beauty';

export type IntentFilter = DealCategory | 'any';

export type VenueMode = 'auto' | 'indoor' | 'outdoor';

export type ResolvedMode = 'indoor' | 'outdoor';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface GeoFix extends GeoPoint {
  accuracyM: number;
  speedMps: number | null;
  timestamp: number;
}

export interface StoreNode {
  id: string;
  beaconUuid: string;
  name: string;
  tagline: string;
  category: DealCategory;
  offsetEastM: number;
  offsetNorthM: number;
  floor: number;
  txPower: number;
  defaultRssi: number;
}

export interface PlacedStore extends StoreNode {
  point: GeoPoint;
}

export interface NodeReading {
  node: PlacedStore;
  rssi: number;
  distanceM: number;
  bearingDeg: number | null;
  inRange: boolean;
}

export interface PositionEstimate {
  mode: ResolvedMode;
  userPoint: GeoPoint | null;
  readings: NodeReading[];
}

export interface ProximityPingPayload {
  deviceId: string;
  timestamp: string;
  telemetry: {
    ble: BLEBeacon[];
    wifi: WiFiNode[];
    gps: { lat: number; lng: number; accuracyM: number } | null;
  };
  positioning: {
    mode: ResolvedMode;
    estimatedDistanceM: number;
    matchRadiusM?: number;
    proximityZone?: string;
  };
  userContext: {
    currentIntent: IntentFilter;
    maxBudgetZAR: number;
  };
}

export interface BargainRequest {
  sessionId: string;
  campaignId: string;
  agentOfferZAR: number;
  rationale: string;
}

export interface BargainResponse {
  status: 'OFFER_ACCEPTED' | 'COUNTER_OFFER_PROPOSED' | string;
  finalPriceZAR: number;
  transactionToken?: string;
}

export interface AuthPayload {
  mechanism: string;
  signature: string;
  credentialId?: string;
  clientDataJSON?: string;
  authenticatorData?: string;
}

export interface SettleRequest {
  transactionToken: string;
  authPayload: AuthPayload;
}

export interface SettleResponse {
  success: boolean;
  referenceId?: string;
  verified?: boolean;
}

export type DealStatus = 'discovered' | 'negotiating' | 'agreed' | 'paying' | 'paid' | 'no_deal' | 'over_budget' | 'failed';

export interface NegotiationRound {
  round: number;
  agentOfferZAR: number;
  storeResponse: 'accepted' | 'countered' | 'ended';
  storePriceZAR: number | null;
}

export interface Deal {
  storeId: string;
  category: DealCategory;
  location: ProximityResponse['resolvedLocation'];
  ad: ProximityResponse['adContext'];
  status: DealStatus;
  negotiatedPriceZAR: number | null;
  transactionToken: string | null;
  rounds: NegotiationRound[];
  referenceId: string | null;
  firstSeen: number;
  lastSeen: number;
  note: string | null;
}

export interface EngineStats {
  spentZAR: number;
  savedZAR: number;
  purchases: number;
}

export type DataSource = 'live' | 'demo';

export interface DealClient {
  label: string;
  ping: (payload: ProximityPingPayload) => Promise<ProximityResponse | null>;
  bargain: (payload: BargainRequest) => Promise<BargainResponse>;
  settle: (payload: SettleRequest) => Promise<SettleResponse>;
}

export type PageId = 'home' | 'discover' | 'timeline' | 'cart' | 'settings';

export interface ItemSnapshot {
  storeId: string;
  campaignId: string;
  sku: string;
  itemName: string;
  outletName: string;
  category: DealCategory;
  stickerPriceZAR: number;
  imageUrl?: string;
}

export interface ParkedItem extends ItemSnapshot {
  id: string;
  parkedAt: number;
  lastStorePriceZAR: number;
  bestOfferZAR: number | null;
  reason: string;
}

export interface WatchItem extends ItemSnapshot {
  id: string;
  addedAt: number;
  targetPriceZAR: number;
  alertAt: number | null;
}

export interface CartLine extends ItemSnapshot {
  id: string;
  addedAt: number;
  priceZAR: number;
  status: 'ready' | 'buying' | 'failed';
  note: string | null;
  origin?: 'agreed' | 'parked';
}

export interface Purchase extends ItemSnapshot {
  id: string;
  paidAt: number;
  priceZAR: number;
  referenceId: string | null;
}

export type TimelineKind = 'wishlist' | 'bought' | 'promotion';

export interface TimelineEvent {
  id: string;
  kind: TimelineKind;
  at: number;
  item: ItemSnapshot;
  priceZAR: number;
  note: string;
}

export interface UserProfile {
  name: string;
  email: string;
  memberSince: number;
}

export interface AppPreferences {
  haptics: boolean;
  voice: boolean;
  autoBuy: boolean;
}

export type EngineEvent =
  | { type: 'discovered'; deal: Deal }
  | { type: 'agreed'; deal: Deal; priceZAR: number }
  | { type: 'parked'; deal: Deal; lastStorePriceZAR: number; bestOfferZAR: number | null; reason: string }
  | { type: 'paid'; snapshot: ItemSnapshot; priceZAR: number; referenceId: string | null };

export interface BuyResult {
  ok: boolean;
  note: string | null;
}
