// Dummy product database. Replace `image`/`images` with real product photography
// before going live — these are auto-generated packaging illustrations for UAT.
import { productImages } from "../utils/productImage";
import { fuzzyScore } from "../utils/fuzzySearch";

const raw = [
  // ---------------- IMMUNITY ----------------
  {
    name: "Chyawanprash (1kg)",
    brand: "Dabur",
    category: "immunity",
    healthConcerns: ["immunity", "general"],
    mrp: 399,
    marketPrice: 360,
    price: 299,
    rating: 4.6,
    reviews: 12450,
    packSize: "1 kg Jar",
    isBestseller: true,
    isFlashSale: true,
    description:
      "Classic Ayurvedic immunity booster with 40+ herbs including Amla, Ashwagandha and Giloy. Daily use supports respiratory health and overall vitality.",
  },
  {
    name: "Sona Chandi Chyawanprash (1kg)",
    brand: "Baidyanath",
    category: "immunity",
    healthConcerns: ["immunity"],
    mrp: 520,
    marketPrice: 480,
    price: 399,
    rating: 4.5,
    reviews: 3210,
    packSize: "1 kg Jar",
    description:
      "Premium chyawanprash enriched with gold and silver bhasma for enhanced immunity and strength, made using traditional Baidyanath formulations.",
  },
  {
    name: "Giloy Ghanvati Tablets (60 tabs)",
    brand: "Patanjali",
    category: "immunity",
    healthConcerns: ["immunity"],
    mrp: 120,
    marketPrice: 110,
    price: 89,
    rating: 4.3,
    reviews: 5670,
    packSize: "60 Tablets",
    description:
      "Pure Giloy extract tablets that help build natural immunity, manage fever and support liver function.",
  },
  {
    name: "Immunity Booster Kadha Mix (200g)",
    brand: "SB Ayurveda",
    category: "immunity",
    healthConcerns: ["immunity"],
    mrp: 249,
    marketPrice: 220,
    price: 179,
    rating: 4.7,
    reviews: 890,
    packSize: "200g Pouch",
    isBestseller: true,
    description:
      "In-house blend of Tulsi, Ginger, Cinnamon and Black Pepper — just boil and drink for daily immunity support.",
  },
  {
    name: "Amla Juice (1L)",
    brand: "Zandu",
    category: "immunity",
    healthConcerns: ["immunity", "digestive"],
    mrp: 210,
    marketPrice: 195,
    price: 159,
    rating: 4.4,
    reviews: 2140,
    packSize: "1 Litre",
    description:
      "Cold-pressed Amla juice rich in Vitamin C, supports immunity, digestion and healthy skin.",
  },

  // ---------------- HAIR CARE / SKIN ----------------
  {
    name: "Bhringraj Hair Oil (200ml)",
    brand: "Dabur",
    category: "hair-care",
    healthConcerns: ["hair-care"],
    mrp: 220,
    marketPrice: 199,
    price: 149,
    rating: 4.5,
    reviews: 8320,
    packSize: "200 ml Bottle",
    isBestseller: true,
    description:
      "Nourishing hair oil with Bhringraj and Amla to reduce hair fall, strengthen roots and add natural shine.",
  },
  {
    name: "Kesh King Anti Hairfall Oil (200ml)",
    brand: "Baidyanath",
    category: "hair-care",
    healthConcerns: ["hair-care"],
    mrp: 260,
    marketPrice: 240,
    price: 189,
    rating: 4.3,
    reviews: 4110,
    packSize: "200 ml Bottle",
    isFlashSale: true,
    description:
      "Ayurvedic proprietary medicine oil formulated with 21 herbs to control hair fall and dandruff.",
  },
  {
    name: "Neem Face Wash (150ml)",
    brand: "Himalaya",
    category: "hair-care",
    healthConcerns: ["hair-care"],
    mrp: 150,
    marketPrice: 140,
    price: 109,
    rating: 4.4,
    reviews: 9870,
    packSize: "150 ml Bottle",
    description:
      "Purifying neem and turmeric face wash that fights acne-causing bacteria and controls excess oil.",
  },
  {
    name: "Onion Hair Oil with Redensyl (200ml)",
    brand: "SB Ayurveda",
    category: "hair-care",
    healthConcerns: ["hair-care"],
    mrp: 349,
    marketPrice: 320,
    price: 249,
    rating: 4.6,
    reviews: 1560,
    packSize: "200 ml Bottle",
    isBestseller: true,
    description:
      "SB Ayurveda's in-house onion oil blend with Redensyl and 14 essential herbs for visibly reduced hair fall in 6 weeks.",
  },
  {
    name: "Aloe Vera Gel (300ml)",
    brand: "Patanjali",
    category: "hair-care",
    healthConcerns: ["hair-care"],
    mrp: 130,
    marketPrice: 120,
    price: 95,
    rating: 4.2,
    reviews: 6540,
    packSize: "300 ml Tub",
    description:
      "99% pure Aloe Vera gel for skin hydration, sunburn relief and as a lightweight hair styling gel.",
  },
  {
    name: "Multani Mitti Face Pack (200g)",
    brand: "Zandu",
    category: "hair-care",
    healthConcerns: ["hair-care"],
    mrp: 110,
    marketPrice: 99,
    price: 79,
    rating: 4.1,
    reviews: 2210,
    packSize: "200 g Pack",
    description:
      "Deep-cleansing Fuller's Earth face pack that removes excess oil and tightens pores naturally.",
  },

  // ---------------- MEN'S HEALTH ----------------
  {
    name: "Shilajit Resin (20g)",
    brand: "Baidyanath",
    category: "mens-health",
    healthConcerns: ["mens-health"],
    mrp: 599,
    marketPrice: 550,
    price: 449,
    rating: 4.5,
    reviews: 3450,
    packSize: "20 g Jar",
    isBestseller: true,
    description:
      "Purified Himalayan Shilajit resin rich in fulvic acid — supports stamina, energy and overall vitality.",
  },
  {
    name: "Ashwagandha Tablets (60 tabs)",
    brand: "Himalaya",
    category: "mens-health",
    healthConcerns: ["mens-health", "immunity"],
    mrp: 190,
    marketPrice: 175,
    price: 139,
    rating: 4.6,
    reviews: 11200,
    packSize: "60 Tablets",
    isFlashSale: true,
    description:
      "Clinically studied Ashwagandha root extract that helps reduce stress and supports healthy testosterone levels.",
  },
  {
    name: "Confido Tablets (60 tabs)",
    brand: "Himalaya",
    category: "mens-health",
    healthConcerns: ["mens-health"],
    mrp: 175,
    marketPrice: 160,
    price: 129,
    rating: 4.3,
    reviews: 5670,
    packSize: "60 Tablets",
    description:
      "Non-hormonal Ayurvedic formulation that helps manage stress-related performance concerns and boosts confidence.",
  },
  {
    name: "Musli Power Capsules (60 caps)",
    brand: "Zandu",
    category: "mens-health",
    healthConcerns: ["mens-health"],
    mrp: 650,
    marketPrice: 600,
    price: 499,
    rating: 4.2,
    reviews: 1980,
    packSize: "60 Capsules",
    description:
      "Safed Musli based formulation to support stamina, strength and vigor for an active lifestyle.",
  },
  {
    name: "SB Vigor+ Men's Wellness Capsules (30 caps)",
    brand: "SB Ayurveda",
    category: "mens-health",
    healthConcerns: ["mens-health"],
    mrp: 799,
    marketPrice: 720,
    price: 599,
    rating: 4.7,
    reviews: 640,
    packSize: "30 Capsules",
    isBestseller: true,
    description:
      "SB Ayurveda's proprietary blend of Shilajit, Ashwagandha, Safed Musli and Gokshura for stamina and vitality.",
  },

  // ---------------- WOMEN'S HEALTH ----------------
  {
    name: "Evecare Syrup (200ml)",
    brand: "Himalaya",
    category: "womens-health",
    healthConcerns: ["womens-health"],
    mrp: 180,
    marketPrice: 165,
    price: 129,
    rating: 4.4,
    reviews: 4320,
    packSize: "200 ml Bottle",
    description:
      "Ayurvedic uterine tonic that helps regularise menstrual cycles and eases discomfort naturally.",
  },
  {
    name: "Shatavari Powder (200g)",
    brand: "Baidyanath",
    category: "womens-health",
    healthConcerns: ["womens-health"],
    mrp: 210,
    marketPrice: 195,
    price: 159,
    rating: 4.5,
    reviews: 2870,
    packSize: "200 g Pack",
    isFlashSale: true,
    description:
      "Pure Shatavari root powder — traditionally used to support women's hormonal balance and reproductive health.",
  },
  {
    name: "M2 Tone Syrup (200ml)",
    brand: "Himalaya",
    category: "womens-health",
    healthConcerns: ["womens-health"],
    mrp: 165,
    marketPrice: 150,
    price: 119,
    rating: 4.3,
    reviews: 3980,
    packSize: "200 ml Bottle",
    description:
      "Helps manage irregular menstrual cycles and PCOD-related symptoms with a natural herbal formulation.",
  },
  {
    name: "SB Femicare Wellness Capsules (30 caps)",
    brand: "SB Ayurveda",
    category: "womens-health",
    healthConcerns: ["womens-health"],
    mrp: 549,
    marketPrice: 500,
    price: 429,
    rating: 4.6,
    reviews: 410,
    packSize: "30 Capsules",
    isBestseller: true,
    description:
      "In-house formulation with Shatavari, Ashoka and Lodhra to support hormonal balance and overall wellness.",
  },

  // ---------------- DIGESTIVE HEALTH ----------------
  {
    name: "Hingvastak Churna (100g)",
    brand: "Baidyanath",
    category: "digestive",
    healthConcerns: ["digestive"],
    mrp: 90,
    marketPrice: 82,
    price: 65,
    rating: 4.4,
    reviews: 3120,
    packSize: "100 g Pack",
    description:
      "Classic digestive churna with Hing (asafoetida) that relieves bloating, gas and indigestion.",
  },
  {
    name: "Triphala Tablets (120 tabs)",
    brand: "Himalaya",
    category: "digestive",
    healthConcerns: ["digestive", "general"],
    mrp: 175,
    marketPrice: 160,
    price: 125,
    rating: 4.5,
    reviews: 7650,
    packSize: "120 Tablets",
    isBestseller: true,
    description:
      "Gentle daily detox and digestion support made from three fruits — Amalaki, Bibhitaki and Haritaki.",
  },
  {
    name: "Pudin Hara Pearls (10 caps)",
    brand: "Dabur",
    category: "digestive",
    healthConcerns: ["digestive"],
    mrp: 45,
    marketPrice: 42,
    price: 32,
    rating: 4.3,
    reviews: 9430,
    packSize: "10 Capsules",
    isFlashSale: true,
    description:
      "Fast-acting mint pearls for instant relief from acidity, gas and stomach discomfort.",
  },
  {
    name: "Ajwain Churna (100g)",
    brand: "Patanjali",
    category: "digestive",
    healthConcerns: ["digestive"],
    mrp: 60,
    marketPrice: 55,
    price: 42,
    rating: 4.1,
    reviews: 1870,
    packSize: "100 g Pack",
    description:
      "Carom seed powder blend that eases indigestion, bloating and supports healthy metabolism.",
  },
  {
    name: "SB Digecare Churna (150g)",
    brand: "SB Ayurveda",
    category: "digestive",
    healthConcerns: ["digestive"],
    mrp: 199,
    marketPrice: 180,
    price: 139,
    rating: 4.6,
    reviews: 520,
    packSize: "150 g Pack",
    description:
      "SB Ayurveda's proprietary churna blend of Ajwain, Jeera, Saunf and Hing for after-meal digestive comfort.",
  },

  // ---------------- JOINT PAIN ----------------
  {
    name: "Mahanarayan Oil (200ml)",
    brand: "Baidyanath",
    category: "joint-pain",
    healthConcerns: ["joint-pain"],
    mrp: 240,
    marketPrice: 220,
    price: 175,
    rating: 4.4,
    reviews: 2340,
    packSize: "200 ml Bottle",
    description:
      "Classical Ayurvedic massage oil that relieves joint and muscle pain, stiffness and improves mobility.",
  },
  {
    name: "Rumalaya Gel (30g)",
    brand: "Himalaya",
    category: "joint-pain",
    healthConcerns: ["joint-pain"],
    mrp: 140,
    marketPrice: 130,
    price: 99,
    rating: 4.5,
    reviews: 6120,
    packSize: "30 g Tube",
    isBestseller: true,
    description:
      "Fast-absorbing herbal gel with Vitex Negundo and Turmeric for quick relief from joint and muscular pain.",
  },
  {
    name: "Sanjivani Vati (60 tabs)",
    brand: "Zandu",
    category: "joint-pain",
    healthConcerns: ["joint-pain"],
    mrp: 130,
    marketPrice: 120,
    price: 95,
    rating: 4.2,
    reviews: 1560,
    packSize: "60 Tablets",
    description:
      "Traditional formulation that helps manage joint pain, arthritis discomfort and supports mobility.",
  },
  {
    name: "SB Joint Care Oil (200ml)",
    brand: "SB Ayurveda",
    category: "joint-pain",
    healthConcerns: ["joint-pain"],
    mrp: 299,
    marketPrice: 270,
    price: 219,
    rating: 4.7,
    reviews: 380,
    packSize: "200 ml Bottle",
    isFlashSale: true,
    description:
      "Warming massage oil with Mahanarayan, Nirgundi and Eucalyptus for everyday joint and back pain relief.",
  },

  // ---------------- DIABETES CARE ----------------
  {
    name: "Madhunashini Vati (120 tabs)",
    brand: "Baidyanath",
    category: "diabetes",
    healthConcerns: ["diabetes"],
    mrp: 165,
    marketPrice: 150,
    price: 119,
    rating: 4.4,
    reviews: 2870,
    packSize: "120 Tablets",
    description:
      "Herbal formulation with Gudmar and Karela to help maintain healthy blood sugar levels.",
  },
  {
    name: "Diabecon Tablets (60 tabs)",
    brand: "Himalaya",
    category: "diabetes",
    healthConcerns: ["diabetes"],
    mrp: 195,
    marketPrice: 180,
    price: 145,
    rating: 4.5,
    reviews: 4980,
    packSize: "60 Tablets",
    isBestseller: true,
    description:
      "Clinically studied Ayurvedic supplement that supports healthy glucose metabolism and pancreatic function.",
  },
  {
    name: "Karela Jamun Juice (1L)",
    brand: "Dabur",
    category: "diabetes",
    healthConcerns: ["diabetes"],
    mrp: 220,
    marketPrice: 200,
    price: 165,
    rating: 4.2,
    reviews: 1650,
    packSize: "1 Litre",
    description:
      "Bitter gourd and jamun blended juice traditionally used to support healthy blood sugar levels.",
  },
  {
    name: "SB Glucofit Capsules (60 caps)",
    brand: "SB Ayurveda",
    category: "diabetes",
    healthConcerns: ["diabetes"],
    mrp: 449,
    marketPrice: 410,
    price: 339,
    rating: 4.6,
    reviews: 290,
    packSize: "60 Capsules",
    description:
      "In-house formulation with Gudmar, Jamun and Karela extracts to support healthy blood sugar as part of a balanced lifestyle.",
  },

  // ---------------- GENERAL WELLNESS ----------------
  {
    name: "Ashwagandha Churna (200g)",
    brand: "Patanjali",
    category: "general",
    healthConcerns: ["general", "mens-health"],
    mrp: 140,
    marketPrice: 130,
    price: 99,
    rating: 4.3,
    reviews: 3450,
    packSize: "200 g Pack",
    description:
      "Pure Ashwagandha root powder to help manage everyday stress and support restful sleep.",
  },
  {
    name: "Brahmi Vati (40 tabs)",
    brand: "Baidyanath",
    category: "general",
    healthConcerns: ["general"],
    mrp: 85,
    marketPrice: 78,
    price: 62,
    rating: 4.2,
    reviews: 1230,
    packSize: "40 Tablets",
    description:
      "Traditional Brahmi-based formulation that supports memory, focus and mental clarity.",
  },
  {
    name: "Kottakkal Dhanwantharam Oil (200ml)",
    brand: "Kottakkal",
    category: "general",
    healthConcerns: ["general", "joint-pain"],
    mrp: 260,
    marketPrice: 240,
    price: 195,
    rating: 4.6,
    reviews: 980,
    packSize: "200 ml Bottle",
    isBestseller: true,
    description:
      "Authentic Kerala Ayurveda massage oil from Arya Vaidya Sala, Kottakkal — nourishes body and calms the nervous system.",
  },
  {
    name: "Kottakkal Saraswatharishtam (450ml)",
    brand: "Kottakkal",
    category: "general",
    healthConcerns: ["general"],
    mrp: 210,
    marketPrice: 195,
    price: 159,
    rating: 4.5,
    reviews: 640,
    packSize: "450 ml Bottle",
    description:
      "Traditional fermented Ayurvedic tonic that supports memory, speech and overall nervous system health.",
  },
  {
    name: "SB Wellness Combo — Immunity + Sleep (Kit)",
    brand: "SB Ayurveda",
    category: "general",
    healthConcerns: ["general", "immunity"],
    mrp: 899,
    marketPrice: 820,
    price: 649,
    rating: 4.8,
    reviews: 210,
    packSize: "Combo Kit",
    isBestseller: true,
    isFlashSale: true,
    description:
      "Curated SB Ayurveda combo with immunity kadha mix and Ashwagandha sleep support tablets — our most-loved starter kit.",
  },
];

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const products = raw.map((p, idx) => {
  const id = `sba-${idx + 1}`;
  const discountPct = Math.round(((p.mrp - p.price) / p.mrp) * 100);
  const savings = p.mrp - p.price;
  const base = {
    id,
    slug: `${slugify(p.brand)}-${slugify(p.name)}-${id}`,
    ...p,
    discountPct,
    savings,
    inStock: true,
  };
  const images = productImages(base);
  return { ...base, image: images[0], images };
});

export const flashSaleProducts = products.filter((p) => p.isFlashSale);
export const bestsellerProducts = products.filter((p) => p.isBestseller);

export function getProductBySlug(slug) {
  return products.find((p) => p.slug === slug);
}

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

export function searchProducts(query) {
  const q = query.trim();
  if (!q) return [];

  const scored = products
    .map((p) => ({ product: p, score: fuzzyScore(q, productTokens(p)) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.map((r) => r.product);
}
