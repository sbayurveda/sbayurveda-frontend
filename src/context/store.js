import { create } from "zustand";
import { persist } from "zustand/middleware";
import { validateCoupon } from "../data/coupons";

const FREE_SHIPPING_THRESHOLD = 799;
const COD_FEE = 36;
const SHIPPING_FEE = 54;

export const useStore = create(
  persist(
    (set, get) => ({
      // ---------------- CART ----------------
      cart: [], // { id, qty }
      isCartOpen: false,

      addToCart: (product, qty = 1) => {
        const cart = get().cart;
        const existing = cart.find((i) => i.id === product.id);
        if (existing) {
          set({
            cart: cart.map((i) =>
              i.id === product.id ? { ...i, qty: i.qty + qty } : i
            ),
          });
        } else {
          set({ cart: [...cart, { id: product.id, qty }] });
        }
        set({ isCartOpen: true });
      },

      removeFromCart: (id) => set({ cart: get().cart.filter((i) => i.id !== id) }),

      updateQty: (id, qty) => {
        if (qty <= 0) {
          get().removeFromCart(id);
          return;
        }
        set({
          cart: get().cart.map((i) => (i.id === id ? { ...i, qty } : i)),
        });
      },

      clearCart: () => set({ cart: [], appliedCoupon: null }),

      openCart: () => set({ isCartOpen: true }),
      closeCart: () => set({ isCartOpen: false }),
      toggleCart: () => set({ isCartOpen: !get().isCartOpen }),

      // ---------------- WISHLIST ----------------
      wishlist: [], // array of product ids

      toggleWishlist: (id) => {
        const wishlist = get().wishlist;
        set({
          wishlist: wishlist.includes(id)
            ? wishlist.filter((w) => w !== id)
            : [...wishlist, id],
        });
      },

      // ---------------- ORDERS ----------------
      // Real order history for orders placed through this browser/site. Not
      // synced across devices — full account-based history needs the
      // WooCommerce backend wiring planned for a later phase.
      orders: [],

      addOrder: (order) => set({ orders: [order, ...get().orders] }),

      updateOrderStatus: (id, patch) =>
        set({ orders: get().orders.map((o) => (o.id === id ? { ...o, ...patch } : o)) }),

      // ---------------- SEARCH ----------------
      searchQuery: "",
      setSearchQuery: (q) => set({ searchQuery: q }),

      // ---------------- COUPON ----------------
      appliedCoupon: null,
      applyCoupon: (code, subtotal) => {
        const result = validateCoupon(code, subtotal);
        if (result.valid) {
          set({ appliedCoupon: result });
        }
        return result;
      },
      removeCoupon: () => set({ appliedCoupon: null }),

      // ---------------- DERIVED HELPERS ----------------
      getCartCount: () => get().cart.reduce((sum, i) => sum + i.qty, 0),

      getFreeShippingThreshold: () => FREE_SHIPPING_THRESHOLD,
      getCodFee: () => COD_FEE,
      getShippingFee: () => SHIPPING_FEE,
    }),
    {
      name: "sb-ayurveda-storage",
      partialize: (state) => ({
        cart: state.cart,
        wishlist: state.wishlist,
        appliedCoupon: state.appliedCoupon,
        orders: state.orders,
      }),
    }
  )
);
