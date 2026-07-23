// Browser Geolocation + free reverse-geocoding (OpenStreetMap Nominatim — no
// API key needed). Good enough for a small store's checkout volume; if order
// volume grows, swap reverseGeocode's fetch for Google Maps Geocoding API
// (paid, more accurate/faster) without changing the calling code below.

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Location isn't supported on this browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos.coords),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(new Error("Location access denied. Please enter your address manually."));
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          reject(new Error("Couldn't determine your location. Please enter it manually."));
        } else {
          reject(new Error("Location request timed out. Please enter your address manually."));
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

async function reverseGeocode(latitude, longitude) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&addressdetails=1`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("Couldn't look up your address. Please enter it manually.");
  const data = await res.json();
  const a = data.address || {};

  // Returned as separate fields (not one mashed string) so each maps to its own
  // checkout input — GPS can locate a street, never a flat/house number, so that
  // field is deliberately left for the customer to fill in themselves.
  const area = [a.road, a.suburb, a.neighbourhood].filter(Boolean).join(", ");

  return {
    area,
    city: a.city || a.town || a.village || a.county || "",
    state: a.state || "",
    pincode: a.postcode || "",
  };
}

// Detects the user's current position and resolves it to a shipping address.
// Throws an Error with a user-friendly message on any failure.
export async function detectCurrentLocation() {
  const { latitude, longitude } = await getCurrentPosition();
  return reverseGeocode(latitude, longitude);
}
