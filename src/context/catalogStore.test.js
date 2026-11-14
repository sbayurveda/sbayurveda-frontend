import { describe, it, expect, vi } from "vitest";

// The catalogue streams in a page at a time. These tests pin down the one
// thing that matters to anyone arriving from a search result: the store must
// not claim the catalogue is whole until it is.
//
// The bug this guards against: `status` flips to "ready" after the FIRST page
// so the shop paints early, and the product page read that as "the catalogue
// is loaded". Any product past the first hundred looked non-existent and the
// visitor was redirected to the home page — on a cold visit, which is exactly
// what a click from Google is.

// Shaped the way the Store API returns them, so mapWooProducts keeps them.
// Hoisted, because vi.mock's factory runs before ordinary top-level consts
// exist — and fetchCatalog swallows the resulting error into status "error",
// which makes the failure look like a store bug rather than a test bug.
const { pages } = vi.hoisted(() => {
  const wooProduct = (id, slug, name, minorPrice) => ({
    id,
    slug,
    name,
    is_purchasable: true,
    prices: { price: String(minorPrice), regular_price: String(minorPrice) },
    images: [{ src: `https://old.sbayurveda.com/${slug}.webp` }],
    // Left empty on purpose: sanitizeDescriptionHtml reaches for DOMParser,
    // which this (DOM-less) test environment does not have, and it
    // short-circuits on an empty description. The store's streaming is what
    // is under test here, not description rendering.
    description: "",
    short_description: "Plain text summary.",
    categories: [],
    brands: [],
  });
  return {
    pages: [
      [wooProduct(1, "first-page-product", "First Page Product", 10000)],
      [wooProduct(2, "triguna-amlantak-syrup-200ml", "Amlantak Syrup (200ml)", 9900)],
    ],
  };
});

vi.mock("../api/woocommerce", () => ({
  fetchAllProducts: async ({ onPage }) => {
    const all = [];
    for (const page of pages) {
      all.push(...page);
      onPage(page);
    }
    return all;
  },
  fetchBrands: async () => [],
}));

const freshStore = async () => {
  vi.resetModules();
  const { useCatalogStore } = await import("./catalogStore");
  return useCatalogStore;
};

describe("the catalogue store while it is still loading", () => {
  it("starts out incomplete", async () => {
    const store = await freshStore();
    expect(store.getState().complete).toBe(false);
    expect(store.getState().status).toBe("idle");
  });

  it("paints early but does not claim to be complete", async () => {
    const store = await freshStore();
    const seen = [];
    const stop = store.subscribe((s) =>
      seen.push({ status: s.status, count: s.products.length, complete: s.complete }));

    await store.getState().fetchCatalog();
    stop();

    // The fast first paint is kept: "ready" with only page one loaded.
    const firstReady = seen.find((s) => s.status === "ready");
    expect(firstReady.count).toBe(1);
    // ...but it must not have been marked complete at that point.
    expect(firstReady.complete).toBe(false);

    // Nothing is ever both incomplete and claiming the full catalogue.
    const liars = seen.filter((s) => s.complete && s.count < 2);
    expect(liars).toEqual([]);
  });

  it("is complete, with every product, once the load finishes", async () => {
    const store = await freshStore();
    await store.getState().fetchCatalog();

    const { products, complete, status, error } = store.getState();
    expect(error).toBe(null); // a swallowed throw would otherwise look like a store bug
    expect(complete).toBe(true);
    expect(status).toBe("ready");
    expect(products).toHaveLength(2);
    // The product that used to bounce a visitor to the home page.
    expect(products.map((p) => p.slug)).toContain("triguna-amlantak-syrup-200ml");
  });

  it("a product from a later page is absent early and present at the end", async () => {
    const store = await freshStore();
    const whenFirstReady = [];
    const stop = store.subscribe((s) => {
      if (s.status === "ready" && whenFirstReady.length === 0) {
        whenFirstReady.push({
          hasLateProduct: s.products.some((p) => p.slug === "triguna-amlantak-syrup-200ml"),
          complete: s.complete,
        });
      }
    });
    await store.getState().fetchCatalog();
    stop();

    // Exactly the situation the product page misread: present=false but the
    // store is honest that it is not finished, so the page waits instead of
    // concluding the product does not exist.
    expect(whenFirstReady[0]).toEqual({ hasLateProduct: false, complete: false });
    expect(store.getState().complete).toBe(true);
  });
});
