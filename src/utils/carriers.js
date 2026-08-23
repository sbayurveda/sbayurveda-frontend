// Couriers this store dispatches with.
//
// `trackingUrl` builds a customer-facing tracking link from an AWB / tracking
// number. It's only filled in for formats confirmed against this store's own
// live orders — for the rest the admin pastes the link the courier gives them,
// because auto-generating a plausible-but-wrong tracking URL would send
// customers to a dead page, which is worse than asking for one paste.
//
// `api: "planned"` marks carriers we intend to talk to programmatically later.
// Nothing here calls an API today: the dashboard writes carrier name, tracking
// number and tracking URL, and an integration would eventually fill those same
// three fields from an API response instead of from the form. That keeps the
// rest of the app — storefront tracking button, courier export, wp-admin —
// working identically whichever way the values arrived.

export const CARRIERS = [
  {
    id: "delhivery",
    name: "Delhivery",
    // Confirmed against real orders already in this store.
    trackingUrl: (code) => `https://www.delhivery.com/track/package/${encodeURIComponent(code)}`,
  },
  { id: "amazon", name: "Amazon Shipping", api: "planned" },
  { id: "xpressbees", name: "XpressBees" },
  { id: "bluedart", name: "Blue Dart" },
  { id: "dtdc", name: "DTDC" },
  { id: "indiapost", name: "India Post" },
  { id: "shiprocket", name: "Shiprocket" },
  { id: "other", name: "Other" },
];

export function findCarrier(nameOrId) {
  const needle = String(nameOrId || "").trim().toLowerCase();
  if (!needle) return null;
  return (
    CARRIERS.find((c) => c.id === needle) ||
    CARRIERS.find((c) => c.name.toLowerCase() === needle) ||
    null
  );
}

// Returns "" when we don't have a confirmed URL format, which the UI treats as
// "ask the admin to paste it".
export function buildTrackingUrl(carrierNameOrId, trackingCode) {
  const carrier = findCarrier(carrierNameOrId);
  const code = String(trackingCode || "").trim();
  if (!carrier?.trackingUrl || !code) return "";
  return carrier.trackingUrl(code);
}
