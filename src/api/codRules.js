// What the checkout needs to know about cash on delivery.
//
// Served by the console rather than compiled in, so the limits and the
// per-product switches can change without a deploy. Carries no phone numbers:
// the page only ever needs to ask about the one in front of it, and publishing
// a list of customers who have been refused would be a privacy problem for no
// benefit.

const API_BASE = import.meta.env.VITE_API_BASE_URL;

// Falls back to offering nothing special rather than throwing: a checkout that
// breaks because a settings call failed is worse than one that briefly offers
// COD it will refuse a moment later on the server.
const FALLBACK = { enabled: true, minOrderValue: 300, maxOrderValue: 2200, fee: 36, blockedProductIds: [] };

export async function fetchCodRules() {
  if (!API_BASE) return FALLBACK;
  try {
    const res = await fetch(`${API_BASE}/api/cod-rules`);
    if (!res.ok) return FALLBACK;
    const d = await res.json();
    return {
      enabled: d.enabled !== false,
      minOrderValue: Number(d.minOrderValue ?? FALLBACK.minOrderValue),
      maxOrderValue: Number(d.maxOrderValue ?? FALLBACK.maxOrderValue),
      fee: Number(d.fee ?? FALLBACK.fee),
      blockedProductIds: Array.isArray(d.blockedProductIds) ? d.blockedProductIds.map(Number) : [],
    };
  } catch {
    return FALLBACK;
  }
}

// Asked once the customer has typed a full phone number, so the reason can be
// shown before they fill in the rest of the form.
export async function isPhoneBlocked(phone) {
  if (!API_BASE) return false;
  try {
    const res = await fetch(`${API_BASE}/api/cod-rules/phone?phone=${encodeURIComponent(phone)}`);
    if (!res.ok) return false;
    return Boolean((await res.json()).blocked);
  } catch {
    return false;
  }
}
