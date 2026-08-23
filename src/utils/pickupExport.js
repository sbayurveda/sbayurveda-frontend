// Builds the courier's "IN Schedule Pickup V2" workbook from selected orders.
//
// Rather than generating a spreadsheet from scratch and hoping the columns line
// up, this opens the courier's own template file (public/pickup-template.xlsx),
// writes data rows into it, and zips it back up. Everything the courier's
// uploader checks — exact column names and order, the Data Definitions sheet,
// the dropdown validations on State / Product Type / Shipping Service, cell
// styling — survives untouched because we never rebuild those parts.
//
// Row 1 is the header and row 2 is the template's own help text, so data starts
// at row 3, which is also where the template's validation ranges begin.

import { unzipSync, zipSync, strToU8, strFromU8 } from "fflate";

const TEMPLATE_URL = "/pickup-template.xlsx";
const SHEET_PATH = "xl/worksheets/sheet2.xml"; // "IN Schedule Pickup V2"
const FIRST_DATA_ROW = 3;

// The template's State dropdown only accepts these exact spellings. WooCommerce
// stores Indian states either as a two-letter code or as a title-case name
// depending on how the address was entered, so both are mapped here — anything
// unrecognised is left blank rather than guessed, which shows up as an obvious
// gap in the sheet instead of a silently rejected upload.
const STATE_BY_CODE = {
  AN: "ANDAMAN & NICOBAR ISLANDS", AP: "ANDHRA PRADESH", AR: "ARUNACHAL PRADESH",
  AS: "ASSAM", BR: "BIHAR", CH: "CHANDIGARH", CT: "CHHATTISGARH", CG: "CHHATTISGARH",
  DN: "DADRA & NAGAR HAVELI", DD: "DAMAN & DIU", DL: "DELHI", GA: "GOA", GJ: "GUJARAT",
  HR: "HARYANA", HP: "HIMACHAL PRADESH", JK: "JAMMU & KASHMIR", JH: "JHARKHAND",
  KA: "KARNATAKA", KL: "KERALA", LA: "LADAKH", LD: "LAKSHADWEEP", MP: "MADHYA PRADESH",
  MH: "MAHARASHTRA", MN: "MANIPUR", ML: "MEGHALAYA", MZ: "MIZORAM", NL: "NAGALAND",
  OR: "ODISHA", OD: "ODISHA", PY: "PUDUCHERRY", PB: "PUNJAB", RJ: "RAJASTHAN",
  SK: "SIKKIM", TN: "TAMIL NADU", TS: "TELANGANA", TG: "TELANGANA", TR: "TRIPURA",
  UP: "UTTAR PRADESH", UT: "UTTARAKHAND", UK: "UTTARAKHAND", WB: "WEST BENGAL",
};

const VALID_STATES = new Set(Object.values(STATE_BY_CODE));

// A handful of names differ from a plain uppercase of what WooCommerce stores.
const STATE_ALIASES = {
  "ANDAMAN AND NICOBAR ISLANDS": "ANDAMAN & NICOBAR ISLANDS",
  "DADRA AND NAGAR HAVELI": "DADRA & NAGAR HAVELI",
  "DADRA AND NAGAR HAVELI AND DAMAN AND DIU": "DADRA & NAGAR HAVELI",
  "DAMAN AND DIU": "DAMAN & DIU",
  "JAMMU AND KASHMIR": "JAMMU & KASHMIR",
  "ORISSA": "ODISHA",
  "PONDICHERRY": "PUDUCHERRY",
  "NEW DELHI": "DELHI",
  "UTTARANCHAL": "UTTARAKHAND",
};

function normaliseState(raw) {
  const value = String(raw || "").trim();
  if (!value) return "";
  const upper = value.toUpperCase();
  if (STATE_BY_CODE[upper]) return STATE_BY_CODE[upper];
  if (VALID_STATES.has(upper)) return upper;
  if (STATE_ALIASES[upper]) return STATE_ALIASES[upper];
  return "";
}

// "Consignee's 10 mobile number without 0 or +91" — the last ten digits are the
// real number whatever prefix was typed.
function tenDigitPhone(raw) {
  return String(raw || "").replace(/\D/g, "").slice(-10);
}

// Dates are written as plain DD-MM-YYYY text taken straight off the ISO string,
// so no timezone conversion can shift an order onto the wrong day.
function formatDate(iso) {
  const [y, m, d] = String(iso || "").slice(0, 10).split("-");
  return y && m && d ? `${d}-${m}-${y}` : "";
}

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

// The courier rejects any address line over 60 characters — real uploads came
// back with "Ship To: Address Line 2 exceeding 60 characters".
const ADDRESS_FIELD_LIMIT = 60;

// Cut at the last comma or space before the limit so a line breaks between
// address parts rather than mid-word.
function splitAtBoundary(text, limit) {
  const value = String(text || "").trim();
  if (value.length <= limit) return [value, ""];
  const window = value.slice(0, limit + 1);
  const cut = Math.max(window.lastIndexOf(", "), window.lastIndexOf(" "));
  const at = cut > limit * 0.4 ? cut : limit;
  return [value.slice(0, at).replace(/[,\s]+$/, ""), value.slice(at).replace(/^[,\s]+/, "")];
}

