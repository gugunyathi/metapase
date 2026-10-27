import { DealCategory } from '../types/metapase';

export interface CatalogProduct {
  id: string;
  sku: string;
  itemName: string;
  category: DealCategory;
  mallId: string;
  storeId: string;
  storeName: string;
  stickerPriceZAR: number;
  floorRatio: number;
  imageUrl: string;
  description: string;
  tag: string;
}

export const REAL_PRODUCTS: CatalogProduct[] = [
  // =========================================================================
  // SANDTON CITY PRODUCTS
  // =========================================================================
  {
    id: 'sc_zara_blazer',
    sku: 'ZA-BLZ-9912',
    itemName: 'Tailored Relaxed Linen Blazer',
    category: 'apparel',
    mallId: 'sandton_city',
    storeId: 'sc_zara',
    storeName: 'Zara Sandton',
    stickerPriceZAR: 1299,
    floorRatio: 0.78,
    imageUrl: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&auto=format&fit=crop&q=80',
    description: 'Bespoke European fit single-breasted blazer in breathable natural flax linen.',
    tag: 'Trending in Sandton'
  },
  {
    id: 'sc_zara_knit',
    sku: 'ZA-KNT-4411',
    itemName: 'Textured Ribbed Knit Cardigan',
    category: 'apparel',
    mallId: 'sandton_city',
    storeId: 'sc_zara',
    storeName: 'Zara Sandton',
    stickerPriceZAR: 799,
    floorRatio: 0.80,
    imageUrl: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800&auto=format&fit=crop&q=80',
    description: 'Fine-spun cotton blend with tortoiseshell horn buttons and relaxed shoulders.',
    tag: 'Autumn Essential'
  },
  {
    id: 'sc_hoka_clifton',
    sku: 'HK-CLF-0009',
    itemName: 'HOKA Clifton 9 Road Running Shoes',
    category: 'footwear',
    mallId: 'sandton_city',
    storeId: 'sc_hoka',
    storeName: 'HOKA Flagship',
    stickerPriceZAR: 2999,
    floorRatio: 0.82,
    imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80',
    description: 'Ultra-cushioned daily road runner with MetaRocker geometry for smooth strides.',
    tag: 'Flagship Exclusive'
  },
  {
    id: 'sc_hoka_speedgoat',
    sku: 'HK-SPG-0005',
    itemName: 'HOKA Speedgoat 5 Trail Shoes',
    category: 'footwear',
    mallId: 'sandton_city',
    storeId: 'sc_hoka',
    storeName: 'HOKA Flagship',
    stickerPriceZAR: 3299,
    floorRatio: 0.84,
    imageUrl: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800&auto=format&fit=crop&q=80',
    description: 'Vibram Megagrip traction lug soles built for rugged mountain trails and single tracks.',
    tag: 'Trail Master'
  },
  {
    id: 'sc_adidas_ultraboost',
    sku: 'AD-UB-2401',
    itemName: 'Adidas Ultraboost Light Running Shoes',
    category: 'footwear',
    mallId: 'sandton_city',
    storeId: 'sc_adidas',
    storeName: 'Adidas Originals',
    stickerPriceZAR: 3499,
    floorRatio: 0.82,
    imageUrl: 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=800&auto=format&fit=crop&q=80',
    description: 'Light BOOST midsole foam with Continental Natural Rubber outsole for unmatched energy return.',
    tag: 'Bestseller'
  },
  {
    id: 'sc_woolworths_coffee',
    sku: 'WW-ET-0500',
    itemName: 'Ethiopian Yirgacheffe Single-Origin Beans 500g',
    category: 'groceries',
    mallId: 'sandton_city',
    storeId: 'sc_woolworths',
    storeName: 'Woolworths Food & Home',
    stickerPriceZAR: 199,
    floorRatio: 0.84,
    imageUrl: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800&auto=format&fit=crop&q=80',
    description: 'Washed Arabica beans bursting with jasmine florals and bright bergamot citrus notes.',
    tag: 'Artisan Roast'
  },
  {
    id: 'sc_woolworths_cheese',
    sku: 'WW-CHS-0042',
    itemName: 'Handcrafted Artisanal Charcuterie & Cheese Platter',
    category: 'groceries',
    mallId: 'sandton_city',
    storeId: 'sc_woolworths',
    storeName: 'Woolworths Food & Home',
    stickerPriceZAR: 389,
    floorRatio: 0.85,
    imageUrl: 'https://images.unsplash.com/photo-1631451095765-2c91616fc9e6?w=800&auto=format&fit=crop&q=80',
    description: 'Aged Gouda, French Camembert, Parma Prosciutto, and sun-ripened Calamata olives.',
    tag: 'Gourmet Selection'
  },
  {
    id: 'sc_istore_airpods',
    sku: 'AP-AIR-4ANC',
    itemName: 'Apple AirPods 4 with Active Noise Cancellation',
    category: 'electronics',
    mallId: 'sandton_city',
    storeId: 'sc_istore',
    storeName: 'iStore Sandton City',
    stickerPriceZAR: 3999,
    floorRatio: 0.89,
    imageUrl: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=800&auto=format&fit=crop&q=80',
    description: 'H2 chip power, Adaptive Audio, Conversation Awareness, and USB-C wireless case.',
    tag: 'Official Apple Warranty'
  },
  {
    id: 'sc_istore_magsafe',
    sku: 'AP-CSE-16PRO',
    itemName: 'iPhone 16 Pro Clear Case with MagSafe',
    category: 'electronics',
    mallId: 'sandton_city',
    storeId: 'sc_istore',
    storeName: 'iStore Sandton City',
    stickerPriceZAR: 999,
    floorRatio: 0.82,
    imageUrl: 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=800&auto=format&fit=crop&q=80',
    description: 'Scratch-resistant polycarbonate coating optimized to prevent yellowing over time.',
    tag: 'Apple Original'
  },
  {
    id: 'sc_alexander_sneaker',
    sku: 'AM-SNK-001',
    itemName: 'Alexander McQueen Oversized Leather Sneaker',
    category: 'apparel',
    mallId: 'sandton_city',
    storeId: 'sc_alexander_mcqueen',
    storeName: 'Alexander McQueen',
    stickerPriceZAR: 9850,
    floorRatio: 0.88,
    imageUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&auto=format&fit=crop&q=80',
    description: 'Smooth white calfskin leather with contrasting black suede heel counter and stamped logo.',
    tag: 'Diamond Walk Luxury'
  },
  {
    id: 'sc_arc_serum',
    sku: 'ARC-EST-050',
    itemName: 'Advanced Night Repair Synchronized Recovery Complex 50ml',
    category: 'beauty',
    mallId: 'sandton_city',
    storeId: 'sc_sephora_arc',
    storeName: 'ARC Beauty Store',
    stickerPriceZAR: 1850,
    floorRatio: 0.85,
    imageUrl: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&auto=format&fit=crop&q=80',
    description: 'Deep and fast anti-aging night serum that significantly reduces lines and boosts radiance.',
    tag: 'Beauty Icon'
  },

  // =========================================================================
  // FOURWAYS MALL PRODUCTS
  // =========================================================================
  {
    id: 'fw_zara_denim',
    sku: 'ZA-DNM-8820',
    itemName: 'Wide-Leg Selvedge Denim Trousers',
    category: 'apparel',
    mallId: 'fourways_mall',
    storeId: 'fw_zara',
    storeName: 'Zara Fourways',
    stickerPriceZAR: 899,
    floorRatio: 0.79,
    imageUrl: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800&auto=format&fit=crop&q=80',
    description: 'Vintage stone-washed Japanese selvedge finish with a relaxed high-rise silhouette.',
    tag: 'Fourways Bestseller'
  },
  {
    id: 'fw_nike_pegasus',
    sku: 'NK-PGS-4100',
    itemName: 'Nike Air Zoom Pegasus 41 Road Shoes',
    category: 'footwear',
    mallId: 'fourways_mall',
    storeId: 'fw_nike',
    storeName: 'Nike Live Fourways',
    stickerPriceZAR: 2499,
    floorRatio: 0.81,
    imageUrl: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&auto=format&fit=crop&q=80',
    description: 'Responsive ReactX foam cushioning with dual Air Zoom units for energetic runs.',
    tag: 'Just Arrived'
  },
  {
    id: 'fw_nike_drifit',
    sku: 'NK-DFT-7721',
    itemName: 'Nike Dri-FIT UV Active Training Crew',
    category: 'footwear',
    mallId: 'fourways_mall',
    storeId: 'fw_nike',
    storeName: 'Nike Live Fourways',
    stickerPriceZAR: 699,
    floorRatio: 0.80,
    imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80',
    description: 'Sweat-wicking heathered poly fabric with anti-chafing flatlock seams and UPF 40 protection.',
    tag: 'Athletics'
  },
  {
    id: 'fw_cottonon_jacket',
    sku: 'CO-JKT-1022',
    itemName: 'Rodeo Relaxed Denim Trucker Jacket',
    category: 'apparel',
    mallId: 'fourways_mall',
    storeId: 'fw_cottonon',
    storeName: 'Cotton On Fourways',
    stickerPriceZAR: 799,
    floorRatio: 0.80,
    imageUrl: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=800&auto=format&fit=crop&q=80',
    description: 'Classic oversized western trucker cut from durable 100% organic cotton rigid denim.',
    tag: 'Casual Cool'
  },
  {
    id: 'fw_dischem_serum',
    sku: 'DC-VIT-C30',
    itemName: 'Skin Republic 10% Vitamin C Serum 30ml',
    category: 'beauty',
    mallId: 'fourways_mall',
    storeId: 'fw_dischem',
    storeName: 'Dis-Chem Pharmacy',
    stickerPriceZAR: 349,
    floorRatio: 0.82,
    imageUrl: 'https://images.unsplash.com/photo-1608248597359-bb0d4fb17585?w=800&auto=format&fit=crop&q=80',
    description: 'Fades dark spots, brightens dull skin and protects against environmental stress.',
    tag: 'Dermatologist Choice'
  },
  {
    id: 'fw_dischem_spf',
    sku: 'DC-SPF-50MIN',
    itemName: 'Bioderma Photoderm Max SPF 50+ Sun Fluid',
    category: 'beauty',
    mallId: 'fourways_mall',
    storeId: 'fw_dischem',
    storeName: 'Dis-Chem Pharmacy',
    stickerPriceZAR: 299,
    floorRatio: 0.84,
    imageUrl: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=800&auto=format&fit=crop&q=80',
    description: 'Ultra-light dry-touch non-greasy water-resistant sunscreen for sensitive skin.',
    tag: 'Summer Essential'
  },
  {
    id: 'fw_istore_charger',
    sku: 'AP-PWR-35W',
    itemName: 'Apple 35W Dual USB-C Port Compact Power Adapter',
    category: 'electronics',
    mallId: 'fourways_mall',
    storeId: 'fw_istore',
    storeName: 'iStore Apple Reseller',
    stickerPriceZAR: 1199,
    floorRatio: 0.85,
    imageUrl: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800&auto=format&fit=crop&q=80',
    description: 'Charges two devices simultaneously at home, in the office or on the move.',
    tag: 'Fast Charging'
  },
  {
    id: 'fw_checkers_steak',
    sku: 'CK-RIB-0800',
    itemName: 'Forage & Feast 28-Day Dry-Aged Ribeye Steak 500g',
    category: 'groceries',
    mallId: 'fourways_mall',
    storeId: 'fw_checkers',
    storeName: 'Checkers Hyper Fourways',
    stickerPriceZAR: 219,
    floorRatio: 0.85,
    imageUrl: 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?w=800&auto=format&fit=crop&q=80',
    description: 'Prime South African grain-fed beef aged on the bone for rich, butter-knife tenderness.',
    tag: 'Butchery Prime'
  },

  // =========================================================================
  // NORTHGATE SHOPPING CENTRE PRODUCTS
  // =========================================================================
  {
    id: 'ng_picknpay_salmon',
    sku: 'PNP-SLM-0400',
    itemName: 'Fresh Norwegian Atlantic Salmon Portions 400g',
    category: 'groceries',
    mallId: 'northgate',
    storeId: 'ng_picknpay',
    storeName: 'Pick n Pay Hyper Northgate',
    stickerPriceZAR: 229,
    floorRatio: 0.85,
    imageUrl: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&auto=format&fit=crop&q=80',
    description: 'Responsibly farmed, omega-rich salmon fillets ready for pan-searing or baking.',
    tag: 'Fishmonger Fresh'
  },
  {
    id: 'ng_sportscene_nike',
    sku: 'SS-AF1-007',
    itemName: 'Nike Air Force 1 \'07 Triple White',
    category: 'footwear',
    mallId: 'northgate',
    storeId: 'ng_sportscene',
    storeName: 'Sportscene Northgate',
    stickerPriceZAR: 2199,
    floorRatio: 0.83,
    imageUrl: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&auto=format&fit=crop&q=80',
    description: 'The basketball OG sneaker with crisp stitched overlays and full-length encapsulated Air cushioning.',
    tag: 'Street Legend'
  },
  {
    id: 'ng_edgars_dress',
    sku: 'ED-DRS-3310',
    itemName: 'Tiered Floral Midi Summer Dress',
    category: 'apparel',
    mallId: 'northgate',
    storeId: 'ng_edgars',
    storeName: 'Edgars Department Store',
    stickerPriceZAR: 699,
    floorRatio: 0.78,
    imageUrl: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&auto=format&fit=crop&q=80',
    description: 'Soft lightweight georgette dress with gentle tiered skirt and flattering cinched waistline.',
    tag: 'Spring Collection'
  },
  {
    id: 'ng_cottonon_cargo',
    sku: 'CO-CRG-2280',
    itemName: 'Utility Relaxed Fit Cargo Pants',
    category: 'apparel',
    mallId: 'northgate',
    storeId: 'ng_cottonon',
    storeName: 'Cotton On Northgate',
    stickerPriceZAR: 599,
    floorRatio: 0.80,
    imageUrl: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800&auto=format&fit=crop&q=80',
    description: 'Sturdy washed cotton twill with deep bellow cargo pockets and adjustable ankle ties.',
    tag: 'Urban Essential'
  },
  {
    id: 'ng_dischem_collagen',
    sku: 'DC-COL-0350',
    itemName: 'The Harvest Table Pure Hydrolysed Collagen Granules 350g',
    category: 'beauty',
    mallId: 'northgate',
    storeId: 'ng_dischem',
    storeName: 'Dis-Chem Pharmacy',
    stickerPriceZAR: 489,
    floorRatio: 0.84,
    imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&auto=format&fit=crop&q=80',
    description: '100% pure bovine collagen peptides to support glowing skin, joint health, and hair growth.',
    tag: 'Health & Glow'
  },
  {
    id: 'ng_crazy_headphones',
    sku: 'CZ-HP-550',
    itemName: 'Wireless Bluetooth Over-Ear Active Bass Headphones',
    category: 'electronics',
    mallId: 'northgate',
    storeId: 'ng_crazy_store',
    storeName: 'The Crazy Store',
    stickerPriceZAR: 399,
    floorRatio: 0.78,
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
    description: 'Deep dynamic sound, 20-hour battery life, built-in mic, and foldable cushion earcups.',
    tag: 'Crazy Value'
  },

  // =========================================================================
  // BEL AIR SHOPPING CENTRE PRODUCTS
  // =========================================================================
  {
    id: 'ba_woolworths_rotisserie',
    sku: 'WW-ROT-0120',
    itemName: 'Free-Range Herb Roasted Rotisserie Chicken',
    category: 'groceries',
    mallId: 'bel_air',
    storeId: 'ba_woolworths',
    storeName: 'Woolworths Food & Café',
    stickerPriceZAR: 159,
    floorRatio: 0.88,
    imageUrl: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=800&auto=format&fit=crop&q=80',
    description: 'Succulent grain-fed whole roast chicken basted in rosemary and sage butter.',
    tag: 'Hot & Ready to Eat'
  },
  {
    id: 'ba_clicks_hyaluronic',
    sku: 'CL-HYA-050',
    itemName: 'Neutrogena Hydro Boost Water Gel 50ml',
    category: 'beauty',
    mallId: 'bel_air',
    storeId: 'ba_clicks',
    storeName: 'Clicks Pharmacy',
    stickerPriceZAR: 229,
    floorRatio: 0.82,
    imageUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop&q=80',
    description: 'Instantly quenches dry skin and keeps it smooth, supple and hydrated for up to 72 hours.',
    tag: 'Clicks 3-for-2'
  },
  {
    id: 'ba_uniq_linen_shirt',
    sku: 'UQ-SHR-1002',
    itemName: 'UNIQ Pure French Linen Resort Shirt',
    category: 'apparel',
    mallId: 'bel_air',
    storeId: 'ba_uniq',
    storeName: 'UNIQ Clothing by Checkers',
    stickerPriceZAR: 449,
    floorRatio: 0.80,
    imageUrl: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&auto=format&fit=crop&q=80',
    description: 'Naturally breathable garment-washed pure linen designed for effortless weekend comfort.',
    tag: 'New Store Special'
  },
  {
    id: 'ba_mrprice_sneaker',
    sku: 'MP-SNK-990',
    itemName: 'Retro Court Casual Low-Top Sneakers',
    category: 'footwear',
    mallId: 'bel_air',
    storeId: 'ba_mrprice',
    storeName: 'Mr Price Clothing',
    stickerPriceZAR: 299,
    floorRatio: 0.80,
    imageUrl: 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=800&auto=format&fit=crop&q=80',
    description: 'Clean minimalist white sneaker with cushioned insole and gum rubber grip tread.',
    tag: 'Everyday Deal'
  },
  {
    id: 'ba_spar_sourdough',
    sku: 'SP-BKR-004',
    itemName: 'Artisan Wood-Fired Stoneground Sourdough Loaf',
    category: 'groceries',
    mallId: 'bel_air',
    storeId: 'ba_spar',
    storeName: 'Spar Supermarket',
    stickerPriceZAR: 42,
    floorRatio: 0.85,
    imageUrl: 'https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?w=800&auto=format&fit=crop&q=80',
    description: 'Slow-fermented for 36 hours with a thick caramelized blistered crust and chewy crumb.',
    tag: 'Baked Fresh Today'
  },
  {
    id: 'ba_cellshack_charger',
    sku: 'CS-CHG-65W',
    itemName: 'Anker GaN 65W Triple-Port USB-C Rapid Fast Wall Charger',
    category: 'electronics',
    mallId: 'bel_air',
    storeId: 'ba_cellshack',
    storeName: 'Cell Shack & Tech',
    stickerPriceZAR: 799,
    floorRatio: 0.80,
    imageUrl: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800&auto=format&fit=crop&q=80',
    description: 'Gallium Nitride technology powers a laptop, phone, and tablet all at the same time.',
    tag: 'High Speed GaN'
  }
];

export const getProductsForMall = (mallId: string): CatalogProduct[] =>
  REAL_PRODUCTS.filter(p => p.mallId === mallId);

export const getProductsForStore = (storeId: string): CatalogProduct[] =>
  REAL_PRODUCTS.filter(p => p.storeId === storeId);
