// These exist because the behaviour they cover was, for four days, a hand-edit
// applied straight to a deployed bundle and present nowhere in source. Anything
// that only lives on the server is one clean deploy away from being erased.

import { describe, it, expect } from "vitest";
import { seoName, seoCategory } from "./seoName";

const p = (name, extra = {}) => ({ name, healthConcerns: [], ...extra });

describe("seoCategory", () => {
  it("reads the concern off the product's own tags", () => {
    expect(seoCategory(p("Some Churna", { healthConcerns: ["diabetes"] }))).toBe("Diabetes Care");
    expect(seoCategory(p("Some Oil", { healthConcerns: ["skin"] }))).toBe("Skin & Hair Care");
  });

  it("reads it from the product name when there are no tags", () => {
    expect(seoCategory(p("Shilajit Resin"))).toBe("Men's Wellness");
    expect(seoCategory(p("Triphala Churna"))).toBe("Digestive Care");
    expect(seoCategory(p("Giloy Juice"))).toBe("Immunity Support");
    expect(seoCategory(p("Mahayograj Guggulu"))).toBe("Joint & Nerve Care");
    expect(seoCategory(p("Shatavari Kalpa"))).toBe("Women's Health");
  });

  it("falls back to a claim that is true of everything we sell", () => {
    // Guessing a concern would put a health claim in a page title.
    expect(seoCategory(p("Unbranded Thing"))).toBe("Ayurvedic Medicine");
    expect(seoCategory(null)).toBe("Ayurvedic Medicine");
  });
});

describe("seoName", () => {
  it("appends the concern to the product name", () => {
    expect(seoName(p("Matsya Tailam Capsules", { healthConcerns: ["mens-health"] })))
      .toBe("Matsya Tailam Capsules - Men's Wellness");
  });

  it("never invents a name for a product that has none", () => {
    expect(seoName(null)).toBe("");
    expect(seoName({})).toBe("");
  });

  it("keeps the real product name as the leading text", () => {
    // The name is what a customer recognises; the keyword is a suffix, never a
    // replacement.
    const name = "Arya Vaidya Sala Kottakkal Tiktaka Ghritam 200gm";
    expect(seoName(p(name)).startsWith(name)).toBe(true);
  });
});
