import { create } from "zustand";
import { fetchAllProducts, fetchBrands } from "../api/woocommerce";
import { mapWooProducts, decodeEntities } from "../utils/mapProduct";

const CACHE_TTL_MS = 10 * 60 * 1000; // treat cached data as "fresh enough" for 10 minutes
const STORAGE_KEY = "sba-catalog-cache-v1";

// The WooCommerce Store API runs on shared hosting — each 100-product page
// takes ~1-1.5s server-side, and fetching the full ~580-product catalog can
// take several seconds even in parallel. To keep the site feeling fast:
//  1. Cache the full catalog in localStorage so repeat visits render instantly
//     while a fresh copy loads quietly in the background (stale-while-revalidate).
//  2. On a true first visit (no cache), render products as soon as the first
//     page arrives instead of waiting for the whole catalog.

function loadCache() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.products) || !parsed.lastFetchedAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveCache(products, brands, lastFetchedAt) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ products, brands, lastFetchedAt }));
  } catch {
    // localStorage full/unavailable — non-fatal, just skip persisting
  }
}

const cached = typeof window !== "undefined" ? loadCache() : null;

function mapBrands(rawBrands) {
  return rawBrands
    .map((b) => ({ id: b.id, name: decodeEntities(b.name), slug: b.slug, count: b.count }))
    .sort((a, b) => b.count - a.count);
}

export const useCatalogStore = create((set, get) => ({
  products: cached?.products || [],
  brands: cached?.brands || [],
  status: cached ? "ready" : "idle", // idle | loading | ready | error
  error: null,
  lastFetchedAt: cached?.lastFetchedAt || null,

  fetchCatalog: async ({ force = false } = {}) => {
    const { status, lastFetchedAt, products } = get();
    if (status === "loading") return;

    const isFresh =
      !force && lastFetchedAt && Date.now() - lastFetchedAt < CACHE_TTL_MS;
    if (isFresh) return;

    const hasExistingData = products.length > 0;
    // If we already have data (even stale), refresh quietly in the background
    // rather than blanking the UI back to a loading state.
    if (!hasExistingData) set({ status: "loading", error: null });

    try {
      const seenIds = new Set();
      let merged = hasExistingData ? [] : [];
      let firstPageRendered = false;

      const rawBrandsPromise = fetchBrands().catch(() => []);

      const rawProducts = await fetchAllProducts({
        onPage: (pageProducts) => {
          if (hasExistingData) return; // background refresh: swap in all at once at the end
          for (const p of pageProducts) {
            if (!seenIds.has(p.id)) {
              seenIds.add(p.id);
              merged.push(p);
            }
          }
          if (!firstPageRendered) {
            firstPageRendered = true;
            set({ products: mapWooProducts(merged), status: "ready" });
          } else {
            set({ products: mapWooProducts(merged) });
          }
        },
      });

      const rawBrands = await rawBrandsPromise;
      const finalProducts = mapWooProducts(rawProducts);
      const finalBrands = mapBrands(rawBrands);
      const now = Date.now();

      set({
        products: finalProducts,
        brands: finalBrands,
        status: "ready",
        lastFetchedAt: now,
      });
      saveCache(finalProducts, finalBrands, now);
    } catch (err) {
      if (!hasExistingData) {
        set({ status: "error", error: err.message || "Failed to load products" });
      }
      // if we had existing (cached) data, silently keep showing it on error
    }
  },
}));
