// Builds the Google Merchant Center product feed.
//
// Merchant Center had 979 products against a catalogue of 1,758, with the
// primary source showing "Content API — last updated: –, needs update". The
// plugin that once pushed over that API is no longer installed, so the source
// froze at whatever it last sent and every product added since has been
// invisible to Google. Nothing was being rejected; nothing was being sent.
//
// This writes a feed Merchant Center can fetch for itself on a schedule, so
// the list maintains itself: new products appear, sold-out ones flip, price
// changes follow, and there is no plugin to fall out of date.
//
// RSS 2.0 with the g: namespace — the format Merchant Center documents for a
// scheduled fetch.
//
// Shipping is deliberately absent. It is set once in Merchant Center under
// Shipping and returns rather than repeated on 1,700 items, and putting a
// guess here would be worse than leaving it to the account setting.

import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { fetchAllProducts, productFacts, isListable } from "./prerenderProducts.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIST = join(HERE, "..", "dist");
const SITE = "https://sbayurveda.com";
// Publishing a near-empty feed tells Merchant Center the catalogue shrank,
// and it drops the missing items. Treat a collapse as a fault, not as news.
const MIN_FEED_ITEMS = Number(process.env.MIN_FEED_ITEMS || 500);

export function xmlEscape(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    // A control character makes the whole feed unparseable, and one bad
    // product should not cost the other 1,714.
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
}

/**
 * One <item>, as Merchant Center expects it.
 *
 * `identifier_exists` is the one easy thing to get wrong: without a brand,
 * gtin or mpn Google needs telling so, or it holds the item waiting for an
 * identifier that will never come.
 */
export function feedItem(f) {
  const tag = (name, value) => `      <${name}>${xmlEscape(value)}</${name}>`;
  const lines = [
    "    <item>",
    tag("g:id", f.sku || f.slug),
    tag("g:title", f.name),
    tag("g:description", f.description || f.name),
    tag("g:link", f.url),
    tag("g:image_link", f.image),
    tag("g:availability", f.inStock ? "in_stock" : "out_of_stock"),
    tag("g:condition", "new"),
    tag("g:price", `${f.price} ${f.currency}`),
  ];

  // A sale price is only meaningful when something was struck through.
  if (f.regularPrice && Number(f.regularPrice) > Number(f.price)) {
    lines.splice(lines.length - 1, 1,
      tag("g:price", `${f.regularPrice} ${f.currency}`),
      tag("g:sale_price", `${f.price} ${f.currency}`));
  }

  if (f.brand) lines.push(tag("g:brand", f.brand));
  if (f.sku) lines.push(tag("g:mpn", f.sku));
  lines.push(tag("g:identifier_exists", f.brand || f.sku ? "yes" : "no"));
  lines.push("    </item>");
  return lines.join("\n");
}

export function buildFeed(facts, now = new Date()) {
  const items = facts.map(feedItem).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>SB Ayurveda</title>
    <link>${SITE}</link>
    <description>Genuine Ayurvedic products</description>
    <lastBuildDate>${now.toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`;
}

async function main() {
  let products = [];
  try {
    products = await fetchAllProducts();
  } catch (err) {
    // Writing no feed is not the same as leaving the old one alone: the
    // deploy rsyncs with --delete, so a skipped feed is a deleted feed, and
    // Merchant Center's next fetch would 404. Fail and keep what is live.
    console.error(`Feed: could not reach the catalogue (${err.message}).`);
    process.exit(1);
  }

  const facts = products.filter(isListable).map(productFacts).filter((f) => f.price && f.image);

  if (facts.length < MIN_FEED_ITEMS) {
    console.error(
      `Feed: only ${facts.length} items from ${products.length} products fetched, below the `
      + `floor of ${MIN_FEED_ITEMS}. Refusing to publish a feed that would drop most of the `
      + `catalogue out of Merchant Center. Set MIN_FEED_ITEMS to override.`,
    );
    process.exit(1);
  }

  const xml = buildFeed(facts);
  writeFileSync(join(DIST, "google-feed.xml"), xml);

  const withBrand = facts.filter((f) => f.brand).length;
  console.log(
    `Feed: wrote ${facts.length} items to dist/google-feed.xml `
    + `(${withBrand} with a brand, ${facts.length - withBrand} without).`,
  );
}

if (process.argv[1] && process.argv[1].endsWith("generateFeed.mjs")) {
  main();
}
