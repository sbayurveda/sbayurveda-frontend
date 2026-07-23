// Deterministic (seeded by product id) "people viewed / purchased" stats so
// numbers stay stable across re-renders and page reloads instead of jumping
// around randomly, while still varying realistically per product.

function seededRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function hashId(id) {
  let hash = 0;
  for (const ch of String(id)) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return hash;
}

export function getSocialProof(productId) {
  const rand = seededRandom(hashId(productId) || 1);
  const viewsThisMonth = Math.round(60 + rand() * 540); // ~60-600
  const purchasesThisWeek = Math.round(3 + rand() * 37); // ~3-40
  return { viewsThisMonth, purchasesThisWeek };
}
