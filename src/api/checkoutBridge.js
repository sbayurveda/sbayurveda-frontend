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

export function createPayment({ items, couponCode }) {
  return postJson("/api/create-payment", { items, couponCode });
}

export function verifyPayment({ razorpay_order_id, razorpay_payment_id, razorpay_signature, customer, items }) {
  return postJson("/api/verify-payment", {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    customer,
    items,
  });
}

export function placeCodOrder({ items, customer, couponCode }) {
  return postJson("/api/cod-order", { items, customer, couponCode });
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
