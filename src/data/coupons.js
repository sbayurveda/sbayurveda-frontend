// No coupons are currently active (disabled site-wide by request). Re-add
// entries here — and to the matching COUPONS object in
// sb-ayurveda-server/coupons.js — to bring a code back.
export const coupons = {};

export function validateCoupon(code, subtotal) {
  const c = coupons[code?.toUpperCase()];
  if (!c) return { valid: false, message: "Invalid coupon code" };
  if (subtotal < c.minOrder) {
    return {
      valid: false,
      message: `Add items worth ₹${c.minOrder - subtotal} more to use this coupon`,
    };
  }
  let discount = 0;
  if (c.type === "percent") discount = Math.round((subtotal * c.value) / 100);
  if (c.type === "flat") discount = c.value;
  return { valid: true, discount, code: code.toUpperCase(), label: c.label, type: c.type };
}
