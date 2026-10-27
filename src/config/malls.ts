import { GeoPoint, StoreNode } from '../types/metapase';

export type ProximityRadiusMode = 'driveby' | 'walking' | 'aisle';

export interface ProximityZoneConfig {
  mode: ProximityRadiusMode;
  radiusM: number;
  label: string;
  shortLabel: string;
  badge: string;
  description: string;
  tech: string;
}

export const PROXIMITY_ZONES: Record<ProximityRadiusMode, ProximityZoneConfig> = {
  driveby: {
    mode: 'driveby',
    radiusM: 50,
    label: 'Drive-By Commuter (50m)',
    shortLabel: '50m Drive-By',
    badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    description: 'Wide-area BLE & GPS match for vehicles & commuters passing malls and stores',
    tech: 'Wide BLE + GPS'
  },
  walking: {
    mode: 'walking',
    radiusM: 20,
    label: 'In-Mall Promenade (20m)',
    shortLabel: '20m In-Mall',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    description: 'Indoor BLE beacon scanning as shoppers walk past store fronts and concourses',
    tech: 'Indoor BLE Beacons'
  },
  aisle: {
    mode: 'aisle',
    radiusM: 1,
    label: 'In-Store Aisle (1m)',
    shortLabel: '1m Aisle Shelf',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    description: 'Micro-location shelf beacon detection as you browse products inside store aisles',
    tech: 'Shelf Micro-Beacon'
  }
};

export interface MallInfo {
  id: string;
  name: string;
  shortName: string;
  tagline: string;
  city: string;
  suburb: string;
  address: string;
  websiteUrl: string;
  gpsCenter: GeoPoint;
  geofenceRadiusM: number;
  stores: StoreNode[];
}

// ---------------------------------------------------------------------------
// Real Store Nodes for Fourways Mall
// Location: Ruby Close & William Nicol Dr, Fourways, Sandton (-26.017309, 28.008850)
// ---------------------------------------------------------------------------
export const FOURWAYS_MALL_STORES: StoreNode[] = [
  { id: 'fw_zara', beaconUuid: 'b9407f30-f5f8-466e-aff9-25556b57fe6e', name: 'Zara', tagline: 'Contemporary Spanish fashion · Level 1', category: 'apparel', offsetEastM: 6, offsetNorthM: 4, floor: 1, txPower: -59, defaultRssi: -76 },
  { id: 'fw_woolworths', beaconUuid: 'a3217f30-f5f8-466e-aff9-25556b57fe6f', name: 'Woolworths', tagline: 'Organic deli & groceries · Level 1', category: 'groceries', offsetEastM: -12, offsetNorthM: 8, floor: 1, txPower: -59, defaultRssi: -82 },
  { id: 'fw_nike', beaconUuid: 'c8107f30-f5f8-466e-aff9-25556b57fe70', name: 'Nike Live', tagline: 'Performance sportswear · Level 2', category: 'footwear', offsetEastM: 16, offsetNorthM: -10, floor: 2, txPower: -59, defaultRssi: -86 },
  { id: 'fw_cottonon', beaconUuid: 'c0770f30-f5f8-466e-aff9-25556b57fe73', name: 'Cotton On', tagline: 'Everyday lifestyle denim & apparel · Level 1', category: 'apparel', offsetEastM: -18, offsetNorthM: -14, floor: 1, txPower: -59, defaultRssi: -88 },
  { id: 'fw_dischem', beaconUuid: 'd4417f30-f5f8-466e-aff9-25556b57fe71', name: 'Dis-Chem Pharmacy', tagline: 'Health, wellness & dermocosmetics · Level 0', category: 'beauty', offsetEastM: -25, offsetNorthM: 20, floor: 0, txPower: -59, defaultRssi: -91 },
  { id: 'fw_istore', beaconUuid: 'e5527f30-f5f8-466e-aff9-25556b57fe72', name: 'iStore Apple Reseller', tagline: 'Official Apple devices & accessories · Level 2', category: 'electronics', offsetEastM: 22, offsetNorthM: 18, floor: 2, txPower: -59, defaultRssi: -94 },
  { id: 'fw_checkers', beaconUuid: 'cf210f30-f5f8-466e-aff9-25556b57fe74', name: 'Checkers Hyper', tagline: 'Fresh foods & artisan deli · Level 0', category: 'groceries', offsetEastM: 32, offsetNorthM: -22, floor: 0, txPower: -59, defaultRssi: -96 }
];

