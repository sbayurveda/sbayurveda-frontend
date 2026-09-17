// Keyword-enriched product naming for search results.
//
// Recovered from a hand-edit made directly to the deployed bundle on 15 Sep.
// That edit was never in source, so the next clean deploy would have silently
// undone it; this is the same behaviour, in version control, where it survives.
//
// A bare product name ("Matsya Tailam Soft Gel Capsules") tells a search engine
// nothing about what the product is for. Appending the concern it treats gives
// the title a term people actually search, without inventing a claim: the
// category is derived from the product's own health-concern tags and name.

const CATEGORIES = [
  { label: "Digestive Care",   test: /pachak|digest|churna|hingwastak|triphala|constipat|acidity|gas/ },
  { label: "Immunity Support", test: /immun|chyawanprash|giloy|tulsi|amla|guduchi/ },
  { label: "Skin & Hair Care", test: /skin|hair|kesh|twak|neem|bhringraj|amla oil|kumkumadi/ },
  { label: "Men's Wellness",   test: /shilajit|ashwagandha|vigour|vigor|stamina|men|testo|shukra/ },
  { label: "Women's Health",   test: /stree|shatavari|ashoka|lodhra|women|pcod|pcos|uterine/ },
  { label: "Joint & Nerve Care", test: /rasarajeshwar|vatakam|mahayograj|yograj|joint|nerve|vata/ },
  { label: "Diabetes Care",    test: /madhumeha|diabetes|sugar/ },
];

// Falls back to the broadest true statement rather than guessing a concern.
const DEFAULT_CATEGORY = "Ayurvedic Medicine";

export function seoCategory(product) {
  if (!product) return DEFAULT_CATEGORY;

  // The concern tags are what someone deliberately recorded about this product,
  // so they decide first. Matching the name in the same pass lets an incidental
  // word outrank them — a diabetes product called "... Churna" came out as
  // Digestive Care, because "churna" is a preparation, not a purpose.
  const tagged = [product.category, ...(Array.isArray(product.healthConcerns) ? product.healthConcerns : [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const byTag = CATEGORIES.find((c) => c.test.test(tagged));
  if (byTag) return byTag.label;

  const named = String(product.name || "").toLowerCase();
  const byName = CATEGORIES.find((c) => c.test.test(named));
  return byName ? byName.label : DEFAULT_CATEGORY;
}

// "Matsya Tailam Soft Gel Capsules - Men's Wellness"
export function seoName(product) {
  if (!product?.name) return "";
  return `${product.name} - ${seoCategory(product)}`;
}
