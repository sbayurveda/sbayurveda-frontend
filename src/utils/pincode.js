// Delivery-time estimation by pincode, dispatched from our warehouse at
// PIN 136156 (Shahbad, Kurukshetra, Haryana).
//
// Estimates are quoted by region rather than by city size. Couriers price and
// route on distance from the origin, so which zone a state sits in predicts
// transit time far better than whether its city happens to be a metro — the
// previous version promised a Chennai address 3-5 days and a smaller Punjab
// town 5-7, which is backwards for a warehouse in Haryana.
//
// There is no free public API for real courier transit times, so these are the
// same regional bands couriers themselves quote. India Post's official pincode
// API (api.postalpincode.in, CORS-enabled, no key) resolves pincode ->
// district/state; it covers small-town Indian pincodes far better than
// general-purpose postal APIs, which return nothing even for our own warehouse.

// Zones are keyed by state because that's what the pincode lookup returns.
// Union territories sit with the region that actually serves them.
const ZONES = {
  north: {
    label: "North India",
    listLabel: "North Indian States",
    days: { min: 3, max: 4 },
    states: [
      "Haryana", "Punjab", "Delhi", "New Delhi", "Chandigarh",
      "Himachal Pradesh", "Uttarakhand", "Uttaranchal", "Uttar Pradesh",
      "Jammu and Kashmir", "Jammu & Kashmir", "Ladakh", "Rajasthan",
    ],
  },
  west: {
    label: "Western India",
    listLabel: "Western States",
    days: { min: 5, max: 6 },
    states: [
      "Maharashtra", "Gujarat", "Goa", "Madhya Pradesh",
      "Dadra and Nagar Haveli", "Daman and Diu",
      "Dadra and Nagar Haveli and Daman and Diu",
    ],
  },
  east: {
    label: "Eastern India",
    listLabel: "Eastern States",
    days: { min: 5, max: 6 },
    states: [
      "West Bengal", "Bihar", "Jharkhand", "Odisha", "Orissa", "Chhattisgarh",
      "Assam", "Sikkim", "Arunachal Pradesh", "Manipur", "Meghalaya",
      "Mizoram", "Nagaland", "Tripura",
    ],
  },
  south: {
    label: "South India",
    listLabel: "Southern States",
    days: { min: 5, max: 7 },
    states: [
      "Tamil Nadu", "Kerala", "Karnataka", "Andhra Pradesh", "Telangana",
      "Puducherry", "Pondicherry", "Lakshadweep",
      "Andaman and Nicobar Islands", "Andaman & Nicobar Islands",
    ],
  },
};

// Quoted when a pincode can't be resolved. Deliberately the widest band, so an
// unknown address is never promised something faster than we can manage.
const FALLBACK_DAYS = { min: 5, max: 7 };

// Shown on the checkout page so a customer can see the whole policy at a glance
// rather than only the band for their own pincode. Derived from ZONES rather
// than written out again, so the published table can never drift from the
// estimate a pincode actually returns.
export const DELIVERY_ZONES = Object.entries(ZONES).map(([key, zone]) => ({
  key,
  label: zone.listLabel,
  days: zone.days,
}));

function normalise(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function zoneForState(state) {
  const needle = normalise(state);
  if (!needle) return null;
  for (const [key, zone] of Object.entries(ZONES)) {
    if (zone.states.some((s) => normalise(s) === needle)) return { key, ...zone };
  }
  return null;
}

export async function lookupPincode(pincode) {
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
    if (!res.ok) return null;
    const [result] = await res.json();
    const office = result?.PostOffice?.[0];
    if (!office) return null;
    return { city: office.District, state: office.State };
  } catch {
    return null;
  }
}

// Resolves a pincode to { city, state, zone, zoneKey, days: {min,max}, guessed }.
// `guessed: true` means the pincode or its state wasn't recognised and the
// widest band was returned rather than a matched one.
export async function getDeliveryEstimate(pincode) {
  const place = await lookupPincode(pincode);

  if (!place) {
    return { city: null, state: null, zone: null, zoneKey: null, days: FALLBACK_DAYS, guessed: true };
  }

  const zone = zoneForState(place.state);
  if (!zone) {
    // The pincode resolved but its state isn't in any zone — a new UT, say.
    // Quote the widest band rather than guess at a region.
    return { city: place.city, state: place.state, zone: null, zoneKey: null, days: FALLBACK_DAYS, guessed: true };
  }

  return {
    city: place.city,
    state: place.state,
    zone: zone.label,
    zoneKey: zone.key,
    days: zone.days,
    guessed: false,
  };
}
