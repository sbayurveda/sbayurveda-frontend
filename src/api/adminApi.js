// Client for the admin-only endpoints on the bridge server. The password is
// never checked here — the server verifies it and hands back a short-lived
// signed token, so a tampered frontend can't get at customer data.
//
// The token lives in sessionStorage rather than localStorage so it dies with
// the tab: an admin who closes the browser on a shared machine is signed out.

const API_BASE = import.meta.env.VITE_API_BASE_URL;
const TOKEN_KEY = "sba-admin-session";

export function isAdminApiConfigured() {
  return Boolean(API_BASE);
}

export class AdminAuthError extends Error {}

export function getAdminSession() {
  try {
    const raw = sessionStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session?.token || !session?.expiresAt) return null;
    if (Date.now() >= session.expiresAt) {
      sessionStorage.removeItem(TOKEN_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function clearAdminSession() {
  sessionStorage.removeItem(TOKEN_KEY);
}

export async function adminLogin(username, password) {
  const res = await fetch(`${API_BASE}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Could not sign in. Please try again.");
  sessionStorage.setItem(TOKEN_KEY, JSON.stringify(data));
  return data;
}

async function adminGet(path) {
  const session = getAdminSession();
  if (!session) throw new AdminAuthError("Your session has expired. Please sign in again.");

  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${session.token}` },
  });
  const data = await res.json().catch(() => ({}));

  if (res.status === 401) {
    clearAdminSession();
    throw new AdminAuthError(data.error || "Your session has expired. Please sign in again.");
  }
  if (!res.ok) throw new Error(data.error || "Couldn't load that right now.");
  return data;
}

export async function fetchAdminOrders({ page = 1, perPage = 50, after, before, status, search } = {}) {
  const params = new URLSearchParams({ page: String(page), perPage: String(perPage) });
  if (after) params.set("after", after);
  if (before) params.set("before", before);
  if (status && status !== "any") params.set("status", status);
  if (search) params.set("search", search);
  return adminGet(`/api/admin/orders?${params.toString()}`);
}

export async function fetchOrderNotes(orderId) {
  return adminGet(`/api/admin/orders/${orderId}/notes`);
}

// Aggregated on the server across every order in the range — deliberately not
// computed from the loaded table page, which would report "revenue among the
// last 100 orders" while calling it revenue.
export async function fetchAnalytics({ from, to }) {
  return adminGet(`/api/admin/analytics?from=${from}&to=${to}`);
}

async function adminSend(path, method, body) {
  const session = getAdminSession();
  if (!session) throw new AdminAuthError("Your session has expired. Please sign in again.");

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));

  if (res.status === 401) {
    clearAdminSession();
    throw new AdminAuthError(data.error || "Your session has expired. Please sign in again.");
  }
  if (!res.ok) throw new Error(data.error || "Couldn't save that change.");
  return data;
}

// Pass only the fields being changed. For tracking, an omitted field is left
// alone and an empty string clears it.
// `markPaid` records that cash was collected and is deliberately separate from
// `status`: dispatching a parcel is not payment, and the two must be able to
// travel independently.
export async function updateOrder(orderId, { status, tracking, markPaid, billing, shipping } = {}) {
  return adminSend(`/api/admin/orders/${orderId}`, "PATCH", {
    status, tracking, markPaid, billing, shipping,
  });
}

export async function addOrderNote(orderId, note, { customerNote = false } = {}) {
  return adminSend(`/api/admin/orders/${orderId}/notes`, "POST", { note, customerNote });
}

// --- Products ---------------------------------------------------------------

export function fetchProductCapabilities() {
  return adminGet("/api/admin/products/capabilities");
}

export function fetchProductTaxonomy() {
  return adminGet("/api/admin/products/taxonomy");
}

export function createProduct(product) {
  return adminSend("/api/admin/products", "POST", product);
}

export function updateProduct(id, changes) {
  return adminSend(`/api/admin/products/${id}`, "PATCH", changes);
}

// Reads one file off the customer's machine and posts it as base64 rather than
// multipart — the server needs no parser for it, and this server gaining a
// dependency once took payments down for days.
export function uploadProductImage({ file, productName, altText }) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Couldn't read ${file.name}.`));
    reader.onload = () => {
      const base64 = String(reader.result).split(",")[1] || "";
      adminSend("/api/admin/products/image", "POST", {
        base64,
        filename: file.name,
        contentType: file.type,
        productName,
        altText,
      }).then(resolve, reject);
    };
    reader.readAsDataURL(file);
  });
}

// --- The local copy (all products, all orders, no WordPress in the path) ----

export function fetchStoreStatus() {
  return adminGet("/api/admin/store/status");
}

export function resyncStore() {
  return adminSend("/api/admin/store/sync", "POST", {});
}

export function fetchCatalogue({ q = "", need = "", cod = "any", hsn = "", stock = "any", minPrice = "", maxPrice = "", page = 1, perPage = 50 } = {}) {
  const params = new URLSearchParams({ q, need, cod, stock, page, perPage });
  if (hsn) params.set("hsn", hsn);
  if (minPrice !== "") params.set("minPrice", minPrice);
  if (maxPrice !== "") params.set("maxPrice", maxPrice);
  return adminGet(`/api/admin/catalogue?${params}`);
}

// Switches COD for many products in one go. The server batches them a hundred
// at a time, so the whole catalogue is fifteen requests rather than fifteen
// hundred.
export function setProductsCod(productIds, codDisabled) {
  return adminSend("/api/admin/products/cod", "POST", { productIds, codDisabled });
}

