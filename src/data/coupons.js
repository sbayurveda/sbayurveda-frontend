export const coupons = {
  FIRST10: { type: "percent", value: 10, minOrder: 299, label: "10% off on your first order" },
  AYUR2X: { type: "flat", value: 100, minOrder: 799, label: "Flat ₹100 off above ₹799" },
  FREESHIP: { type: "shipping", value: 0, minOrder: 0, label: "Free shipping on any order" },
};

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
