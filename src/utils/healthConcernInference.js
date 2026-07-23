// Best-effort inference of our health-concern taxonomy (immunity, hair-care,
// diabetes, joint-pain, mens-health, womens-health, digestive, general) from a
// WooCommerce product's name/description/WooCommerce-category text.
//
// The real catalog mostly lacks per-concern categorization in WooCommerce
// (580 products, ~95% dumped in one generic "Ayurvedic Wellness" bucket), so
// this keyword match is a stopgap — accuracy will be imperfect for
// Sanskrit/formulation names that don't contain obvious English keywords.
// Products default to "general" when nothing matches.

const KEYWORDS = {
  immunity: [
    "immun", "chyawanprash", "chyavanprash", "giloy", "guduchi", "tulsi",
    "kadha", "kwath", "amla", "amalaki", "rasayana", "resistance", "vati",
  ],
  "hair-care": [
    "hair", "bhringraj", "kesh", "scalp", "dandruff", "skin", "face",
    "soap", "wash", "multani", "aloe vera", "complexion", "wrinkle", "tan",
  ],
  diabetes: [
    "diabet", "madhu", "sugar", "karela", "jamun", "gluco", "madhumeha",
  ],
  "joint-pain": [
    "joint", "pain relief", "arthrit", "sandhi", "nirgundi", "mahanarayan",
    "backache", "back pain", "knee", "rheumat", "gout", "sciatica",
    "muscular pain",
  ],
  "mens-health": [
    "musli", "shilajit", "confido", "stamina", "vigor", "vigour",
    "testosterone", "spermatogenesis", "vajikaran", "men's",
  ],
  "womens-health": [
    "shatavari", "evecare", "menstru", "pcod", "pcos", "ashoka", "lodhra",
    "uterine", "leucorrhoea", "women", "gynec",
  ],
  digestive: [
    "digest", "churna", "hing", "triphala", "pudin", "ajwain", "acidity",
    "gas relief", "stomach", "kashayam", "appetite", "constipation",
    "laxative", "carminative",
  ],
};

function stripHtml(html = "") {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function inferHealthConcerns(name, description = "", shortDescription = "") {
  const text = `${name} ${stripHtml(shortDescription)} ${stripHtml(description)}`.toLowerCase();
  const matches = [];

  for (const [concern, keywords] of Object.entries(KEYWORDS)) {
    if (keywords.some((kw) => text.includes(kw))) {
      matches.push(concern);
    }
  }

  return matches.length > 0 ? matches : ["general"];
}
