import { describe, it, expect } from "vitest";
import {
  escapeHtml, plainText, productFacts, isListable, buildProductHtml,
} from "./prerenderProducts.mjs";

// A trimmed copy of the real app shell, with the tags the prerenderer swaps.
const SHELL = `<!doctype html>
<html lang="en">
  <head>
    <title>Buy Authentic Ayurvedic Products Online | SB Ayurveda</title>
    <meta name="description" content="Buy authentic Ayurvedic products online." />
    <link rel="canonical" href="https://sbayurveda.com/" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="SB Ayurveda" />
    <meta property="og:description" content="Genuine Ayurvedic products." />
    <meta property="og:url" content="https://sbayurveda.com/" />
    <meta property="og:image" content="https://sbayurveda.com/banners/hot-deals.jpg" />
    <script type="application/ld+json">{"@type":"LocalBusiness"}</script>
    <script type="module" crossorigin src="/assets/index-abc123.js"></script>
    <link rel="stylesheet" href="/assets/index-def456.css">
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;

const RAW = {
  slug: "sandu-vasajeevani-200ml",
  name: "Sandu Vasajeevani (200ml)",
  description: "<p>Vasajeevani <strong>How to use:</strong> 2 tsp twice daily.</p>",
  short_description: "",
  prices: { price: "45000", regular_price: "50000", currency_code: "INR" },
  images: [{ src: "https://old.sbayurveda.com/wp-content/uploads/a.webp" }],
  sku: "SBA-9", brands: [{ name: "Sandu" }],
  is_in_stock: true, is_purchasable: true,
};

describe("which products get a page", () => {
  it("accepts one the app would actually show", () => {
    expect(isListable(RAW)).toBe(true);
  });

  it("skips anything the app would bounce away from", () => {
    // ProductDetail sends these home, so a crawler must not be sent there.
    expect(isListable({ ...RAW, is_purchasable: false })).toBe(false);
    expect(isListable({ ...RAW, prices: { price: "0" } })).toBe(false);
    expect(isListable({ ...RAW, images: [] })).toBe(false);
    expect(isListable({ ...RAW, slug: "" })).toBe(false);
  });
});

describe("reading the product", () => {
  it("converts the price out of minor units", () => {
    // 45000 from the Store API is 450.00 rupees, not 45,000.
    const f = productFacts(RAW);
    expect(f.price).toBe("450.00");
    expect(f.regularPrice).toBe("500.00");
    expect(f.currency).toBe("INR");
  });

  it("turns the description HTML into plain text", () => {
    expect(productFacts(RAW).description).toBe("Vasajeevani How to use: 2 tsp twice daily.");
  });

  it("decodes the entities WordPress stores", () => {
    expect(plainText("<p>Joint &amp; Knee &#8217;s</p>")).toBe("Joint & Knee ’s");
  });

  it("drops the stray bold markers the import left behind", () => {
    // Nine descriptions in the catalogue end in a literal "****", which
    // would otherwise be read out as part of the product's description.
    expect(plainText("<p>Zandu Swarnaposhan Tablets (30tab)****</p>"))
      .toBe("Zandu Swarnaposhan Tablets (30tab)");
    expect(plainText("<p>**Dosage** 2 tsp</p>")).toBe("Dosage 2 tsp");
  });

  it("keeps a lone asterisk, which is a footnote and not formatting", () => {
    expect(plainText("<p>Price *inclusive of tax</p>")).toBe("Price *inclusive of tax");
  });

  it("cuts a long description on a word boundary", () => {
    const long = `<p>${"word ".repeat(200)}</p>`;
    const out = plainText(long, 100);
    expect(out.length).toBeLessThanOrEqual(101);
    expect(out.endsWith("…")).toBe(true);
    expect(out).not.toMatch(/wor…$/);
  });

  it("reports stock honestly", () => {
    expect(productFacts({ ...RAW, is_in_stock: false }).inStock).toBe(false);
  });
});

describe("the page a crawler receives", () => {
  const html = buildProductHtml(SHELL, productFacts(RAW));

  it("has the product's own title, not the shell's", () => {
    expect(html).toContain("<title>Sandu Vasajeevani (200ml) — Buy Online | SB Ayurveda</title>");
    expect(html).not.toContain("<title>Buy Authentic Ayurvedic Products Online | SB Ayurveda</title>");
  });

  it("points its canonical and og:url at this product", () => {
    expect(html).toContain('<link rel="canonical" href="https://sbayurveda.com/product/sandu-vasajeevani-200ml" />');
    expect(html).toContain('content="https://sbayurveda.com/product/sandu-vasajeevani-200ml"');
    expect(html).toContain('<meta property="og:type" content="product" />');
  });

  it("carries the price and availability Merchant Center reads", () => {
    const m = html.match(/<script type="application\/ld\+json">(\{"@context[\s\S]*?)<\/script>/);
    expect(m).toBeTruthy();
    const data = JSON.parse(m[1]);
    expect(data["@type"]).toBe("Product");
    expect(data.offers.price).toBe("450.00");
    expect(data.offers.priceCurrency).toBe("INR");
    expect(data.offers.availability).toBe("https://schema.org/InStock");
    expect(data.sku).toBe("SBA-9");
    expect(data.brand.name).toBe("Sandu");
  });

  it("shows the product photo as a real img, not only in meta tags", () => {
    // With no <img> in the markup Google had no page image to pick and used
    // the site logo as the search thumbnail, while competitors showed their
    // product. og:image and structured data were not enough on their own.
    expect(html).toContain('<img src="https://old.sbayurveda.com/wp-content/uploads/a.webp"');
    expect(html).toContain('alt="Sandu Vasajeevani (200ml)"');
    // Dimensions, so the placeholder does not shift the layout before React
    // replaces it.
    expect(html).toMatch(/<img [^>]*width="640" height="640"/);
  });

  it("escapes the image URL and alt text like everything else", () => {
    const out = buildProductHtml(SHELL, productFacts({
      ...RAW,
      name: 'Herb & "Co"',
      images: [{ src: 'https://x.test/a.webp?a=1&b="2"' }],
    }));
    expect(out).toContain('src="https://x.test/a.webp?a=1&amp;b=&quot;2&quot;"');
    expect(out).toContain('alt="Herb &amp; &quot;Co&quot;"');
  });

  it("omits the img entirely when a product has no picture", () => {
    const out = buildProductHtml(SHELL, { ...productFacts(RAW), image: "" });
    expect(out).not.toMatch(/<img [^>]*id="prerendered/);
    expect(out).toContain('<div id="prerendered-product"><h1>');
  });

  it("says out of stock when it is", () => {
    const out = buildProductHtml(SHELL, productFacts({ ...RAW, is_in_stock: false }));
    const data = JSON.parse(out.match(/<script type="application\/ld\+json">(\{"@context[\s\S]*?)<\/script>/)[1]);
    expect(data.offers.availability).toBe("https://schema.org/OutOfStock");
  });

  it("keeps the shell's own scripts and styles so the app still boots", () => {
    expect(html).toContain('src="/assets/index-abc123.js"');
    expect(html).toContain('href="/assets/index-def456.css"');
  });

  it("leaves the existing LocalBusiness data alone", () => {
    expect(html).toContain('{"@type":"LocalBusiness"}');
  });

  it("puts readable content inside #root, which React then replaces", () => {
    // createRoot clears the container, so this shows only until the app mounts.
    expect(html).toMatch(/<div id="root"><div id="prerendered-product">/);
    expect(html).toContain("<h1>Sandu Vasajeevani (200ml)</h1>");
    expect(html).toContain("In stock");
    expect(html).toContain("₹450.00");
  });

  it("escapes a name that would otherwise break the markup", () => {
    const nasty = productFacts({ ...RAW, name: 'Herb <script>alert("x")</script> & Co' });
    const out = buildProductHtml(SHELL, nasty);
    expect(out).not.toContain('<script>alert("x")</script>');
    expect(out).toContain("&amp; Co");
  });

  it("cannot be broken out of by a description containing a closing tag", () => {
    const nasty = productFacts({ ...RAW, description: "</script><img onerror=alert(1)>" });
    const out = buildProductHtml(SHELL, nasty);
    const block = out.match(/<script type="application\/ld\+json">(\{"@context[\s\S]*?)<\/script>/)[1];
    expect(block).not.toContain("</script>");
    expect(() => JSON.parse(block)).not.toThrow();
  });
});
