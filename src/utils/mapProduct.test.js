import { describe, it, expect } from "vitest";
import { stripStrayBoldMarkers, decodeEntities } from "./mapProduct";

describe("stray bold markers left by the catalogue import", () => {
  it("removes them", () => {
    // Nine descriptions render as "...(200ml)****" on the live product page.
    expect(stripStrayBoldMarkers("<p>Amlantak Syrup (200ml)****</p>"))
      .toBe("<p>Amlantak Syrup (200ml)</p>");
    expect(stripStrayBoldMarkers("**Dosage** 2 tsp")).toBe("Dosage 2 tsp");
  });

  it("keeps a lone asterisk, which is a footnote and not formatting", () => {
    expect(stripStrayBoldMarkers("Price *inclusive of tax")).toBe("Price *inclusive of tax");
  });

  it("leaves ordinary descriptions untouched", () => {
    const html = "<p>Supports immunity.</p><ul><li>2 tsp twice daily</li></ul>";
    expect(stripStrayBoldMarkers(html)).toBe(html);
  });

  it("does not disturb <strong>, which is how bold is actually stored", () => {
    expect(stripStrayBoldMarkers("<p><strong>Dosage</strong> 2 tsp</p>"))
      .toBe("<p><strong>Dosage</strong> 2 tsp</p>");
  });

  it("handles a missing description without throwing", () => {
    expect(stripStrayBoldMarkers()).toBe("");
    expect(stripStrayBoldMarkers("")).toBe("");
  });
});

describe("decodeEntities", () => {
  it("turns the entities WordPress stores back into characters", () => {
    expect(decodeEntities("Cold &amp; Cough")).toBe("Cold & Cough");
    expect(decodeEntities("Baidyanath&#8217;s")).toBe("Baidyanath’s");
  });
});
