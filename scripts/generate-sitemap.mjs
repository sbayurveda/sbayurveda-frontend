// Generates public/sitemap.xml at build time from the live WooCommerce catalog,
// so search engines get real product/brand URLs instead of nothing. Runs before
// `vite build` (see package.json). Falls back to the static routes alone if the
// live API is unreachable at build time, rather than failing the build.

import { writeFileSync } from "fs";

const WC_BASE = "https://old.sbayurveda.com/wp-json/wc/store/v1";
const SITE_URL = "https://sbayurveda.com";
const PAGE_SIZE = 100;

const STATIC_ROUTES = [
  "/",
  "/category/popular",
  "/category/immunity",
  "/category/hair-care",
  "/category/mens-health",
  "/category/womens-health",
  "/category/digestive",
  "/category/joint-pain",
  "/category/diabetes",
  "/category/general",
  "/offers",
  "/track-order",
  "/upload-prescription",
  "/policy/terms",
  "/policy/refund",
  "/policy/2x-guarantee",
  "/policy/privacy",
  "/policy/shipping",
  "/policy/payment",
];

function slugify(str) {
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Same eligibility rule as mapProduct.js: purchasable, priced, and has a real
// photo — no point sending crawlers to a product page that won't show up in
// the app's own catalog (ProductDetail redirects home if it can't find it).
async function fetchAllProductSlugs() {
  const slugs = [];
  let page = 1;
  let totalPages = 1;
  do {
    const res = await fetch(
      `${WC_BASE}/products?per_page=${PAGE_SIZE}&page=${page}&_fields=slug,is_purchasable,prices,images`
    );
    if (!res.ok) break;
    totalPages = Number(res.headers.get("X-WP-TotalPages") || 1);
    const data = await res.json();
    for (const p of data) {
      const hasImage = Array.isArray(p.images) && p.images.some((img) => img.src);
      const price = Number(p.prices?.price) / 100;
      if (p.is_purchasable && price > 0 && hasImage && p.slug) slugs.push(p.slug);
    }
    page++;
  } while (page <= totalPages);
  return slugs;
}

async function fetchBrandSlugs() {
  const res = await fetch(`${WC_BASE}/products/brands?per_page=100`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.map((b) => b.slug || slugify(b.name)).filter(Boolean);
}

async function main() {
  let productSlugs = [];
  let brandSlugs = [];
  try {
    [productSlugs, brandSlugs] = await Promise.all([fetchAllProductSlugs(), fetchBrandSlugs()]);
  } catch (err) {
    console.warn("Sitemap: couldn't reach the live catalog, writing static routes only.", err.message);
  }

  const urls = [
    ...STATIC_ROUTES,
    ...brandSlugs.map((s) => `/brand/${s}`),
    ...productSlugs.map((s) => `/product/${s}`),
  ];

  const today = new Date().toISOString().slice(0, 10);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
    .map(
      (path) => `  <url>
    <loc>${SITE_URL}${path}</loc>
    <lastmod>${today}</lastmod>
  </url>`
    )
    .join("\n")}
</urlset>
`;

  writeFileSync(new URL("../public/sitemap.xml", import.meta.url), xml);
  console.log(`Sitemap: wrote ${urls.length} URLs (${productSlugs.length} products, ${brandSlugs.length} brands) to public/sitemap.xml`);
}

main();
