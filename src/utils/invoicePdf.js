// Drawing a tax invoice as a real PDF.
//
// The old invoice was an HTML modal printed with window.print(). That is what
// produced the rows of dots and the "A B C D" letter spacing: the browser's
// print pipeline re-flows the page and, saving to PDF, can space glyphs
// individually. Nothing in the CSS could reliably stop it, because the
// rendering was never ours to control.
//
// This writes the PDF directly, so the text is real text, positioned once.
//
// Amounts are written "Rs." rather than "₹" deliberately: the PDF standard
// fonts use WinAnsi encoding, which has no rupee sign, and a glyph that is not
// in the font comes out as the wrong character or nothing at all. Embedding a
// Unicode font would add several hundred kilobytes to the bundle to change one
// symbol on a document where "Rs." is entirely conventional.

import { jsPDF } from "jspdf";

// The standard PDF fonts use WinAnsi encoding. A character outside it is not
// flagged — it is simply dropped, which is how an em dash disappeared from the
// footer without anyone noticing. Product names are the real risk: a dash, a
// curly quote or a Devanagari name would silently lose characters on a
// document used to file claims.
//
// Common typography is mapped to its ASCII equivalent; anything else still
// outside Latin-1 becomes "?", so a problem is visible rather than invisible.
const SUBSTITUTIONS = [
  [/[\u2010-\u2015]/g, "-"],      // hyphens and dashes
  [/[\u2018\u2019\u201A\u201B]/g, "'"],
  [/[\u201C\u201D\u201E\u201F]/g, '"'],
  [/\u2026/g, "..."],
  [/\u20B9/g, "Rs."],              // the rupee sign has no glyph here
  [/[\u00A0\u2007\u202F]/g, " "],
  [/[\u2022\u00B7]/g, "-"],
];

export function pdfSafe(text) {
  let out = String(text ?? "");
  for (const [re, to] of SUBSTITUTIONS) out = out.replace(re, to);
  // eslint-disable-next-line no-control-regex
  return out.replace(/[^\u0000-\u00FF]/g, "?");
}

const PAGE = { w: 210, h: 297 };          // A4 portrait, millimetres
const M = { left: 14, right: 14, top: 14, bottom: 16 };
const CONTENT_W = PAGE.w - M.left - M.right;

export function money(n) {
  const v = Number(n) || 0;
  const neg = v < 0;
  // Indian grouping: 1,23,456.78 rather than 123,456.78.
  const [whole, frac] = Math.abs(v).toFixed(2).split(".");
  const last3 = whole.slice(-3);
  const rest = whole.slice(0, -3);
  const grouped = rest ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${last3}` : last3;
  return `${neg ? "-" : ""}Rs. ${grouped}.${frac}`;
}

function lineBlock(doc, text, x, y, maxWidth, lineHeight = 4.2) {
  const parts = doc.splitTextToSize(pdfSafe(text), maxWidth);
  parts.forEach((t, i) => doc.text(t, x, y + i * lineHeight));
  return y + parts.length * lineHeight;
}

// Column layout for the items table, as fractions of the content width.
const COLS = [
  { key: "idx", label: "#", w: 7, align: "left" },
  { key: "description", label: "Description", w: 62, align: "left" },
  { key: "hsn", label: "HSN", w: 16, align: "left" },
  { key: "qty", label: "Qty", w: 11, align: "right" },
  { key: "taxable", label: "Taxable", w: 24, align: "right" },
  { key: "tax1", label: "", w: 22, align: "right" },
  { key: "tax2", label: "", w: 22, align: "right" },
  { key: "total", label: "Total", w: 24, align: "right" },
];

function colX(i) {
  return M.left + COLS.slice(0, i).reduce((s, c) => s + c.w, 0);
}

function cell(doc, i, y, text, bold = false) {
  const c = COLS[i];
  doc.setFont("helvetica", bold ? "bold" : "normal");
  const x = c.align === "right" ? colX(i) + c.w - 1.5 : colX(i) + 1.5;
  doc.text(pdfSafe(text), x, y, { align: c.align });
}

function header(doc, inv, pageNo) {
  let y = M.top;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(pdfSafe(inv.seller.name), M.left, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  let ly = y + 5;
  for (const l of inv.seller.addressLines) {
    doc.text(pdfSafe(l), M.left, ly);
    ly += 4;
  }
  doc.text(`GSTIN: ${inv.seller.gstin}`, M.left, ly);
  ly += 4;

  // Right-hand block: what the document is.
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("TAX INVOICE", PAGE.w - M.right, y, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Invoice No:  ${inv.invoiceNumber}`, PAGE.w - M.right, y + 6, { align: "right" });
  doc.text(`Date:  ${inv.invoiceDate}`, PAGE.w - M.right, y + 10.5, { align: "right" });
  if (inv.transactionType && inv.transactionType !== "Shipment") {
    doc.setFont("helvetica", "bold");
    doc.text(pdfSafe(inv.transactionType.toUpperCase()), PAGE.w - M.right, y + 15, { align: "right" });
  }
  if (pageNo > 1) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`(continued — page ${pageNo})`, PAGE.w - M.right, y + 19, { align: "right" });
  }

  y = Math.max(ly, y + 16) + 3;
  doc.setDrawColor(190);
  doc.line(M.left, y, PAGE.w - M.right, y);
  return y + 5;
}

