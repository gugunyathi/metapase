/** Merchant suggestions that need no network. Muse improves on them; this is also what runs when Muse is unavailable. */

export interface InsightInput {
  storeName: string;
  totalSales: number;
  grossRevenueZAR: number;
  inventory: Array<{ name: string; stock: number; basePriceZAR: number; floorPriceZAR: number }>;
}

export interface Insight {
  title: string;
  action: string;
  rationale: string;
}

export const ruleInsights = (input: InsightInput): Insight[] => {
  const byStock = [...input.inventory].sort((a, b) => b.stock - a.stock);
  const insights: Insight[] = [];
  const heavy = byStock[0];
  if (heavy && heavy.stock > 0) {
    insights.push({
      title: `Move ${heavy.name}`,
      action: `Offer a deeper discount on ${heavy.name}.`,
      rationale: `${heavy.stock} units in stock, the most in the store.`
    });
  }
  if (input.totalSales === 0) {
    insights.push({ title: 'No sales yet', action: 'Lower your floor prices slightly so the shopper agent can close deals.', rationale: 'Agents only buy when the store agrees to a price within their budget.' });
  }
  return insights.slice(0, 3);
};

