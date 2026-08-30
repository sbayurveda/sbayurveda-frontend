// Guards the bug that stranded eleven UPI payments.
//
// createPayment used to destructure `{ items, couponCode }`, so the `customer`
// and `attribution` that Checkout passed in were thrown away before the request
// left the browser. Nothing failed loudly: checkout worked, the payment went
// through, and only customers who never returned from their UPI app were left
// with no order — because the server had no address saved to build one from.
//
// These tests assert on the body that actually goes over the wire, which is the
// only place that bug was visible.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createPayment, verifyPayment, placeCodOrder } from "./checkoutBridge";

const CUSTOMER = {
  name: "Test Customer",
  email: "test@example.com",
  phone: "9876543210",
  flatBuilding: "12 Test Building",
  area: "Test Area",
  city: "Kurukshetra",
  state: "Haryana",
  pincode: "136156",
};

const ATTRIBUTION = { sourceType: "utm", utmSource: "google", deviceType: "Mobile" };
const ITEMS = [{ id: "wc-1", qty: 2 }];

// Returns the JSON body of the single request the call made.
function sentBody() {
  expect(global.fetch).toHaveBeenCalledTimes(1);
  return JSON.parse(global.fetch.mock.calls[0][1].body);
}

beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ razorpayOrderId: "order_test", success: true }),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createPayment", () => {
  it("sends the delivery address so the webhook can rescue the order", async () => {
    await createPayment({ items: ITEMS, couponCode: "SAVE10", customer: CUSTOMER, attribution: ATTRIBUTION });
    const body = sentBody();

    // The regression: these two were silently dropped.
    expect(body.customer).toEqual(CUSTOMER);
    expect(body.attribution).toEqual(ATTRIBUTION);
    expect(body.items).toEqual(ITEMS);
    expect(body.couponCode).toBe("SAVE10");
  });

  it("keeps the full address, not just contact details", async () => {
    // A partial address is as useless as none — the parcel can't be sent.
    await createPayment({ items: ITEMS, customer: CUSTOMER });
    const body = sentBody();

    for (const field of ["flatBuilding", "area", "city", "state", "pincode"]) {
      expect(body.customer[field], `${field} must reach the server`).toBe(CUSTOMER[field]);
    }
  });

  it("does not drop fields added later", async () => {
    // The original fault was a fixed destructure. Anything new must pass
    // through without this file needing to know about it.
    await createPayment({ items: ITEMS, somethingAddedLater: "keep me" });
    expect(sentBody().somethingAddedLater).toBe("keep me");
  });

  it("posts to the create-payment endpoint", async () => {
    await createPayment({ items: ITEMS, customer: CUSTOMER });
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toContain("/api/create-payment");
    expect(options.method).toBe("POST");
  });
});

describe("verifyPayment", () => {
  it("forwards the payment proof together with the customer and source", async () => {
    await verifyPayment({
      razorpay_order_id: "order_1",
      razorpay_payment_id: "pay_1",
      razorpay_signature: "sig",
      customer: CUSTOMER,
      items: ITEMS,
      attribution: ATTRIBUTION,
    });
    const body = sentBody();

    expect(body.razorpay_order_id).toBe("order_1");
    expect(body.razorpay_payment_id).toBe("pay_1");
    expect(body.razorpay_signature).toBe("sig");
    expect(body.customer).toEqual(CUSTOMER);
    expect(body.attribution).toEqual(ATTRIBUTION);
  });
});

describe("placeCodOrder", () => {
  it("forwards the customer and source", async () => {
    await placeCodOrder({ items: ITEMS, customer: CUSTOMER, attribution: ATTRIBUTION });
    const body = sentBody();

    expect(body.customer).toEqual(CUSTOMER);
    expect(body.attribution).toEqual(ATTRIBUTION);
    expect(body.items).toEqual(ITEMS);
  });
});
