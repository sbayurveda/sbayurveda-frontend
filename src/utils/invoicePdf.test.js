import { describe, it, expect } from "vitest";
import { money, invoiceFilename } from "./invoicePdf";

describe("money on an invoice", () => {
  it("groups the Indian way, not in thousands", () => {
    // 1,23,456.78 — not 123,456.78. An invoice that groups the western way
    // reads as the wrong number to everyone who files it.
    expect(money(123456.78)).toBe("1,23,456.78");
    expect(money(1234567)).toBe("12,34,567.00");
    expect(money(1000)).toBe("1,000.00");
    expect(money(999)).toBe("999.00");
  });

  it("always shows two decimals", () => {
    expect(money(715)).toBe("715.00");
    expect(money(715.5)).toBe("715.50");
    expect(money(0)).toBe("0.00");
  });

  it("writes a credit as a negative", () => {
    expect(money(-500)).toBe("-500.00");
  });

  it("survives rubbish instead of a number", () => {
    expect(money(null)).toBe("0.00");
    expect(money(undefined)).toBe("0.00");
    expect(money("abc")).toBe("0.00");
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