// Checkout stores the flat/building as address_1 and joins area + landmark into
// address_2, so address_2 alone regularly ran past 60 characters — and when a
// customer had typed their whole address into both boxes it also repeated
// address_1 verbatim. This lays the address across the three fields the courier
// actually provides (Line 1 / Line 2 / Landmark), dropping that duplicated
// prefix, so nothing is lost and no single field is over the limit.
function addressLines(primary, secondary) {
  const line1Full = String(primary || "").trim();
  let rest = String(secondary || "").trim();

  if (line1Full && rest.toLowerCase().startsWith(line1Full.toLowerCase())) {
    rest = rest.slice(line1Full.length).replace(/^[,\s]+/, "");
  }

  const [line1, line1Overflow] = splitAtBoundary(line1Full, ADDRESS_FIELD_LIMIT);
  const combinedRest = [line1Overflow, rest].filter(Boolean).join(", ");
  const [line2, line2Overflow] = splitAtBoundary(combinedRest, ADDRESS_FIELD_LIMIT);
  const [landmark, dropped] = splitAtBoundary(line2Overflow, ADDRESS_FIELD_LIMIT);

  // `dropped` is text that wouldn't fit in any of the three fields. Removing a
  // duplicated Line 1 doesn't count — nothing is lost there.
  return { line1, line2, landmark, dropped };
}

export const STORE_DEFAULTS = {
  shipperName: "SB Ayurveda",
  addressLine1: "Ground Floor, Barara Road",
  addressLine2: "Near Saini Tour & Travels",
  addressLine3: "Babain",
  city: "Kurukshetra",
  state: "HARYANA",
  postalCode: "136156",
  email: "sbayurveda4@gmail.com",
  phone: "9350048002",
};

// Exactly the values the template's own dropdowns accept — anything else is
// rejected by the courier's uploader.
export const PRODUCT_TYPES = [
  "Health & Personal Care", "Beauty Product", "Grocery", "Luxury & Beauty",
  "Accessories", "Apparels", "Art and Craft", "Automotive", "Baby Product",
  "Biss", "Books", "DVD", "Electronics", "Furniture", "Home", "Home Improvement",
  "Jewelery", "Kitchen", "Large Appliances", "Lawn and Garden", "Luggage",
  "Musical instrument", "PC", "Pet Products", "Shoes", "Software", "Sports",
  "Toys", "Video Games", "Watches", "Wireless Accessories",
];

export const SHIPPING_SERVICES = ["STANDARD", "EXPRESS SHIPPING"];

// Rows the courier will reject outright, surfaced before the file is built so
// they can be fixed in WooCommerce rather than discovered at upload time.
export function validateOrdersForPickup(orders) {
  const problems = [];
  for (const order of orders) {
    const s = order.shipping || {};
    const b = order.billing || {};
    const issues = [];
    if (!normaliseState(s.state || b.state)) issues.push("unrecognised state");
    if (tenDigitPhone(b.phone || s.phone).length !== 10) issues.push("phone isn't 10 digits");
    if (!(s.postcode || b.postcode)) issues.push("no pincode");
    if (!(s.address_1 || b.address_1)) issues.push("no address");
    // The address is spread across Line 1 / Line 2 / Landmark, each capped at
    // 60 characters. Only warn when something genuinely won't fit in all three.
    if (addressLines(s.address_1 || b.address_1, s.address_2 || b.address_2).dropped) {
      issues.push("address too long — the end will be cut off");
    }
    if (issues.length) problems.push({ number: order.number, issues });
  }
  return problems;
}

export const PACKAGE_DEFAULTS = {
  lengthCm: 20,
  widthCm: 15,
  heightCm: 10,
  weightKg: 0.5,
  productType: "Health & Personal Care", // one of the template's dropdown values
  shippingService: "STANDARD",
};

function productDescription(order) {
  const parts = (order.lineItems || []).map((i) => `${i.name} x${i.qty}`);
  const joined = parts.join(", ");
  return joined.length > 200 ? `${joined.slice(0, 197)}...` : joined;
}

