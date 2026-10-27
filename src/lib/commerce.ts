import { Deal, ItemSnapshot } from '../types/metapase';

export const snapshotOf = (deal: Deal): ItemSnapshot => ({
  storeId: deal.storeId,
  campaignId: deal.ad.campaignId,
  sku: deal.ad.sku,
  itemName: deal.ad.itemName,
  outletName: deal.location.outletName,
  category: deal.category,
  stickerPriceZAR: deal.ad.stickerPriceZAR
});

export const pickSnapshot = (item: ItemSnapshot): ItemSnapshot => ({
  storeId: item.storeId,
  campaignId: item.campaignId,
  sku: item.sku,
  itemName: item.itemName,
  outletName: item.outletName,
  category: item.category,
  stickerPriceZAR: item.stickerPriceZAR
});

export const makeLocalId = (prefix: string): string => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
