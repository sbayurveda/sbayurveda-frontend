import { fuzzyScore } from "./fuzzySearch";

// Extra searchable words per product beyond name/brand/category, so common
// misspellings and synonyms ("hairfall", "sugar", "stamina") still resolve.
const SEARCH_SYNONYMS = {
  immunity: ["immune", "immunity", "resistance"],
  "hair-care": ["hair", "hairfall", "skin", "haircare", "dandruff"],
  diabetes: ["diabetes", "sugar", "blood sugar", "diabetic"],
  "joint-pain": ["joint", "pain", "arthritis", "backpain", "knee"],
  "mens-health": ["men", "stamina", "vigor", "testosterone", "vitality"],
  "womens-health": ["women", "pcod", "periods", "menstrual", "hormonal"],
  digestive: ["digestion", "stomach", "acidity", "gas", "bloating"],
  general: ["wellness", "stress", "sleep", "energy"],
};

function productTokens(p) {
  const nameWords = p.name.toLowerCase().split(/[\s()]+/).filter(Boolean);
  const synonymWords = p.healthConcerns.flatMap((hc) => SEARCH_SYNONYMS[hc] || []);
  return [
    ...nameWords,
    p.name.toLowerCase(),
    p.brand.toLowerCase(),
    p.category.toLowerCase(),
    ...p.healthConcerns.map((hc) => hc.replace("-", " ")),
    ...synonymWords,
  ];
}

// Typo-tolerant search over an arbitrary product list (static or live).
export function searchProducts(products, query) {
  const q = query.trim();
  if (!q) return [];

  const scored = products
    .map((p) => ({ product: p, score: fuzzyScore(q, productTokens(p)) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.map((r) => r.product);
}
