// Small Levenshtein-distance based fuzzy matcher so common misspellings
// ("chawanprash", "immunit", "shilajeet") still surface the right product.

function levenshtein(a, b) {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev = new Array(n + 1);
  let curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

function maxDistanceFor(len) {
  if (len <= 3) return 0;
  if (len <= 5) return 1;
  if (len <= 8) return 2;
  return 3;
}

// Returns a match score for a single query word against a single token:
// 3 = exact, 2 = prefix/substring, 1 = fuzzy (within edit-distance budget), 0 = no match
export function wordScore(queryWord, token) {
  if (!queryWord || !token) return 0;
  if (token === queryWord) return 3;
  if (token.startsWith(queryWord) || token.includes(queryWord)) return 2;
  const budget = maxDistanceFor(queryWord.length);
  if (budget > 0 && levenshtein(queryWord, token) <= budget) return 1;
  return 0;
}

// Scores a full query string against a list of searchable tokens (already lowercased).
// Every query word must match at least one token for the item to count as a hit.
export function fuzzyScore(query, tokens) {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;

  let total = 0;
  for (const word of words) {
    let best = 0;
    for (const token of tokens) {
      const s = wordScore(word, token);
      if (s > best) best = s;
    }
    if (best === 0) return 0; // every word needs some match
    total += best;
  }
  return total;
}
