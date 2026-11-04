import { VIRTUAL_STORES } from '../config/malls';

export interface ShopifyProductImage {
  src: string;
}

export interface ShopifyVariant {
  id: number;
  title: string;
  price: string;
  sku: string;
  inventory_quantity: number;
}

export interface ShopifyPublicProduct {
  id: number;
  title: string;
  handle: string;
  body_html: string;
  images: ShopifyProductImage[];
  variants: ShopifyVariant[];
}

export interface ShopifyVirtualItem {
  id: string;
  sku: string;
  name: string;
  itemName: string;
  category: 'apparel' | 'footwear' | 'groceries' | 'electronics' | 'beauty';
  stickerPriceZAR: number;
  floorPriceZAR: number;
  floorRatio: number;
  imageUrl: string;
  outletId: string;
  storeId: string;
  storeName: string;
  mallId: string;
  mallName: string;
  isShopifyVirtual: boolean;
  shopifyDomain: string;
  shopifyInventoryId: number;
  stockCount: number;
  fulfillmentMethod: string;
  description: string;
  tag: string;
}

// Simulates live parsing of public unauthenticated Shopify product endpoint formats (/products.json)
export const MOCK_SHOPIFY_ENDPOINTS: Record<string, ShopifyPublicProduct[]> = {
  "://myshopify.com": [
    {
      id: 881001,
      title: "Apex Lifting Hoodie",
      handle: "apex-lifting-hoodie",
      body_html: "High-performance hybrid workout wear tailored for high-intensity training.",
      images: [{ src: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop&q=80" }],
      variants: [{ id: 9911, title: "Black / Large", price: "899.00", sku: "GS-APX-HD-BL", inventory_quantity: 14 }]
    },
    {
      id: 881002,
      title: "Elite Streetwear Trucker Cap",
      handle: "elite-streetwear-cap",
      body_html: "Limited drop premium custom headwear with high crown framing.",
      images: [{ src: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=800&auto=format&fit=crop&q=80" }],
      variants: [{ id: 9912, title: "OSFA / Gold", price: "450.00", sku: "CK-ELT-CP-GD", inventory_quantity: 8 }]
    }
  ],
  "gymshark.myshopify.com": [
    {
      id: 881001,
      title: "Apex Lifting Hoodie",
      handle: "apex-lifting-hoodie",
      body_html: "High-performance hybrid workout wear tailored for high-intensity training.",
      images: [{ src: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop&q=80" }],
      variants: [{ id: 9911, title: "Black / Large", price: "899.00", sku: "GS-APX-HD-BL", inventory_quantity: 14 }]
    },
    {
      id: 881003,
      title: "Seamless Training Ribbed Leggings",
      handle: "seamless-training-leggings",
      body_html: "High-waist compressive fit gym leggings engineered for full range of motion.",
      images: [{ src: "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=800&auto=format&fit=crop&q=80" }],
      variants: [{ id: 9913, title: "Onyx Grey / Medium", price: "749.00", sku: "GS-SML-LEG-GY", inventory_quantity: 20 }]
    }
  ],
  "culturekings.myshopify.com": [
    {
      id: 881002,
      title: "Elite Streetwear Trucker Cap",
      handle: "elite-streetwear-cap",
      body_html: "Limited drop premium custom headwear with high crown framing.",
      images: [{ src: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=800&auto=format&fit=crop&q=80" }],
      variants: [{ id: 9912, title: "OSFA / Gold", price: "450.00", sku: "CK-ELT-CP-GD", inventory_quantity: 8 }]
    },
    {
      id: 881004,
      title: "Vintage Heavyweight Graphic Oversized Tee",
      handle: "vintage-oversized-graphic-tee",
      body_html: "Acid wash heavy cotton boxy fit graphic tee inspired by 90s streetwear.",
      images: [{ src: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80" }],
      variants: [{ id: 9914, title: "Washed Slate / XL", price: "599.00", sku: "CK-VTG-TEE-SL", inventory_quantity: 11 }]
    }
  ]
};

// Internal reactive memory store for simulated runtime inventory synchronization
let cachedVirtualProducts: ShopifyVirtualItem[] | null = null;

/**
 * Transforms Shopify CDN payload into internal MetaPase Product schemas 
 * with structural system configurations (Sticker price and auto-calculated floor margins)
 */
export function getShopifyVirtualCatalogue(): ShopifyVirtualItem[] {
  if (cachedVirtualProducts && cachedVirtualProducts.length > 0) {
    return cachedVirtualProducts;
  }

  const products: ShopifyVirtualItem[] = [];
  
  VIRTUAL_STORES.forEach(store => {
    const rawProducts = MOCK_SHOPIFY_ENDPOINTS[store.shopifyDomain] || MOCK_SHOPIFY_ENDPOINTS["://myshopify.com"] || [];
    rawProducts.forEach(sp => {
      const mainVariant = sp.variants[0];
      const baselinePrice = parseFloat(mainVariant.price);
      
      products.push({
        id: `v_shopify_${mainVariant.sku.toLowerCase()}`,
        sku: mainVariant.sku,
        name: sp.title,
        itemName: sp.title,
        category: (store.category as any) || 'apparel',
        stickerPriceZAR: baselinePrice,
        floorPriceZAR: Math.round(baselinePrice * 0.75), // Enforces strict 75% code guardrail margin for Muse negotiation
        floorRatio: 0.75,
        imageUrl: sp.images[0]?.src || '',
        outletId: store.id,
        storeId: store.id,
        storeName: store.name,
        mallId: store.mallId,
        mallName: (store as any).mallName || store.mallId,
        isShopifyVirtual: true,
        shopifyDomain: store.shopifyDomain,
        shopifyInventoryId: mainVariant.id,
        stockCount: mainVariant.inventory_quantity,
        fulfillmentMethod: "DIGITAL_DELIVERY_RAILS",
        description: sp.body_html,
        tag: "Virtual Shopify Presence"
      });
    });
  });
  
  cachedVirtualProducts = products;
  return products;
}

/**
 * Emulates localized Shopify inventory webhook decrement upon successful checkout
 */
export const handleVirtualShopifySettlement = (sku: string, outletId?: string, quantityBought = 1) => {
  const virtualCatalogue = getShopifyVirtualCatalogue();
  const matchedItem = virtualCatalogue.find(p => p.sku === sku && (!outletId || p.outletId === outletId || p.storeId === outletId));

  if (matchedItem && matchedItem.isShopifyVirtual) {
    // Decrement localized Shopify virtual inventory state mimicking webhook behavior
    matchedItem.stockCount = Math.max(0, matchedItem.stockCount - quantityBought);
    
    console.log(`[Shopify Webhook Simulation Broadcast]: Inventory synchronized for SKU: ${sku}. Units remaining: ${matchedItem.stockCount}`);
    
    return {
      fulfillmentMethod: "DIGITAL_DELIVERY_RAILS",
      trackingMessage: "Dispatched from Shopify Hub. Deliverable right to your home address or tracking voucher generated for regional pick up hubs.",
      remainingUnits: matchedItem.stockCount,
      sku: matchedItem.sku,
      outletId: matchedItem.outletId
    };
  }
  return null;
};
