import { useMemo } from "react";
import { useStore } from "./store";
import { useCatalogStore } from "./catalogStore";

export function useCart() {
  const cart = useStore((s) => s.cart);
  const appliedCoupon = useStore((s) => s.appliedCoupon);
  const products = useCatalogStore((s) => s.products);

  return useMemo(() => {
    const items = cart
      .map((i) => {
        const product = products.find((p) => p.id === i.id);
        if (!product) return null;
        return { ...product, qty: i.qty };
      })
      .filter(Boolean);

    const mrpTotal = items.reduce((sum, i) => sum + i.mrp * i.qty, 0);
    const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
    const savings = mrpTotal - subtotal;
    const couponDiscount = appliedCoupon?.discount || 0;
    const total = Math.max(subtotal - couponDiscount, 0);

    return { items, mrpTotal, subtotal, savings, couponDiscount, total };
  }, [cart, appliedCoupon, products]);
}
