// Delivery-time estimation by pincode, dispatched from our warehouse at
// PIN 136156 (Shahbad, Kurukshetra, Haryana).
//
// There's no free public API for actual courier transit times (Amazon/Delhivery/etc.
// don't expose one without a merchant account), so we use a tier map based on
// proximity to the warehouse and city size — the same rough tiers couriers
// themselves quote at checkout. The free zippopotam.us postal API (CORS-enabled,
// no key) resolves pincode -> city/state. If the pincode isn't in its dataset
// (common for smaller towns) or the state isn't recognized, we fall back to a
// generic estimate.

// Tier 1: Haryana, Punjab, and immediate neighbors of the Kurukshetra warehouse.
const NEARBY_STATES = ["Haryana", "Punjab", "Delhi", "New Delhi", "Chandigarh"];

// Tier 2: major metro cities elsewhere in India (matched by city name, since a
// metro can sit in any state).
const METRO_CITIES = [
  "Mumbai", "Bengaluru", "Bangalore", "Chennai", "Kolkata", "Hyderabad",
  "Pune", "Ahmedabad", "Surat", "Jaipur", "Lucknow", "Kanpur", "Nagpur",
];

const TIER_DAYS = {
  nearby: { min: 2, max: 3 },
  metro: { min: 3, max: 5 },
  other: { min: 5, max: 7 },
};

function isNearby(state) {
  if (!state) return false;
  const s = state.trim().toLowerCase();
  return NEARBY_STATES.some((n) => n.toLowerCase() === s);
}

function isMetro(city) {
  if (!city) return false;
  const c = city.trim().toLowerCase();
  return METRO_CITIES.some((m) => m.toLowerCase() === c);
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
// `guessed: true` means the pincode/city/state wasn't recognized and we
// returned a generic India-wide (Tier 2/3) estimate instead of a matched one.
export async function getDeliveryEstimate(pincode) {
  const place = await lookupPincode(pincode);

  if (!place) {
    return { city: null, state: null, days: TIER_DAYS.other, guessed: true };
  }

  if (isNearby(place.state)) {
    return { city: place.city, state: place.state, days: TIER_DAYS.nearby, guessed: false };
  }

  if (isMetro(place.city)) {
    return { city: place.city, state: place.state, days: TIER_DAYS.metro, guessed: false };
  }

  return { city: place.city, state: place.state, days: TIER_DAYS.other, guessed: false };
}
