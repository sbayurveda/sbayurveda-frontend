import { describe, it, expect } from "vitest";

// The rule AdminShell uses to decide which section is current. A bare prefix
// match lit up two sections at once, because "/admin/taxonomy" starts with
// "/admin/tax".
const isCurrent = (pathname, to, end) =>
  end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);

describe("which admin section is highlighted", () => {
  it("does not light up Tax when viewing Taxonomy", () => {
    expect(isCurrent("/admin/taxonomy", "/admin/tax", false)).toBe(false);
    expect(isCurrent("/admin/taxonomy", "/admin/taxonomy", false)).toBe(true);
  });

  it("still matches a section's own sub-pages", () => {
    expect(isCurrent("/admin/orders", "/admin/orders", false)).toBe(true);
    expect(isCurrent("/admin/orders/123", "/admin/orders", false)).toBe(true);
  });

  it("keeps Sales exact, so it is not current everywhere", () => {
    // "/admin" is a prefix of every admin route.
    expect(isCurrent("/admin", "/admin", true)).toBe(true);
    expect(isCurrent("/admin/orders", "/admin", true)).toBe(false);
  });

  it("does not match a longer name that merely starts the same", () => {
    expect(isCurrent("/admin/productsX", "/admin/products", false)).toBe(false);
  });
});
