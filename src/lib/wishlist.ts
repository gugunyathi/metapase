import type { DealCategory, WishlistItem } from '../types/metapase';

export interface WishTarget {
  itemName: string;
  sku: string;
  category: DealCategory | string;
}

const MIN_KEYWORD_LENGTH = 3;

/** Every word that should count as a match for this wish, lower-cased. Words under three letters match too much, so they're dropped. */
export const wishKeywords = (wish: Pick<WishlistItem, 'query' | 'keywords'>): string[] => {
  const words = [wish.query, ...(wish.keywords ?? [])].map(word => word.trim().toLowerCase()).filter(word => word.length >= MIN_KEYWORD_LENGTH);
  return [...new Set(words)];
};

/** True when a deal is something this wish is waiting for. Only an active wish can match. */
export const wishMatchesDeal = (wish: WishlistItem, target: WishTarget): boolean => {
  if (wish.status !== 'active') return false;
  const name = target.itemName.toLowerCase();
  const sku = target.sku.toLowerCase();
  const category = String(target.category).toLowerCase();
  return wishKeywords(wish).some(word => name.includes(word) || sku.includes(word) || category === word);
};

/** The most the shopper will pay for a wish. A wish with no usable price falls back to the general budget. */
export const wishBudget = (wish: WishlistItem, fallbackBudgetZAR: number): number =>
  Number.isFinite(wish.targetMaxPriceZAR) && wish.targetMaxPriceZAR > 0 ? wish.targetMaxPriceZAR : fallbackBudgetZAR;
