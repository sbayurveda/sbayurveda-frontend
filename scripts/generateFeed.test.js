import { describe, it, expect } from "vitest";
import { xmlEscape, feedItem, buildFeed } from "./generateFeed.mjs";
import { productFacts } from "./prerenderProducts.mjs";

const RAW = {
  slug: "sandu-vasajeevani-200ml",
  name: "Sandu Vasajeevani (200ml)",
  description: "<p>Vasajeevani syrup.</p>",
  prices: { price: "15200", regular_price: "20000", currency_code: "INR" },
  images: [{ src: "https://old.sbayurveda.com/wp-content/uploads/a.webp" }],
  sku: "SBA-9",
  brands: [{ name: "Sandu" }],
  is_in_stock: true,
  is_purchasable: true,
};

const itemFor = (over = {}) => feedItem(productFacts({ ...RAW, ...over }));

describe("escaping", () => {
  it("escapes everything that would break the XML", () => {
    expect(xmlEscape(`Herb & Co <b>"x"</b> 'y'`))
      .toBe("Herb &amp; Co &lt;b&gt;&quot;x&quot;&lt;/b&gt; &apos;y&apos;");
  });

  it("strips control characters, which make a whole feed unparseable", () => {
    expect(xmlEscape("bad\u0001value")).toBe("badvalue");
  });

  it("a product name with an ampersand does not corrupt the feed", () => {
    const xml = buildFeed([productFacts({ ...RAW, name: "Joint & Knee Relief" })]);
    expect(xml).toContain("<g:title>Joint &amp; Knee Relief</g:title>");
    expect(xml).not.toMatch(/<g:title>[^<]*&(?!amp;|lt;|gt;|quot;|apos;)/);
  });
});

describe("the fields Merchant Center requires", () => {
  const item = itemFor();

  it("carries id, title, link, image, availability and condition", () => {
    expect(item).toContain("<g:id>SBA-9</g:id>");
    expect(item).toContain("<g:title>Sandu Vasajeevani (200ml)</g:title>");
    expect(item).toContain("<g:link>https://sbayurveda.com/product/sandu-vasajeevani-200ml</g:link>");
    expect(item).toContain("<g:image_link>https://old.sbayurveda.com/wp-content/uploads/a.webp</g:image_link>");
    expect(item).toContain("<g:availability>in_stock</g:availability>");
    expect(item).toContain("<g:condition>new</g:condition>");
  });

  it("writes price as amount and currency, out of minor units", () => {
    // 15200 from the Store API is 152.00, not 15,200 — the difference
    // between a correct feed and a price mismatch on every item.
    expect(item).toContain("<g:sale_price>152.00 INR</g:sale_price>");
    expect(item).toContain("<g:price>200.00 INR</g:price>");
  });

  it("uses a plain price when nothing is discounted", () => {
    const plain = itemFor({ prices: { price: "15200", regular_price: "15200", currency_code: "INR" } });
    expect(plain).toContain("<g:price>152.00 INR</g:price>");
    expect(plain).not.toContain("sale_price");
  });

  it("says out of stock when it is", () => {
    expect(itemFor({ is_in_stock: false })).toContain("<g:availability>out_of_stock</g:availability>");
  });
});

describe("identifiers", () => {
  it("declares them present when there is a brand or an SKU", () => {
    expect(itemFor()).toContain("<g:identifier_exists>yes</g:identifier_exists>");
    expect(itemFor()).toContain("<g:brand>Sandu</g:brand>");
  });

  it("declares them absent when there is neither", () => {
    // Without this Google holds the item waiting for an identifier that is
    // never going to arrive.
    const none = itemFor({ brands: [], sku: "" });
    expect(none).toContain("<g:identifier_exists>no</g:identifier_exists>");
    expect(none).not.toContain("<g:brand>");
  });

  it("falls back to the slug for an id when there is no SKU", () => {
    expect(itemFor({ sku: "" })).toContain("<g:id>sandu-vasajeevani-200ml</g:id>");
  });
});

describe("the feed as a whole", () => {
  const xml = buildFeed([productFacts(RAW), productFacts({ ...RAW, slug: "x", sku: "SBA-10" })]);

  it("is an RSS document in the namespace Google expects", () => {
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('xmlns:g="http://base.google.com/ns/1.0"');
    expect(xml).toContain("<rss version=\"2.0\"");
  });

  it("holds one item per product", () => {
    expect(xml.match(/<item>/g)).toHaveLength(2);
    expect(xml.match(/<\/item>/g)).toHaveLength(2);
  });

  it("gives every item a distinct id", () => {
    const ids = [...xml.matchAll(/<g:id>(.*?)<\/g:id>/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("is well-formed — every tag opened is closed", () => {
    const opened = [...xml.matchAll(/<(g:[a-z_]+)>/g)].map((m) => m[1]);
    const closed = [...xml.matchAll(/<\/(g:[a-z_]+)>/g)].map((m) => m[1]);
    expect(opened.sort()).toEqual(closed.sort());
  });
});
