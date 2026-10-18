import { describe, it, expect } from "vitest";
import { money, invoiceFilename } from "./invoicePdf";

describe("money on an invoice", () => {
  it("groups the Indian way, not in thousands", () => {
    // 1,23,456.78 — not 123,456.78. An invoice that groups the western way
    // reads as the wrong number to everyone who files it.
    expect(money(123456.78)).toBe("Rs. 1,23,456.78");
    expect(money(1234567)).toBe("Rs. 12,34,567.00");
    expect(money(1000)).toBe("Rs. 1,000.00");
    expect(money(999)).toBe("Rs. 999.00");
  });

  it("always shows two decimals", () => {
    expect(money(715)).toBe("Rs. 715.00");
    expect(money(715.5)).toBe("Rs. 715.50");
    expect(money(0)).toBe("Rs. 0.00");
  });

  it("writes a credit as a negative", () => {
    expect(money(-500)).toBe("-Rs. 500.00");
  });

  it("survives rubbish instead of a number", () => {
    expect(money(null)).toBe("Rs. 0.00");
    expect(money(undefined)).toBe("Rs. 0.00");
    expect(money("abc")).toBe("Rs. 0.00");
  });

  it("uses Rs. rather than the rupee sign", () => {
    // The PDF standard fonts have no ₹ glyph; one would render as the wrong
    // character. This is a deliberate choice, so it is pinned.
    expect(money(100)).not.toContain("₹");
  });
});

describe("the download filename", () => {
  it("is named after the invoice", () => {
    expect(invoiceFilename({ invoiceNumber: "12345" })).toBe("Invoice-12345.pdf");
  });

  it("cannot be steered by a strange order number", () => {
    expect(invoiceFilename({ invoiceNumber: "../../etc/passwd" })).toBe("Invoice-etcpasswd.pdf");
  });
});

describe("characters the PDF font cannot draw", () => {
  it("maps typographic punctuation to ASCII instead of dropping it", async () => {
    const { pdfSafe } = await import("./invoicePdf");
    // An em dash silently vanished from the footer before this existed.
    expect(pdfSafe("SB Ayurveda — invoice")).toBe("SB Ayurveda - invoice");
    expect(pdfSafe("Chyawanprash – 500g")).toBe("Chyawanprash - 500g");
    expect(pdfSafe("it’s")).toBe("it's");
    expect(pdfSafe("“quoted”")).toBe('"quoted"');
    expect(pdfSafe("more…")).toBe("more...");
  });

  it("writes the rupee sign as Rs. rather than losing it", () => {
    // A price that loses its currency symbol is a figure with no unit.
    return import("./invoicePdf").then(({ pdfSafe }) => {
      expect(pdfSafe("₹715")).toBe("Rs.715");
    });
  });

  it("makes an undrawable character visible rather than invisible", async () => {
    const { pdfSafe } = await import("./invoicePdf");
    // Devanagari has no glyph in the standard fonts. Better a "?" someone can
    // see than a product name that quietly loses letters.
    expect(pdfSafe("अश्वगंधा")).toMatch(/^\?+$/);
    expect(pdfSafe("Ashwagandha")).toBe("Ashwagandha");
  });

  it("leaves accented Latin alone, which the font can draw", async () => {
    const { pdfSafe } = await import("./invoicePdf");
    expect(pdfSafe("Café Aloé")).toBe("Café Aloé");
  });

  it("copes with nothing at all", async () => {
    const { pdfSafe } = await import("./invoicePdf");
    expect(pdfSafe(null)).toBe("");
    expect(pdfSafe(undefined)).toBe("");
  });
});
