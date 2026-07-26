import { useEffect } from "react";

// Per-page SEO tag manager for this client-side SPA.
//
// index.html ships a single static set of <title>/description/canonical/og
// tags (the homepage's). Without this hook, every route — every product, the
// cart, policies — would present those same homepage tags, so Google treats
// them all as duplicates of the homepage. This hook rewrites the real <head>
// tags on each route so every page has a unique title, description, and
// canonical/og:url pointing at its own URL.
//
// Caveat: because tags are set with JS, Googlebot (which renders JS) picks
// them up, but non-JS social scrapers (Facebook/WhatsApp link unfurls) still
// read index.html's static defaults. A true fix for social previews is
// pre-rendering/SSR; this hook fixes the search-ranking duplicate-content
// problem, which is the pressing one.

const SITE_URL = "https://sbayurveda.com";
const DEFAULT_TITLE =
  "Buy Authentic Ayurvedic Products Online | Genuine Dabur, Himalaya, Patanjali | SB Ayurveda";
const DEFAULT_DESCRIPTION =
  "Buy authentic Ayurvedic products online at India's lowest prices. Genuine Dabur, Baidyanath, Zandu, Himalaya, Patanjali & SB Ayurveda products — guaranteed, or get 2X refund. Free shipping above ₹799, Cash on Delivery, same day dispatch.";
const DEFAULT_IMAGE = `${SITE_URL}/banners/hot-deals.jpg`;

// Finds an existing <head> tag matching selector, or creates one with the
// given attributes. Returned element is reused/mutated on later route changes.
function upsert(selector, create) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  return el;
}

function setMeta(attr, key, content) {
  const el = upsert(`meta[${attr}="${key}"]`, () => {
    const m = document.createElement("meta");
    m.setAttribute(attr, key);
    return m;
  });
  el.setAttribute("content", content);
}

// Absolute URL from a path ("/product/foo" -> "https://sbayurveda.com/product/foo").
function absoluteUrl(path) {
  if (!path) return `${SITE_URL}/`;
  if (path.startsWith("http")) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function useSeo({ title, description, path, image, noindex } = {}) {
  useEffect(() => {
    const finalTitle = title ? `${title} | SB Ayurveda` : DEFAULT_TITLE;
    const finalDesc = description || DEFAULT_DESCRIPTION;
    const canonical = absoluteUrl(path);
    const finalImage = image || DEFAULT_IMAGE;

    document.title = finalTitle;
    setMeta("name", "description", finalDesc);

    // Canonical link
    const link = upsert('link[rel="canonical"]', () => {
      const l = document.createElement("link");
      l.setAttribute("rel", "canonical");
      return l;
    });
    link.setAttribute("href", canonical);

    // Open Graph
    setMeta("property", "og:title", finalTitle);
    setMeta("property", "og:description", finalDesc);
    setMeta("property", "og:url", canonical);
    setMeta("property", "og:image", finalImage);

    // Twitter
    setMeta("name", "twitter:title", finalTitle);
    setMeta("name", "twitter:description", finalDesc);
    setMeta("name", "twitter:image", finalImage);

    // robots (noindex for thin/utility pages like cart, checkout, wishlist)
    setMeta("name", "robots", noindex ? "noindex, follow" : "index, follow");
  }, [title, description, path, image, noindex]);
}
