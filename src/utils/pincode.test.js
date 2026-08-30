// The delivery promise a customer sees at checkout. These bands are a published
// commitment, so the risk worth testing is a state landing in the wrong zone —
// quoting a Chennai address the 3-4 day North band is a promise we can't keep.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getDeliveryEstimate, zoneForState, DELIVERY_ZONES } from "./pincode";

function mockPincode(state, city = "Somewhere") {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => [{ PostOffice: [{ District: city, State: state }] }],
  });
}

afterEach(() => vi.restoreAllMocks());

describe("zone bands", () => {
  const cases = [
    ["Haryana", 3, 4], ["Delhi", 3, 4], ["Uttar Pradesh", 3, 4], ["Rajasthan", 3, 4],
    ["Maharashtra", 5, 6], ["Gujarat", 5, 6], ["Madhya Pradesh", 5, 6],
    ["West Bengal", 5, 6], ["Bihar", 5, 6], ["Assam", 5, 6],
    ["Tamil Nadu", 5, 7], ["Kerala", 5, 7], ["Karnataka", 5, 7], ["Telangana", 5, 7],
  ];

  for (const [state, min, max] of cases) {
    it(`${state} is quoted ${min}-${max} days`, () => {
      expect(zoneForState(state).days).toEqual({ min, max });
    });
  }

  it("matches a state whatever its casing or spacing", () => {
    expect(zoneForState("  tamil   nadu ").key).toBe("south");
  });

  it("covers every Indian state and union territory", () => {
    // A state missing from the map silently drops to the 5-7 fallback, which
    // reads as a real quote to the customer. Nothing should be missing.
    const ALL = [
      "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
      "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
      "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
      "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim",
      "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand",
      "West Bengal", "Delhi", "Chandigarh", "Puducherry", "Ladakh",
      "Jammu and Kashmir", "Lakshadweep", "Andaman and Nicobar Islands",
      "Dadra and Nagar Haveli and Daman and Diu",
    ];
    const missing = ALL.filter((s) => !zoneForState(s));
    expect(missing).toEqual([]);
  });

  it("publishes the four bands from the same map the estimate uses", () => {
    expect(DELIVERY_ZONES.map((z) => [z.label, `${z.days.min}-${z.days.max}`])).toEqual([
      ["North Indian States", "3-4"],
      ["Western States", "5-6"],
      ["Eastern States", "5-6"],
      ["Southern States", "5-7"],
    ]);
  });
});

describe("getDeliveryEstimate", () => {
  it("quotes the customer's own region, not a metro shortcut", async () => {
    mockPincode("Tamil Nadu", "Chennai");
    const est = await getDeliveryEstimate("600001");
    // Chennai used to get 3-5 days for being a metro, faster than nearby Punjab.
    expect(est.days).toEqual({ min: 5, max: 7 });
    expect(est.zoneKey).toBe("south");
    expect(est.guessed).toBe(false);
  });

  it("quotes the fast band close to the warehouse", async () => {
    mockPincode("Punjab", "Patiala");
    const est = await getDeliveryEstimate("147001");
    expect(est.days).toEqual({ min: 3, max: 4 });
    expect(est.city).toBe("Patiala");
  });

  it("falls back to the widest band when the pincode is unknown", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [{ PostOffice: null }] });
    const est = await getDeliveryEstimate("999999");
    expect(est.days).toEqual({ min: 5, max: 7 });
    expect(est.guessed).toBe(true);
  });

  it("never promises a fast delivery for a state it doesn't recognise", async () => {
    mockPincode("Some New Territory");
    const est = await getDeliveryEstimate("100001");
    expect(est.days).toEqual({ min: 5, max: 7 });
    expect(est.guessed).toBe(true);
    expect(est.state).toBe("Some New Territory");
  });

  it("survives the postal API being down", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("offline"));
    const est = await getDeliveryEstimate("136156");
    expect(est.days).toEqual({ min: 5, max: 7 });
    expect(est.guessed).toBe(true);
  });
});
