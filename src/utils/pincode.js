// Delivery-time estimation by pincode.
//
// There's no free public API for actual courier transit times (Amazon/Delhivery/etc.
// don't expose one without a merchant account), so we use a region-based zone map —
// the same North/West/East/South split couriers themselves quote at checkout —
// keyed off the customer's state. The free zippopotam.us postal API (CORS-enabled,
// no key) resolves pincode -> state. If the pincode isn't in its dataset (common for
// smaller towns) or the state isn't recognized, we fall back to a generic estimate.

const NORTH_STATES = [
  // "New Delhi" included because the free zippopotam.us postal API returns that
  // as the state name for Delhi pincodes, not "Delhi".
  "Haryana", "Punjab", "Delhi", "New Delhi", "Uttar Pradesh", "Uttarakhand",
  "Himachal Pradesh", "Jammu and Kashmir", "Ladakh", "Chandigarh", "Rajasthan",
];

const WEST_STATES = [
  "Maharashtra", "Gujarat", "Goa", "Madhya Pradesh", "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
];

const EAST_STATES = [
  "West Bengal", "Bihar", "Jharkhand", "Odisha", "Sikkim", "Assam",
  "Arunachal Pradesh", "Meghalaya", "Manipur", "Mizoram", "Nagaland", "Tripura",
];

const SOUTH_STATES = [
  "Andhra Pradesh", "Telangana", "Karnataka", "Kerala", "Tamil Nadu", "Puducherry",
  "Andaman and Nicobar Islands", "Lakshadweep",
];

const ZONE_DAYS = {
  north: { min: 3, max: 4 },
  west: { min: 5, max: 6 },
  east: { min: 5, max: 6 },
  south: { min: 5, max: 7 },
};

function zoneForState(state) {
  if (!state) return null;
  const s = state.trim().toLowerCase();
  if (NORTH_STATES.some((n) => n.toLowerCase() === s)) return "north";
  if (WEST_STATES.some((n) => n.toLowerCase() === s)) return "west";
  if (EAST_STATES.some((n) => n.toLowerCase() === s)) return "east";
  if (SOUTH_STATES.some((n) => n.toLowerCase() === s)) return "south";
  return null;
}

export async function lookupPincode(pincode) {
  try {
    const res = await fetch(`https://api.zippopotam.us/in/${pincode}`);
    if (!res.ok) return null;
    const data = await res.json();
    const place = data.places?.[0];
    if (!place) return null;
    return {
      city: place["place name"],
      state: place.state,
    };
  } catch {
    return null;
  }
}

// Resolves a pincode to { city, state, days: {min,max}, guessed }.
// `guessed: true` means the pincode/state wasn't recognized and we returned a
// generic India-wide estimate instead of a zone-based one.
export async function getDeliveryEstimate(pincode) {
  const place = await lookupPincode(pincode);
  const zone = zoneForState(place?.state);

  if (!zone) {
    return { city: place?.city || null, state: place?.state || null, days: { min: 3, max: 6 }, guessed: true };
  }

  return {
    city: place.city,
    state: place.state,
    days: ZONE_DAYS[zone],
    guessed: false,
  };
}
