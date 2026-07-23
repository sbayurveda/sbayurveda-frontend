import { inferHealthConcerns } from "./healthConcernInference";
import { slugify } from "./slugify";
import { sanitizeDescriptionHtml } from "./sanitizeHtml";

const HTML_ENTITIES = {
  "&amp;": "&",
  "&#038;": "&",
  "&#8217;": "’",
  "&#8216;": "‘",
  "&#8220;": "“",
  "&#8221;": "”",
  "&#8211;": "–",
  "&#8212;": "—",
  "&nbsp;": " ",
  "&quot;": '"',
  "&#039;": "'",
};

export function decodeEntities(str = "") {
  return str.replace(/&#?\w+;/g, (entity) => HTML_ENTITIES[entity] ?? entity);
}

function stripHtml(html = "") {
  return decodeEntities(html.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

function toRupees(minorUnits) {
  const n = Number(minorUnits);
  return Number.isFinite(n) ? n / 100 : 0;
}

// Many product names are prefixed with the brand's full name
// ("Arya Vaidya Sala Kottakkal Vasantakusumakararasam...") which duplicates
// the brand label already shown above the title in our UI — strip it.
function cleanName(name, brand) {
  if (brand && name.toLowerCase().startsWith(brand.toLowerCase())) {
    return name.slice(brand.length).trim().replace(/^[-–—:]\s*/, "");
  }
  return name;
}

function extractPackSize(name) {
  const match = name.match(/\(([^)]+)\)\s*$/);
  return match ? match[1] : "";
}

// Maps a raw WooCommerce Store API product into our app's Product shape.
// Returns null for products that can't actually be sold (no price, not
// purchasable, or no real product photo) — these are filtered out of the
// catalog entirely rather than shown with a placeholder, since a store selling
// medicine-adjacent products showing blank/generic tiles is a trust problem.
export function mapWooProduct(raw) {
  const mrp = toRupees(raw.prices.regular_price);
  const price = toRupees(raw.prices.price);
  const realImages = (raw.images || []).map((img) => img.src).filter(Boolean);

  if (!raw.is_purchasable || price <= 0 || realImages.length === 0) return null;

  const brand = decodeEntities(raw.brands?.[0]?.name || "SB Ayurveda");
  const rawName = decodeEntities(raw.name);
  const name = cleanName(rawName, brand) || rawName;

  // Keep real structure (headings like "Key Ingredients", bullet lists, etc.)
  // instead of flattening everything into one run-on paragraph — WooCommerce
  // descriptions are genuinely formatted this way on the real site.
  const descriptionHtml = sanitizeDescriptionHtml(raw.description);
  const hasDescription = stripHtml(descriptionHtml).length > 0;
  const shortDescriptionText = stripHtml(raw.short_description);
  const description = hasDescription
    ? descriptionHtml
    : `<p>${shortDescriptionText || `${name} by ${brand}.`}</p>`;

  const healthConcerns = inferHealthConcerns(raw.name, raw.description, raw.short_description);

  const discountPct = mrp > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const savings = Math.max(mrp - price, 0);

  const base = {
    id: `wc-${raw.id}`,
    slug: raw.slug || `${slugify(brand)}-${slugify(name)}-${raw.id}`,
    name,
    brand,
    category: healthConcerns[0],
    healthConcerns,
    mrp: mrp || price,
    marketPrice: mrp || price, // no real competitor-price data from WooCommerce
    price,
    rating: Number(raw.average_rating) || 0,
    reviews: raw.review_count || 0,
    packSize: extractPackSize(rawName) || "1 unit",
    description,
    isBestseller: Number(raw.average_rating) >= 4 && raw.review_count > 0,
    isFlashSale: raw.on_sale,
    discountPct,
    savings,
    inStock: raw.is_in_stock,
  };

  return { ...base, image: realImages[0], images: realImages };
}

export function mapWooProducts(rawList) {
  return rawList.map(mapWooProduct).filter(Boolean);
}
