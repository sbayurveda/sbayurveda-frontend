// Client for the WooCommerce Store API (public, no auth keys needed — safe to
// call directly from the browser). Docs: https://github.com/woocommerce/woocommerce/blob/trunk/plugins/woocommerce/src/StoreApi/docs/products.md
//
// IMPORTANT: this requires CORS to be enabled on the WordPress site for our
// origin (see README for the snippet). Without it, these calls will be
// blocked by the browser even though they succeed from curl/servers.

const WC_BASE = "https://old.sbayurveda.com/wp-json/wc/store/v1";
const PAGE_SIZE = 100;

async function getJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`WooCommerce API error ${res.status} for ${url}`);
  }
  const totalPages = Number(res.headers.get("X-WP-TotalPages") || 1);
  const total = Number(res.headers.get("X-WP-Total") || 0);
  const data = await res.json();
  return { data, totalPages, total };
}

// Fetches every product in the catalog (paginated under the hood, requests
// run in parallel after the first page tells us how many pages exist).
// `onPage(rawPageProducts)` fires as soon as each page resolves (page 1 first,
// then whichever others finish, in whatever order) so callers can render
// products progressively instead of waiting for the whole catalog.
export async function fetchAllProducts({ onPage } = {}) {
  const first = await getJson(`${WC_BASE}/products?per_page=${PAGE_SIZE}&page=1`);
  onPage?.(first.data);
  const pages = [first.data];

  if (first.totalPages > 1) {
    const requests = [];
    for (let page = 2; page <= first.totalPages; page++) {
      requests.push(
        getJson(`${WC_BASE}/products?per_page=${PAGE_SIZE}&page=${page}`).then((r) => {
          onPage?.(r.data);
          return r;
        })
      );
    }
    const rest = await Promise.all(requests);
    for (const r of rest) pages.push(r.data);
  }

  return pages.flat();
}

export async function fetchBrands() {
  const { data } = await getJson(`${WC_BASE}/products/brands?per_page=100`);
  return data;
}

export async function fetchCategories() {
  const { data } = await getJson(`${WC_BASE}/products/categories?per_page=100`);
  return data;
}