function parties(doc, inv, y) {
  const colW = CONTENT_W / 2 - 4;
  const b = inv.buyer;
  const s = inv.buyer.shipping || b;

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("BILL TO", M.left, y);
  doc.text("SHIP TO", M.left + CONTENT_W / 2, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const draw = (p, x) => {
    let yy = y + 5;
    yy = lineBlock(doc, p.name || "—", x, yy, colW);
    for (const l of p.addressLines) yy = lineBlock(doc, l, x, yy, colW);
    const where = [p.city, p.state, p.postcode].filter(Boolean).join(", ");
    if (where) yy = lineBlock(doc, where, x, yy, colW);
    if (p.phone) yy = lineBlock(doc, `Phone: ${p.phone}`, x, yy, colW);
    return yy;
  };
  const endY = Math.max(draw(b, M.left), draw(s, M.left + CONTENT_W / 2));

  doc.setFontSize(8.5);
  doc.text(pdfSafe(`Place of supply: ${inv.placeOfSupply || "-"}`), M.left, endY + 2);
  doc.text(
    pdfSafe(`Payment: ${inv.payment.method}${inv.payment.isCod ? (inv.payment.isPaid ? " (collected)" : " (to collect)") : ""}`),
    PAGE.w - M.right, endY + 2, { align: "right" },
  );
  return endY + 7;
}

function tableHead(doc, inv, y) {
  COLS[5].label = inv.intraState ? "CGST" : "IGST";
  COLS[6].label = inv.intraState ? "SGST" : "";

  doc.setFillColor(242, 247, 244);
  doc.rect(M.left, y - 4, CONTENT_W, 6.5, "F");
  doc.setFontSize(8);
  COLS.forEach((c, i) => c.label && cell(doc, i, y, c.label, true));
  return y + 5;
}

function itemRow(doc, inv, y, idx, l) {
  doc.setFontSize(8.5);
  const nameLines = doc.splitTextToSize(pdfSafe(l.description), COLS[1].w - 3);
  cell(doc, 0, y, idx);
  doc.setFont("helvetica", "normal");
  nameLines.forEach((t, i) => doc.text(t, colX(1) + 1.5, y + i * 4));
  cell(doc, 2, y, l.hsn || "");
  cell(doc, 3, y, l.qty ?? "");
  cell(doc, 4, y, money(l.taxable));
  cell(doc, 5, y, money(inv.intraState ? l.cgst : l.igst));
  if (inv.intraState) cell(doc, 6, y, money(l.sgst));
  cell(doc, 7, y, money(l.total));
  return y + Math.max(nameLines.length * 4, 4) + 1.6;
}

function totals(doc, inv, y) {
  const labelX = PAGE.w - M.right - 46;
  const valueX = PAGE.w - M.right;
  doc.setDrawColor(190);
  doc.line(M.left, y, PAGE.w - M.right, y);
  y += 5;

  const row = (label, value, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(bold ? 10 : 9);
    doc.text(label, labelX, y);
    doc.text(value, valueX, y, { align: "right" });
    y += bold ? 6 : 4.8;
  };

  row("Taxable value", money(inv.totals.taxable));
  if (inv.intraState) {
    row("CGST", money(inv.totals.cgst));
    row("SGST", money(inv.totals.sgst));
  } else {
    row("IGST", money(inv.totals.igst));
  }
  y += 1;
  row("Total", money(inv.totals.grand), true);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  lineBlock(doc, `Amount in words: ${inv.amountInWords}`, M.left, y - 10, CONTENT_W - 50);

  // An invoice that does not add up to the order must say so on its face
  // rather than being filed as if it did.
  if (!inv.reconciles) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(170, 0, 0);
    doc.text(
      `This invoice differs from the order total by ${money(inv.difference)} — check before filing.`,
      M.left, y + 2,
    );
    doc.setTextColor(0);
    y += 6;
  }
  return y;
}

function footer(doc, inv) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(110);
  doc.text(
    "Declaration: the particulars above are true and correct, and the value shown is the price actually charged.",
    M.left, PAGE.h - M.bottom + 4,
  );
  doc.text(pdfSafe(`${inv.seller.name} - computer-generated invoice`), M.left, PAGE.h - M.bottom + 8);
  doc.setTextColor(0);
}

/**
 * Draws one invoice, starting on the current page, and returns the jsPDF doc.
 *
 * Long orders flow onto further pages with the header repeated, so a line is
 * never orphaned off the bottom of the sheet.
 */
export function drawInvoice(doc, inv) {
  let page = 1;
  let y = header(doc, inv, page);
  y = parties(doc, inv, y);
  y = tableHead(doc, inv, y);

  const rows = [...inv.lines, ...(inv.charges ? [inv.charges] : [])];
  rows.forEach((l, i) => {
    // Leave room for the totals block; otherwise it lands on a page of its own.
    if (y > PAGE.h - M.bottom - 42) {
      footer(doc, inv);
      doc.addPage();
      page += 1;
      y = header(doc, inv, page);
      y = tableHead(doc, inv, y);
    }
    y = itemRow(doc, inv, y, i + 1, l);
  });

  totals(doc, inv, y + 2);
  footer(doc, inv);
  return doc;
}

export function invoiceFilename(inv) {
  return `Invoice-${String(inv.invoiceNumber).replace(/[^A-Za-z0-9_-]/g, "")}.pdf`;
}

/** One invoice, as a downloadable PDF. */
export function invoicePdf(inv) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  return drawInvoice(doc, inv);
}

/** Many invoices in one file, one per page — for filing a batch of claims. */
export function invoicesPdf(invoices) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  invoices.forEach((inv, i) => {
    if (i > 0) doc.addPage();
    drawInvoice(doc, inv);
  });
  return doc;
}
