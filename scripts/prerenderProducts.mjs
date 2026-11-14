// Writes a real HTML file for every product, so a crawler gets the product
// rather than an empty app shell.
//
// The site is a React app served as static files: every URL returned the same
// 3,588-byte page with a generic title, no price and no availability. Google
// Merchant Center verifies a listing by reading its landing page, found no
// product on it, and dropped items as it re-crawled them.
//
// There is no Node process in front of the site, so this runs at build time
// instead. .htaccess already serves a real file in preference to the app
// shell, so dist/product/<slug>/index.html is picked up with no config change.
//
// Two things go into each page:
//
//   - head: the product's own title, description, canonical and Open Graph
//     tags, plus Product structured data carrying price and availability,
//     which is what Merchant Center actually reads.
//
//   - body: the same facts as visible text inside #root. The app calls
//     createRoot, which replaces whatever is in the container, so this is
//     shown until React mounts and then disappears — no duplication, and a
//     crawler that ignores JSON-LD still sees a real page.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIST = join(HERE, "..", "dist");
const WC_BASE = "https://old.sbayurveda.com/wp-json/wc/store/v1";
const SITE = "https://sbayurveda.com";
const PAGE_SIZE = 100;

export function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Plain text from WooCommerce's HTML, for a meta description. */
export function plainText(html, limit = 300) {
  const text = String(html ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    // &#039; and &apos; are a straight apostrophe; the numeric entities below
    // keep their own characters, so &#8217; stays a curly one.
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    // Leftover markdown bold markers from the catalogue import: several
    // descriptions end in a literal "****", which would be read as part of
    // the product's description by Google and by anyone sharing the page.
    // Bold means nothing in plain text, so the markers just go; a lone
    // asterisk (a footnote mark) is left alone.
    .replace(/\*{2,}/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= limit) return text;
  // Cut on a word boundary rather than mid-word.
  return `${text.slice(0, limit).replace(/\s+\S*$/, "")}…`;
}

/**
 * Everything the page needs, taken from one Store API product.
 *
 * Prices arrive in minor units, so 45000 is ₹450.00.
 */
export function productFacts(p) {
  const minor = Number(p?.prices?.price);
  const price = Number.isFinite(minor) ? (minor / 100).toFixed(2) : null;
  const regularMinor = Number(p?.prices?.regular_price);
  const image = (p?.images || []).find((i) => i?.src)?.src || "";
  const brand = (p?.brands || [])[0]?.name || "";
  return {
    slug: p?.slug || "",
    name: plainText(p?.name, 160),
    description: plainText(p?.description || p?.short_description, 300),
    descriptionHtml: String(p?.short_description || p?.description || ""),
    price,
    regularPrice: Number.isFinite(regularMinor) ? (regularMinor / 100).toFixed(2) : null,
    currency: p?.prices?.currency_code || "INR",
    image,
    sku: p?.sku || "",
    brand,
    inStock: p?.is_in_stock !== false,
    url: `${SITE}/product/${p?.slug || ""}`,
  };
}

/** Only products the app itself will show; a crawler sent anywhere else bounces. */
export function isListable(p) {
  const price = Number(p?.prices?.price) / 100;
  const hasImage = (p?.images || []).some((i) => i?.src);
  return Boolean(p?.slug) && p?.is_purchasable && price > 0 && hasImage;
}

function structuredData(f) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: f.name,
    description: f.description,
    url: f.url,
    ...(f.image ? { image: [f.image] } : {}),
    ...(f.sku ? { sku: f.sku } : {}),
    ...(f.brand ? { brand: { "@type": "Brand", name: f.brand } } : {}),
    offers: {
      "@type": "Offer",
      url: f.url,
      priceCurrency: f.currency,
      price: f.price,
      availability: f.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: "SB Ayurveda" },
    },
  };
  // </script> inside a value would close the tag early.
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function visibleBody(f) {
  const price = f.price ? `₹${f.price}` : "";
  const was = f.regularPrice && f.regularPrice !== f.price ? ` <s>₹${f.regularPrice}</s>` : "";
  return [
    '<div id="prerendered-product">',
    // The product photo has to be a real <img>, not just og:image and
    // structured data. Without one in the markup Google had no page image to
    // choose and fell back to the site logo, so the search result showed the
    // SB Ayurveda logo where competitors showed the product. React replaces
    // this the moment it mounts, and it is the same URL the app loads next,
    // so the browser fetches it once either way.
    f.image
      ? `<img src="${escapeHtml(f.image)}" alt="${escapeHtml(f.name)}"`
        + ` width="640" height="640" style="max-width:320px;height:auto" />`
      : "",
    `<h1>${escapeHtml(f.name)}</h1>`,
    f.brand ? `<p>Brand: ${escapeHtml(f.brand)}</p>` : "",
    price ? `<p><strong>${price}</strong>${was}</p>` : "",
    `<p>${f.inStock ? "In stock" : "Out of stock"}</p>`,
    f.sku ? `<p>SKU: ${escapeHtml(f.sku)}</p>` : "",
    f.description ? `<p>${escapeHtml(f.description)}</p>` : "",
    "</div>",
  ].filter(Boolean).join("");
}

