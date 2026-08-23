// Works out where a visitor came from, so orders carry a real Source in
// wp-admin instead of a blank.
//
// WooCommerce normally collects this with a script on its own checkout page.
// Orders here are created through the API and never load that page, so the
// column was empty on every order. We capture the same signals on the
// customer's first page view and send them along when the order is placed.
//
// Everything is read from the current page and the referring URL — no
// fingerprinting, no third-party calls, nothing kept beyond the visit.

const SESSION_KEY = "sba-attribution";
const VISIT_COUNT_KEY = "sba-visit-count";

const SEARCH_ENGINES = [
  "google.", "bing.", "yahoo.", "duckduckgo.", "baidu.", "yandex.",
  "ecosia.", "search.brave.", "qwant.", "startpage.",
];

function deviceType() {
  const ua = navigator.userAgent;
  if (/iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua)) return "Tablet";
  if (/Mobi|Android|iPhone|iPod|Windows Phone/i.test(ua)) return "Mobile";
  return "Desktop";
}

// Mirrors how WooCommerce itself classifies a visit, so the Source column reads
// the same as it would for an order placed through the WooCommerce checkout.
function classify(params, referrerHost) {
  if (params.get("utm_source") || params.get("utm_medium")) return "utm";
  if (!referrerHost) return "typein"; // direct — typed the address or a bookmark
  if (SEARCH_ENGINES.some((engine) => referrerHost.includes(engine))) return "organic";
  return "referral";
}

function readCurrent() {
  const params = new URLSearchParams(window.location.search);

  let referrer = "";
  let referrerHost = "";
  try {
    if (document.referrer) {
      const url = new URL(document.referrer);
      // A link from one page of this site to another isn't a traffic source.
      if (url.hostname !== window.location.hostname) {
        referrer = document.referrer;
        referrerHost = url.hostname.toLowerCase();
      }
    }
  } catch {
    // Malformed referrer — treat as direct rather than guessing.
  }

  let visitCount = 1;
  try {
    visitCount = Number(localStorage.getItem(VISIT_COUNT_KEY) || 0) + 1;
    localStorage.setItem(VISIT_COUNT_KEY, String(visitCount));
  } catch {
    // Storage unavailable (private mode) — a count of 1 is a fine default.
  }

  return {
    sourceType: classify(params, referrerHost),
    utmSource: params.get("utm_source") || (referrerHost || undefined),
    utmMedium: params.get("utm_medium") || undefined,
    utmCampaign: params.get("utm_campaign") || undefined,
    utmContent: params.get("utm_content") || undefined,
    utmTerm: params.get("utm_term") || undefined,
    referrer: referrer || undefined,
    sessionEntry: window.location.href,
    sessionStartTime: new Date().toISOString().slice(0, 19).replace("T", " "),
    sessionPages: 1,
    sessionCount: visitCount,
    deviceType: deviceType(),
    userAgent: navigator.userAgent,
  };
}

// Called once when the app boots. The first page view of a visit is the one
// that carries the referrer, so later navigation must not overwrite it.
export function initAttribution() {
  try {
    if (sessionStorage.getItem(SESSION_KEY)) {
      bumpPageCount();
      return;
    }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(readCurrent()));
  } catch {
    // Non-fatal: attribution is a nice-to-have, never a reason to break checkout.
  }
}

function bumpPageCount() {
  try {
    const data = JSON.parse(sessionStorage.getItem(SESSION_KEY));
    data.sessionPages = Number(data.sessionPages || 1) + 1;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export function getAttribution() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY)) || undefined;
  } catch {
    return undefined;
  }
}
