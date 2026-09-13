// A wrong tracking link is worse than none: the customer opens a dead page and
// rings up. These pin which couriers we will build a link for, and which we
// deliberately will not.

import { describe, it, expect } from "vitest";
import { buildTrackingUrl, findCarrier, CARRIERS } from "./carriers";

describe("building a tracking link", () => {
  it("builds the Amazon link the store actually uses", () => {
    expect(buildTrackingUrl("Amazon Shipping", "372225471072"))
      .toBe("https://track.amazon.in/tracking/372225471072");
  });

  it("builds the Delhivery link", () => {
    expect(buildTrackingUrl("Delhivery", "17526310001304"))
      .toBe("https://www.delhivery.com/track/package/17526310001304");
  });

  it("matches a carrier by id as well as by name", () => {
    expect(buildTrackingUrl("amazon", "999")).toBe("https://track.amazon.in/tracking/999");
  });

  it("returns nothing when no courier is chosen", () => {
    // Guessing Amazon for an unset courier would ship a wrong link by default.
    expect(buildTrackingUrl("", "372225471072")).toBe("");
  });

  it("returns nothing for couriers whose URL shape we haven't confirmed", () => {
    for (const name of ["DTDC", "Blue Dart", "XpressBees", "India Post", "Shiprocket", "Other"]) {
      expect(buildTrackingUrl(name, "12345"), `${name} must not be guessed`).toBe("");
    }
  });

  it("returns nothing without a tracking number", () => {
    expect(buildTrackingUrl("Amazon Shipping", "")).toBe("");
    expect(buildTrackingUrl("Amazon Shipping", "   ")).toBe("");
  });

  it("escapes anything odd in the tracking number", () => {
    expect(buildTrackingUrl("Amazon Shipping", "a b/c")).toBe("https://track.amazon.in/tracking/a%20b%2Fc");
  });

  it("every carrier has a stable id and name", () => {
    const ids = CARRIERS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of CARRIERS) expect(findCarrier(c.name)?.id).toBe(c.id);
  });
});
