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
