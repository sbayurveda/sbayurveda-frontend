// The tax invoice this shop already issues, drawn as a PDF.
//
// Every coordinate below was measured from an invoice the shop had already
// sent a customer, so the document the dashboard produces is the same one
// their buyers and their accountant already recognise. Nothing here is a
// design decision — where a number sits, which column it falls in, the black
// header band, the hyphenated amount in words, all of it is copied.
//
// A4 at 595.28 x 841.89 pt. The reference's own origin is bottom-left; the
// numbers below are kept in that frame and flipped once, in `at()`, so they
// can be checked against the original without arithmetic.

import { jsPDF } from "jspdf";

const PAGE_H = 841.89;
const LEFT = 56.693;
const RIGHT = 538.587;

// Column edges of the items table, exactly as the reference rules them.
const COLS = [56.693, 225.356, 253.075, 314.841, 365.789, 427.556, 476.821, 538.587];
const PAD = 3.375;              // text inset from a column's left edge
const RUPEE_GAP = 5.724;        // space between the rupee sign and its number

const ASSETS = "/invoice";
let assets = null;

async function asBase64(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load ${url}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(s);
}

/**
 * Fetches the logo, signature and fonts once.
 *
 * They are files rather than inlined base64 so the dashboard bundle does not
 * carry 110KB it only needs when someone asks for an invoice.
 */
export async function loadInvoiceAssets() {
  if (assets) return assets;
  const [logo, signature, regular, bold, rupee] = await Promise.all([
    asBase64(`${ASSETS}/logo.png`),
    asBase64(`${ASSETS}/signature.jpg`),
    asBase64(`${ASSETS}/OpenSans-Regular.ttf`),
    asBase64(`${ASSETS}/OpenSans-Bold.ttf`),
    asBase64(`${ASSETS}/Rupee.ttf`),
  ]);
  assets = { logo, signature, regular, bold, rupee };
  return assets;
}