/**
 * The product's page, built from the app shell.
 *
 * Only the head tags that describe the page are swapped; everything else —
 * the script and style links vite generated — is left exactly as it is, so
 * the app still boots normally.
 */
export function buildProductHtml(shell, f) {
  const title = `${f.name} — Buy Online | SB Ayurveda`;
  let html = shell;

  const swap = (pattern, replacement) => {
    html = pattern.test(html) ? html.replace(pattern, replacement) : html;
  };

  swap(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>`);
  swap(/<meta name="description" content="[^"]*"\s*\/?>/,
       `<meta name="description" content="${escapeHtml(f.description || f.name)}" />`);
  swap(/<link rel="canonical" href="[^"]*"\s*\/?>/,
       `<link rel="canonical" href="${escapeHtml(f.url)}" />`);
  swap(/<meta property="og:type" content="[^"]*"\s*\/?>/,
       `<meta property="og:type" content="product" />`);
  swap(/<meta property="og:title" content="[^"]*"\s*\/?>/,
       `<meta property="og:title" content="${escapeHtml(title)}" />`);
  swap(/<meta property="og:description" content="[^"]*"\s*\/?>/,
       `<meta property="og:description" content="${escapeHtml(f.description || f.name)}" />`);
  swap(/<meta property="og:url" content="[^"]*"\s*\/?>/,
       `<meta property="og:url" content="${escapeHtml(f.url)}" />`);
  if (f.image) {
    swap(/<meta property="og:image" content="[^"]*"\s*\/?>/,
         `<meta property="og:image" content="${escapeHtml(f.image)}" />`);
  }

  // The shell's LocalBusiness block stays; the product is added alongside it.
  html = html.replace(
    "</head>",
    `  <script type="application/ld+json" data-prerendered="product">`
    + `${structuredData(f)}</script>\n  </head>`,
  );

  // Inside #root, so React clears it the moment it mounts.
  html = html.replace(/(<div id="root">)(\s*)(<\/div>)/, `$1${visibleBody(f)}$3`);
  return html;
}

export async function fetchAllProducts() {
  const out = [];
  let page = 1;
  let totalPages = 1;
  do {
    const res = await fetch(
      `${WC_BASE}/products?per_page=${PAGE_SIZE}&page=${page}`
      + "&_fields=slug,name,description,short_description,prices,images,sku,brands,is_in_stock,is_purchasable",
    );
    if (!res.ok) break;
    totalPages = Number(res.headers.get("X-WP-TotalPages") || 1);
    out.push(...(await res.json()));
    page += 1;
  } while (page <= totalPages);
  return out;
}

async function main() {
  const shellPath = join(DIST, "index.html");
  if (!existsSync(shellPath)) {
    console.warn("Prerender: no dist/index.html — run after vite build.");
    return;
  }
  const shell = readFileSync(shellPath, "utf8");

  let products = [];
  try {
    products = await fetchAllProducts();
  } catch (err) {
    // Never fail the build over this: a shell-only deploy is worse than a
    // stale one, but a broken deploy is worse than both.
    console.warn(`Prerender: could not reach the catalogue (${err.message}); skipping.`);
    return;
  }

  let written = 0;
  for (const p of products) {
    if (!isListable(p)) continue;
    const facts = productFacts(p);
    const dir = join(DIST, "product", facts.slug);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "index.html"), buildProductHtml(shell, facts));
    written += 1;
  }
  console.log(`Prerender: wrote ${written} product pages of ${products.length} fetched.`);
}

if (process.argv[1] && process.argv[1].endsWith("prerenderProducts.mjs")) {
  main();
}
