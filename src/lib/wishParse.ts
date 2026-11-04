import type { DealCategory } from '../types/metapase';

/** Plain-language wish parsing that needs no network. Muse improves on it; this is also what runs when Muse is unavailable. */

const oneLine = (value: unknown, max: number): string => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

export const CATEGORIES: readonly DealCategory[] = ['apparel', 'footwear', 'groceries', 'electronics', 'beauty'];
export type MuseCategory = DealCategory;

export interface ParsedIntent {
  query: string;
  keywords: string[];
  category: MuseCategory | null;
  maxBudgetZAR: number | null;
  autoBuy: boolean;
  engine: 'muse' | 'rules';
}

const CATEGORY_WORDS: Record<MuseCategory, string[]> = {
  apparel: ['blazer', 'jacket', 'shirt', 'tee', 'dress', 'jeans', 'denim', 'trousers', 'cardigan', 'coat', 'suit', 'wedding', 'outfit', 'clothes'],
  footwear: ['shoe', 'shoes', 'sneaker', 'sneakers', 'running', 'boots', 'trainers', 'socks', 'cap'],
  groceries: ['coffee', 'chocolate', 'cheese', 'chicken', 'food', 'snack', 'platter', 'groceries'],
  electronics: ['phone', 'iphone', 'airpods', 'earbuds', 'headphones', 'charger', 'cable', 'case', 'laptop'],
  beauty: ['serum', 'skincare', 'sunscreen', 'lip', 'collagen', 'makeup', 'vitamin', 'perfume']
};

const STOP_WORDS = new Set(['i', 'need', 'want', 'looking', 'for', 'a', 'an', 'the', 'under', 'below', 'less', 'than', 'max', 'upto', 'up', 'to', 'buy', 'it', 'automatically', 'auto', 'please', 'something', 'some', 'my', 'and', 'with', 'that', 'is', 'at', 'least', 'off', 'rand', 'for', 'me']);

export const parseBudget = (text: string): number | null => {
  const match = text.match(/(?:under|below|max(?:imum)?|up to|less than|within|budget(?: of)?)\s*r?\s*(\d[\d\s,]*)|r\s?(\d[\d\s,]*)/i);
  const raw = match?.[1] ?? match?.[2];
  if (!raw) return null;
  const value = Number(raw.replace(/[\s,]/g, ''));
  return Number.isFinite(value) && value >= 50 && value <= 100000 ? value : null;
};

export const ruleParseIntent = (text: string): ParsedIntent => {
  const lower = text.toLowerCase();
  const words = lower.replace(/r?\s?\d[\d\s,]*/g, ' ').split(/[^a-z]+/).filter(word => word.length >= 3 && !STOP_WORDS.has(word));
  let category: MuseCategory | null = null;
  for (const name of CATEGORIES) {
    if (CATEGORY_WORDS[name].some(word => words.includes(word))) {
      category = name;
      break;
    }
  }
  const keywords = [...new Set(words)].slice(0, 5);
  return {
    query: keywords[0] ?? oneLine(text, 40),
    keywords,
    category,
    maxBudgetZAR: parseBudget(text),
    autoBuy: /buy (it )?(automatically|for me|straight away)|auto[- ]?buy/i.test(text),
    engine: 'rules'
  };
};