export function money(n) {
  const v = Number(n) || 0;
  const [whole, frac] = Math.abs(v).toFixed(2).split(".");
  const last3 = whole.slice(-3);
  const rest = whole.slice(0, -3);
  // Indian grouping: 1,23,456.78.
  const grouped = rest ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${last3}` : last3;
  return `${v < 0 ? "-" : ""}${grouped}.${frac}`;
}

// The reference's own font set: Open Sans for text, and a second font used
// only for the rupee sign, because Open Sans has no glyph for it.
function installFonts(doc, a) {
  doc.addFileToVFS("OpenSans-Regular.ttf", a.regular);
  doc.addFont("OpenSans-Regular.ttf", "OpenSans", "normal");
  doc.addFileToVFS("OpenSans-Bold.ttf", a.bold);
  doc.addFont("OpenSans-Bold.ttf", "OpenSans", "bold");
  doc.addFileToVFS("Rupee.ttf", a.rupee);
  doc.addFont("Rupee.ttf", "Rupee", "normal");
}

const at = (y) => PAGE_H - y;   // reference frame -> jsPDF's top-left frame

export function drawInvoice(doc, inv, a) {
  const text = (s, x, y, { bold = false, size = 9, align = "left", color = 0 } = {}) => {
    doc.setFont("OpenSans", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(color);
    doc.text(String(s ?? ""), x, at(y), { align });
  };

  // A money cell: the rupee sign in its own font, then the figure.
  const rupee = (value, x, y, { bold = false } = {}) => {
    doc.setFont("Rupee", "normal");
    doc.setFontSize(9);
    doc.setTextColor(0);
    doc.text("₹", x, at(y));
    text(money(value), x + RUPEE_GAP, y, { bold });
  };

  // The same cell, right-aligned to the totals block's edge.
  const rupeeRight = (value, edge, y, { bold = false } = {}) => {
    doc.setFont("OpenSans", bold ? "bold" : "normal");
    doc.setFontSize(9);
    const w = doc.getTextWidth(money(value));
    rupee(value, edge - w - RUPEE_GAP, y, { bold });
  };

  const rule = (x1, y, x2) => {
    doc.setDrawColor(0);
    doc.setLineWidth(0.75);
    doc.line(x1, at(y), x2, at(y));
  };

  // White page body, as the reference paints it.
  doc.setFillColor(255, 255, 255);
  doc.rect(LEFT, at(813.543), RIGHT - LEFT, 728.504, "F");

  doc.addImage(a.logo, "PNG", 57.443, at(812.793), 102.87, 85.039);

  // Seller, top right.
  let y = 802.007;
  text(inv.seller.name, 346.579, y, { bold: true });
  for (const line of inv.seller.addressLines) { y -= 13.484; text(line, 346.579, y); }
  y -= 13.484; text(`GSTIN: ${inv.seller.gstin}`, 346.579, y);
  if (inv.seller.email) { y -= 13.484; text(`Email: ${inv.seller.email}`, 346.579, y); }

  // Buyer, left.
  text("BILL TO", LEFT, 682.201, { bold: true, size: 16 });
  const b = inv.buyer;
  const buyerLines = [b.name, ...b.addressLines, b.city, b.stateCode, b.postcode, b.phone]
    .map((v) => String(v || "").trim())
    .filter(Boolean);
  buyerLines.forEach((line, i) => text(line, 57.443, 653.794 - i * 13.484));

  // Invoice meta, right.
  // Order Number joins the block because the invoice number is no longer the
  // order number. Without it a printed invoice could not be traced back to
  // the order it belongs to.
  const meta = [
    ["Invoice Date:", inv.invoiceDateLong],
    ["Invoice Number", inv.invoiceNumber || "(not issued)"],
    ["Order Number", inv.orderNumber],
    ["Order Date:", inv.orderDateLong],
    ["Payment Method:", inv.payment.method],
  ];
  meta.forEach(([label, value], i) => {
    text(label, 347.329, 653.044 - i * 14.984);
    text(value, 442.958, 653.044 - i * 14.984);
  });
  text("Items HSN Code", 347.329, 593.109, { bold: true });
  text(inv.hsnCode, 442.958, 593.109, { bold: true });

  // Items table. The header is a black band with white text.
  const headers = ["Product", "Qty", "MRP", "Disc %", "Rate", `Tax ${inv.lines[0]?.ratePct ?? 5}%`, "Amount"];
  doc.setFillColor(0, 0, 0);
  for (let i = 0; i < COLS.length - 1; i += 1) {
    doc.rect(COLS[i], at(553.832), COLS[i + 1] - COLS[i], 20.234, "F");
  }
  headers.forEach((h, i) => text(h, COLS[i] + PAD, 539.67, { bold: true, color: 255 }));
  rule(LEFT, 554.207, RIGHT);
  rule(LEFT, 533.223, RIGHT);

  // Rows. A long product name wraps inside its column rather than running on.
  let rowTop = 533.223;
  for (const l of inv.lines) {
    doc.setFont("OpenSans", "normal");
    doc.setFontSize(9);
    const nameLines = doc.splitTextToSize(String(l.description || ""), COLS[1] - COLS[0] - PAD * 2);
    const baseline = rowTop - 14.537;
    nameLines.forEach((t, i) => text(t, COLS[0] + PAD, baseline - i * 13.483));
    text(l.qty, COLS[1] + PAD, baseline);
    rupee(l.mrp, COLS[2] + PAD, baseline);
    text(`${l.discPct.toFixed(2)}%`, COLS[3] + PAD, baseline);
    rupee(l.taxable, COLS[4] + PAD, baseline);
    rupee(inv.intraState ? l.cgst + l.sgst : l.igst, COLS[5] + PAD, baseline);
    rupee(l.total, COLS[6] + PAD, baseline);
    // The reference's row band is 34.467pt and already holds a name that wraps
    // onto a second line; only a third line and beyond need more room.
    const height = 34.467 + Math.max(0, nameLines.length - 2) * 13.483;
    rowTop -= height;
    rule(LEFT, rowTop, RIGHT);
  }

  // Totals, right. One row per figure, each ruled underneath.
  const totalRows = [
    ["Taxable Amount", inv.totals.taxable, false],
    ...(inv.intraState
      ? [["CGST", inv.totals.cgst, false], ["SGST", inv.totals.sgst, false]]
      : [["IGST", inv.totals.igst, false]]),
    ...(inv.totals.charge ? [[inv.chargeLabel, inv.totals.charge, false]] : []),
    ["Total Payable", inv.totals.grand, true],
  ];
  let ty = rowTop - 14.537;
  for (const [label, value, bold] of totalRows) {
    text(label, 349.204, ty, { bold: true });
    rupeeRight(value, 526.9, ty, { bold });
    rule(345.829, ty - 6.447, 442.208);
    rule(442.208, ty - 6.447, RIGHT);
    ty -= 20.984;
  }

  // Words and quantity, left, beside the totals.
  const wordsY = rowTop - 26.162;
  text("Total Amounts (In Words):", LEFT, wordsY, { bold: true });
  text(inv.amountInWords, 173.495, wordsY);
  text("Total Quantity:", LEFT, wordsY - 26.968, { bold: true });
  text(String(inv.totals.quantity), 124.571, wordsY - 26.968);

  // Signature block.
  text(`For ${inv.seller.name}`, 464.649, 380.409, { bold: true });
  doc.addImage(a.signature, "JPEG", 445.295, at(364.228), 92.542, 52.5);
  text("Authorized Signatory", 442.923, 300.941, { bold: true });

  // Jurisdiction note along the foot.
  rule(LEFT, 90.85, RIGHT);
  text(
    "In Case Of Any Dispute, The Matter Shall Be Subject To The Exclusive Jurisdiction Of The Courts In Kurukshetra,",
    66.669, 74.252,
  );
  text("Haryana Only", 269.101, 60.769);
  return doc;
}

export function invoiceFilename(inv) {
  return `Invoice-${String(inv.invoiceNumber).replace(/[^A-Za-z0-9_-]/g, "")}.pdf`;
}

export async function invoicePdf(inv) {
  const a = await loadInvoiceAssets();
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  installFonts(doc, a);
  return drawInvoice(doc, inv, a);
}

export async function invoicesPdf(invoices) {
  const a = await loadInvoiceAssets();
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  installFonts(doc, a);
  invoices.forEach((inv, i) => {
    if (i > 0) doc.addPage();
    drawInvoice(doc, inv, a);
  });
  return doc;
}
