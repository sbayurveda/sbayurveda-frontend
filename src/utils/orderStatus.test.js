import { describe, it, expect } from "vitest";
import { ORDER_STATUSES, statusMeta } from "./adminFormat";

describe("the statuses an order can be in", () => {
  const values = ORDER_STATUSES.map((s) => s.value);

  it("has a word for a parcel that has been sent", () => {
    // Without one, dispatching an order had to be recorded as "completed",
    // which told the customer it was finished and WooCommerce that a cash
    // order had been paid.
    expect(values).toContain("shipped");
    expect(values).toContain("delivered");
  });

  it("reads in the order a parcel actually travels", () => {
    const order = ["processing", "shipped", "delivered", "completed"];
    const positions = order.map((v) => values.indexOf(v));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(positions.every((p) => p > 0)).toBe(true);
  });

  it("gives each new status its own label and colour", () => {
    for (const s of ["shipped", "delivered"]) {
      const meta = statusMeta(s);
      expect(meta.label.toLowerCase()).toBe(s);
      expect(meta.className).toBeTruthy();
      expect(meta.className).not.toEqual(statusMeta("completed").className);
    }
  });

  it("keeps the core statuses intact", () => {
    for (const s of ["pending", "processing", "on-hold", "completed", "cancelled", "refunded", "failed"]) {
      expect(values).toContain(s);
    }
  });
});