// ---------------------------------------------------------------------------
// Real Store Nodes for Sandton City
// Location: 83 Rivonia Rd, Sandhurst, Sandton (-26.107567, 28.056702)
// ---------------------------------------------------------------------------
export const SANDTON_CITY_STORES: StoreNode[] = [
  { id: 'sc_zara', beaconUuid: 'sc107f30-f5f8-466e-aff9-25556b57fe01', name: 'Zara Sandton', tagline: 'Flagship European fashion · Upper Level', category: 'apparel', offsetEastM: 5, offsetNorthM: 5, floor: 2, txPower: -59, defaultRssi: -74 },
  { id: 'sc_hoka', beaconUuid: 'sc207f30-f5f8-466e-aff9-25556b57fe02', name: 'HOKA Flagship', tagline: 'Premium maximalist running shoes · Middle Level', category: 'footwear', offsetEastM: -10, offsetNorthM: 12, floor: 1, txPower: -59, defaultRssi: -80 },
  { id: 'sc_adidas', beaconUuid: 'sc307f30-f5f8-466e-aff9-25556b57fe03', name: 'Adidas Originals', tagline: 'Athletics & streetwear collection · Lower Level', category: 'footwear', offsetEastM: 14, offsetNorthM: -15, floor: 0, txPower: -59, defaultRssi: -85 },
  { id: 'sc_woolworths', beaconUuid: 'sc407f30-f5f8-466e-aff9-25556b57fe04', name: 'Woolworths Food & Home', tagline: 'Gourmet market & premier apparel · Middle Level', category: 'groceries', offsetEastM: -22, offsetNorthM: -8, floor: 1, txPower: -59, defaultRssi: -88 },
  { id: 'sc_istore', beaconUuid: 'sc507f30-f5f8-466e-aff9-25556b57fe05', name: 'iStore Sandton City', tagline: 'Apple Premium Partner · Middle Level', category: 'electronics', offsetEastM: 18, offsetNorthM: 20, floor: 1, txPower: -59, defaultRssi: -90 },
  { id: 'sc_alexander_mcqueen', beaconUuid: 'sc607f30-f5f8-466e-aff9-25556b57fe06', name: 'Alexander McQueen', tagline: 'Diamond Walk haute couture · Upper Level', category: 'apparel', offsetEastM: 28, offsetNorthM: 8, floor: 2, txPower: -59, defaultRssi: -93 },
  { id: 'sc_sephora_arc', beaconUuid: 'sc707f30-f5f8-466e-aff9-25556b57fe07', name: 'ARC Beauty Store', tagline: 'Luxury fragrance & skincare · Middle Level', category: 'beauty', offsetEastM: -15, offsetNorthM: 24, floor: 1, txPower: -59, defaultRssi: -95 }
];

// ---------------------------------------------------------------------------
// Real Store Nodes for Northgate Shopping Centre
// Location: Northumberland Ave & Olievenhout Ave, North Riding (-26.066400, 27.952500)
// ---------------------------------------------------------------------------
export const NORTHGATE_STORES: StoreNode[] = [
  { id: 'ng_picknpay', beaconUuid: 'ng107f30-f5f8-466e-aff9-25556b57fe11', name: 'Pick n Pay Hyper', tagline: 'Fresh market & general merchandise · Entrance 1', category: 'groceries', offsetEastM: -8, offsetNorthM: 6, floor: 0, txPower: -59, defaultRssi: -77 },
  { id: 'ng_sportscene', beaconUuid: 'ng207f30-f5f8-466e-aff9-25556b57fe12', name: 'Sportscene', tagline: 'Kings of sneakerwear & street culture · Shop 42', category: 'footwear', offsetEastM: 12, offsetNorthM: -8, floor: 0, txPower: -59, defaultRssi: -83 },
  { id: 'ng_edgars', beaconUuid: 'ng307f30-f5f8-466e-aff9-25556b57fe13', name: 'Edgars Department Store', tagline: 'Multi-brand fashion & beauty · Entrance 4', category: 'apparel', offsetEastM: 20, offsetNorthM: 14, floor: 0, txPower: -59, defaultRssi: -87 },
  { id: 'ng_cottonon', beaconUuid: 'ng407f30-f5f8-466e-aff9-25556b57fe14', name: 'Cotton On Northgate', tagline: 'Casual wardrobe essentials · Shop 68', category: 'apparel', offsetEastM: -18, offsetNorthM: -12, floor: 0, txPower: -59, defaultRssi: -89 },
  { id: 'ng_dischem', beaconUuid: 'ng507f30-f5f8-466e-aff9-25556b57fe15', name: 'Dis-Chem Pharmacy', tagline: 'Vitamins, cosmetics & healthcare · Entrance 2', category: 'beauty', offsetEastM: -24, offsetNorthM: 18, floor: 0, txPower: -59, defaultRssi: -92 },
  { id: 'ng_crazy_store', beaconUuid: 'ng607f30-f5f8-466e-aff9-25556b57fe16', name: 'The Crazy Store', tagline: 'Tech gadgets, toys & party supplies · Shop 19', category: 'electronics', offsetEastM: 15, offsetNorthM: 22, floor: 0, txPower: -59, defaultRssi: -94 }
];