// Writes an HSN code onto many products. The tax report already assumes 3004
// where one is missing; this makes the catalogue say so.
export function setProductsHsn(productIds, hsn = "3004") {
  return adminSend("/api/admin/products/hsn", "POST", { productIds, hsn });
}

// Stock across many products at once: unlimited, a tracked quantity, or off
// sale entirely.
// Deletes go to the WooCommerce trash and can be restored from wp-admin.
export function deleteProducts(productIds) {
  return adminSend("/api/admin/products/delete", "POST", { productIds });
}

export function setProductsStock(productIds, mode, quantity) {
  return adminSend("/api/admin/products/stock", "POST", { productIds, mode, quantity });
}

export function fetchCustomers({
  q = "", pays = "any", repeat = false, risk = false, blocked = false, sort = "value",
  minValue = "", maxValue = "", minOrders = "", maxOrders = "", minCancelled = "",
  activeWithin = "", dormantFor = "", state = "",
  page = 1, perPage = 50,
} = {}) {
  const params = new URLSearchParams({ q, pays, sort, page, perPage });
  if (repeat) params.set("repeat", "true");
  if (risk) params.set("risk", "true");
  if (blocked) params.set("blocked", "true");
  // Only send a bound that was actually filled in: an empty string would be
  // read as a limit of zero and exclude everyone.
  for (const [key, value] of Object.entries({
    minValue, maxValue, minOrders, maxOrders, minCancelled, activeWithin, dormantFor, state,
  })) {
    if (value !== "" && value != null) params.set(key, value);
  }
  return adminGet(`/api/admin/customers?${params}`);
}

// --- Invoices --------------------------------------------------------------
//
// The server builds these from the same rows the GST return is built from, so
// the document and the filing cannot drift apart.

// What else this phone number has ordered — shown beside the order being
// worked on, because it is what decides whether a COD parcel should go out.
export function fetchCustomerHistory(orderId) {
  return adminGet(`/api/admin/orders/${orderId}/customer`);
}

// `issue` is set only when the PDF is actually produced. Opening an order to
// look at it must not consume an invoice number, or the series grows a gap
// for every order someone glances at.
export function fetchInvoice(orderId, { issue = false } = {}) {
  return adminGet(`/api/admin/orders/${orderId}/invoice${issue ? "?issue=true" : ""}`);
}

export function fetchInvoices(orderIds, { issue = false } = {}) {
  return adminSend("/api/admin/invoices", "POST", { orderIds, issue });
}

// --- Tax -------------------------------------------------------------------

export function fetchTaxReport({ from, to }) {
  return adminGet(`/api/admin/tax/report?from=${from}&to=${to}`);
}

// The CSV comes back as a file, not JSON, so it needs the raw response.
export async function downloadTaxCsv({ from, to }) {
  const session = getAdminSession();
  if (!session) throw new AdminAuthError("Your session has expired. Please sign in again.");
  const res = await fetch(`${API_BASE}/api/admin/tax/export?from=${from}&to=${to}`, {
    headers: { Authorization: `Bearer ${session.token}` },
  });
  if (res.status === 401) {
    clearAdminSession();
    throw new AdminAuthError("Your session has expired. Please sign in again.");
  }
  if (!res.ok) throw new Error("Could not build the tax file.");
  return { blob: await res.blob(), filename: `MTR_B2C_${from}_to_${to}.csv` };
}

// --- Categories and brands -------------------------------------------------

export function fetchTerms(kind) {
  return adminGet(`/api/admin/taxonomy/${kind}`);
}

export function createTerm(kind, term) {
  return adminSend(`/api/admin/taxonomy/${kind}`, "POST", term);
}

export function updateTerm(kind, id, changes) {
  return adminSend(`/api/admin/taxonomy/${kind}/${id}`, "PATCH", changes);
}

export function deleteTerm(kind, id) {
  return adminSend(`/api/admin/taxonomy/${kind}/${id}`, "DELETE", {});
}

// --- The catalogue as a spreadsheet ----------------------------------------

export async function downloadCatalogueCsv() {
  const session = getAdminSession();
  if (!session) throw new AdminAuthError("Your session has expired. Please sign in again.");
  const res = await fetch(`${API_BASE}/api/admin/catalogue/export`, {
    headers: { Authorization: `Bearer ${session.token}` },
  });
  if (res.status === 401) {
    clearAdminSession();
    throw new AdminAuthError("Your session has expired. Please sign in again.");
  }
  if (!res.ok) throw new Error("Could not build the product file.");
  return { blob: await res.blob(), filename: `products-${new Date().toISOString().slice(0, 10)}.csv` };
}

// `apply` false asks what the file would do without writing anything. Nobody
// should find out what a spreadsheet did by looking at the shop afterwards.
export function importCatalogue(csv, apply = false) {
  return adminSend("/api/admin/catalogue/import", "POST", { csv, apply });
}

// --- Banners ---------------------------------------------------------------

export function fetchBanners() {
  return adminGet("/api/admin/banners");
}

export function saveBanners(banners) {
  return adminSend("/api/admin/banners", "PUT", { banners });
}

// --- Cash on delivery rules -------------------------------------------------

export function fetchCodRules() {
  return adminGet("/api/admin/cod-rules");
}

export function saveCodRules(rules) {
  return adminSend("/api/admin/cod-rules", "PUT", rules);
}

export function blockCodPhone(phone, reason) {
  return adminSend("/api/admin/cod-rules/block", "POST", { phone, reason });
}

export function unblockCodPhone(phone) {
  return adminSend("/api/admin/cod-rules/unblock", "POST", { phone });
}