// The 45 template columns, in the template's own order. Index here == column
// index there, so this list is the single place the mapping is defined.
function rowValues(order, opts) {
  const s = order.shipping || {};
  const b = order.billing || {};
  const pkg = { ...PACKAGE_DEFAULTS, ...opts.pkg };
  const from = { ...STORE_DEFAULTS, ...opts.store };

  // Fall back to billing wherever the shipping address is blank — plenty of
  // orders only ever carry one address.
  const name = [s.first_name || b.first_name, s.last_name || b.last_name]
    .filter(Boolean).join(" ").trim();
  const isCod = String(order.paymentMethod || "").toLowerCase().includes("cod");

  const address = addressLines(
    s.address_1 || b.address_1,
    s.address_2 || b.address_2
  );

  return [
    order.number,                                   // A  Client Reference ID
    name.slice(0, ADDRESS_FIELD_LIMIT),             // B  Ship To: Recipient Name
    address.line1,                                  // C  Address Line 1
    address.line2,                                  // D  Address Line 2
    address.landmark,                               // E  Address Landmark
    s.city || b.city || "",                         // F  City/Town
    normaliseState(s.state || b.state),             // G  State
    s.postcode || b.postcode || "",                 // H  Postal Code
    b.email || "",                                  // I  Email Address
    tenDigitPhone(b.phone || s.phone),              // J  Phone Number
    productDescription(order),                      // K  Product Description
    pkg.productType,                                // L  Product Type
    Number(pkg.lengthCm),                           // M  Length (cm)
    Number(pkg.widthCm),                            // N  Width (cm)
    Number(pkg.heightCm),                           // O  Height (cm)
    Number(pkg.weightKg),                           // P  Gross Weight (KG)
    order.number,                                   // Q  Invoice Number
    formatDate(order.dateCreated),                  // R  Invoice Date
    round2(order.itemsTotal),                       // S  Product Value (ex tax)
    round2(order.cgst),                             // T  CGST Value
    round2(order.sgst),                             // U  SGST Value
    round2(order.igst),                             // V  IGST Value
    isCod ? "YES" : "NO",                           // W  CollectOnDelivery
    pkg.shippingService,                            // X  Shipping Service
    opts.pickupDate ? formatDate(opts.pickupDate) : "", // Y  Pickup Date
    opts.pickupTime || "",                          // Z  Pickup Time (HH:MM)
    "",                                             // AA Desired delivery date
    from.shipperName,                               // AB Shipper Name
    from.addressLine1,                              // AC Ship From: Address 1
    from.addressLine2,                              // AD Ship From: Address 2
    from.addressLine3,                              // AE Ship From: Address 3
    from.city,                                      // AF Ship From: City
    from.state,                                     // AG Ship From: State
    from.postalCode,                                // AH Ship From: Postal code
    from.email,                                     // AI Ship From: Email
    from.phone,                                     // AJ Ship From: Phone
    from.addressLine1,                              // AK Return To: Address 1
    from.addressLine2,                              // AL Return To: Address 2
    from.addressLine3,                              // AM Return To: Address 3
    from.city,                                      // AN Return To: City
    from.state,                                     // AO Return To: State
    from.postalCode,                                // AP Return To: Postal code
    from.email,                                     // AQ Return To: Email
    from.phone,                                     // AR Return To: Phone
    "",                                             // AS Error Message
  ];
}

function colLetter(index) {
  let n = index + 1;
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

function xmlEscape(value) {
  return String(value)
    // Control characters are not legal in XML and would corrupt the workbook.
    // eslint-disable-next-line no-control-regex -- stripping them is the point
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildCell(ref, value) {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "number") {
    return Number.isFinite(value) ? `<c r="${ref}"><v>${value}</v></c>` : "";
  }
  // Inline strings keep us from having to rewrite sharedStrings.xml, which the
  // template's own header cells still reference by index.
  return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;
}

function buildRow(values, rowNumber) {
  const cells = values
    .map((value, i) => buildCell(`${colLetter(i)}${rowNumber}`, value))
    .join("");
  return `<row r="${rowNumber}" spans="1:${values.length}">${cells}</row>`;
}

export async function buildPickupWorkbook(orders, opts = {}) {
  const res = await fetch(TEMPLATE_URL);
  if (!res.ok) throw new Error("Couldn't load the courier template file.");
  const files = unzipSync(new Uint8Array(await res.arrayBuffer()));

  const sheetXml = strFromU8(files[SHEET_PATH]);
  const match = sheetXml.match(/<sheetData>([\s\S]*?)<\/sheetData>/);
  if (!match) throw new Error("The courier template looks malformed.");

  // Keep the header and help-text rows exactly as they are; drop the template's
  // blank placeholder rows so old empty rows can't trail the real data.
  const keptRows = (match[1].match(/<row[^>]*\/>|<row[^>]*>[\s\S]*?<\/row>/g) || [])
    .filter((row) => /\br="([12])"/.test(row));

  const dataRows = orders.map((order, i) => buildRow(rowValues(order, opts), FIRST_DATA_ROW + i));

  let updated = sheetXml.replace(
    /<sheetData>[\s\S]*?<\/sheetData>/,
    `<sheetData>${keptRows.join("")}${dataRows.join("")}</sheetData>`
  );

  // Keep the declared sheet dimension in step with what we actually wrote.
  const lastRow = FIRST_DATA_ROW + Math.max(orders.length, 1) - 1;
  updated = updated.replace(
    /<dimension ref="[^"]*"\/>/,
    `<dimension ref="A1:${colLetter(44)}${lastRow}"/>`
  );

  files[SHEET_PATH] = strToU8(updated);
  return zipSync(files, { level: 6 });
}

export async function downloadPickupWorkbook(orders, opts = {}) {
  const zipped = await buildPickupWorkbook(orders, opts);
  const blob = new Blob([zipped], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pickup-${new Date().toISOString().slice(0, 10)}-${orders.length}-orders.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on the next tick so the download has definitely started.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