// ---------------------------------------------------------------------------
// Real Store Nodes for Bel Air Shopping Centre
// Location: Bellairs Dr & Malibongwe Dr, North Riding (-26.060278, 27.957778)
// ---------------------------------------------------------------------------
export const BEL_AIR_STORES: StoreNode[] = [
  { id: 'ba_woolworths', beaconUuid: 'ba107f30-f5f8-466e-aff9-25556b57fe21', name: 'Woolworths Food & Café', tagline: 'Artisanal foods, fresh organics & café · Main Concourse', category: 'groceries', offsetEastM: 4, offsetNorthM: 6, floor: 0, txPower: -59, defaultRssi: -75 },
  { id: 'ba_clicks', beaconUuid: 'ba207f30-f5f8-466e-aff9-25556b57fe22', name: 'Clicks Pharmacy', tagline: 'Health, skincare & beauty essentials · Shop 14', category: 'beauty', offsetEastM: -10, offsetNorthM: 10, floor: 0, txPower: -59, defaultRssi: -81 },
  { id: 'ba_uniq', beaconUuid: 'ba307f30-f5f8-466e-aff9-25556b57fe23', name: 'UNIQ Clothing by Checkers', tagline: 'Premium linen, cotton & modern fashion · Shop 28', category: 'apparel', offsetEastM: 14, offsetNorthM: -12, floor: 0, txPower: -59, defaultRssi: -86 },
  { id: 'ba_mrprice', beaconUuid: 'ba407f30-f5f8-466e-aff9-25556b57fe24', name: 'Mr Price Clothing', tagline: 'Trendy value fashion for everyday · Shop 32', category: 'apparel', offsetEastM: -16, offsetNorthM: -14, floor: 0, txPower: -59, defaultRssi: -89 },
  { id: 'ba_spar', beaconUuid: 'ba507f30-f5f8-466e-aff9-25556b57fe25', name: 'Spar Supermarket', tagline: 'Bakery, butchery & fresh local produce · Shop 01', category: 'groceries', offsetEastM: 24, offsetNorthM: 16, floor: 0, txPower: -59, defaultRssi: -92 },
  { id: 'ba_cellshack', beaconUuid: 'ba607f30-f5f8-466e-aff9-25556b57fe26', name: 'Cell Shack & Tech', tagline: 'Smart accessories, chargers & mobile repair · Shop 08', category: 'electronics', offsetEastM: -22, offsetNorthM: 20, floor: 0, txPower: -59, defaultRssi: -95 }
];

export const MALLS_DATABASE: MallInfo[] = [
  {
    id: 'sandton_city',
    name: 'Sandton City',
    shortName: 'Sandton City',
    tagline: 'Africa’s most prestigious shopping destination',
    city: 'Johannesburg',
    suburb: 'Sandton',
    address: '83 Rivonia Rd, Sandhurst, Sandton, 2196',
    websiteUrl: 'https://sandtoncity.com/stores/',
    gpsCenter: { lat: -26.107567, lng: 28.056702 },
    geofenceRadiusM: 2000,
    stores: SANDTON_CITY_STORES
  },
  {
    id: 'fourways_mall',
    name: 'Fourways Mall',
    shortName: 'Fourways Mall',
    tagline: 'The largest shopping centre in South Africa',
    city: 'Johannesburg',
    suburb: 'Fourways',
    address: '11 Ruby Cl, Witkoppen, Sandton, 2068',
    websiteUrl: 'https://fourwaysmall.com/store-directory-all.php',
    gpsCenter: { lat: -26.017309, lng: 28.008850 },
    geofenceRadiusM: 2500,
    stores: FOURWAYS_MALL_STORES
  },
  {
    id: 'northgate',
    name: 'Northgate Shopping Centre',
    shortName: 'Northgate',
    tagline: 'Randburg’s favourite family shopping & entertainment hub',
    city: 'Johannesburg',
    suburb: 'North Riding',
    address: 'Northumberland Ave & Olievenhout Ave, North Riding, 2162',
    websiteUrl: 'https://northgate.co.za/store-directory/',
    gpsCenter: { lat: -26.066400, lng: 27.952500 },
    geofenceRadiusM: 2000,
    stores: NORTHGATE_STORES
  },
  {
    id: 'bel_air',
    name: 'Bel Air Shopping Centre',
    shortName: 'Bel Air',
    tagline: 'Convenient community boutique shopping in North Riding',
    city: 'Johannesburg',
    suburb: 'North Riding',
    address: 'Bellairs Dr, North Riding, Johannesburg, 2169',
    websiteUrl: 'https://www.belairshoppingcentre.co.za/#stores',
    gpsCenter: { lat: -26.060278, lng: 27.957778 },
    geofenceRadiusM: 1500,
    stores: BEL_AIR_STORES
  }
];

export const DEFAULT_MALL_ID = 'sandton_city';
export const DEFAULT_MALL = MALLS_DATABASE[0];
