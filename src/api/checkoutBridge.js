// Client for the checkout bridge server (sb-ayurveda-server) that creates
// real Razorpay payments and real WooCommerce orders. Configured via
// VITE_API_BASE_URL at build time — until that's set, isBridgeConfigured()
// is false and Checkout.jsx falls back to a simulated order (clearly labeled
// as such) instead of pretending to process a real payment.

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export function isBridgeConfigured() {
  return Boolean(API_BASE);
}

async function postJson(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}

async function getJson(path) {
  const res = await fetch(`${API_BASE}${path}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Couldn't load this right now.");
  return data;
}

// These forward whatever they're given rather than naming each field.
//
// They used to destructure a fixed list, which silently dropped anything added
// later: `customer` and `attribution` were being passed in from Checkout but
// never left the browser. That meant the server had no delivery address saved
// when a payment started, so Razorpay's webhook could not create the order for
// a customer who never returned from their UPI app — the exact failure the
// webhook exists to prevent — and order attribution was never recorded either.
export function createPayment(payload) {
  return postJson("/api/create-payment", payload);
}

export function verifyPayment(payload) {
  return postJson("/api/verify-payment", payload);
}

export function placeCodOrder(payload) {
  return postJson("/api/cod-order", payload);
}

// Real, current status of an order straight from WooCommerce — used to keep
// "My Orders" accurate instead of frozen at whatever status checkout set.
// `contact` (the phone or email used on that order) is required — the server
// won't return order details without it, since order IDs are guessable.
export function getOrderStatus(orderId, contact) {
  return getJson(`/api/order/${encodeURIComponent(orderId)}?contact=${encodeURIComponent(contact)}`);
}

// Emails the store directly (prescription uploads, doctor appointment
// requests) instead of relying on the customer's own WhatsApp opening.
export function sendNotification({ subject, lines }) {
  return postJson("/api/notify", { subject, lines });
}
