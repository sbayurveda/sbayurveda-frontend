import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import { X, Minus, Plus, Trash2, ShoppingBag, Tag } from "lucide-react";
import toast from "react-hot-toast";
import { useStore } from "../context/store";
import { useCart } from "../context/useCart";

export default function CartDrawer() {
  const isOpen = useStore((s) => s.isCartOpen);
  const closeCart = useStore((s) => s.closeCart);
  const updateQty = useStore((s) => s.updateQty);
  const removeFromCart = useStore((s) => s.removeFromCart);
  const applyCoupon = useStore((s) => s.applyCoupon);
  const removeCoupon = useStore((s) => s.removeCoupon);
  const appliedCoupon = useStore((s) => s.appliedCoupon);
  const freeShippingThreshold = useStore((s) => s.getFreeShippingThreshold());

  const { items, mrpTotal, subtotal, savings, couponDiscount, total } = useCart();
  const [couponInput, setCouponInput] = useState("");

  const remainingForFreeShip = Math.max(freeShippingThreshold - subtotal, 0);
  const shippingProgress = Math.min((subtotal / freeShippingThreshold) * 100, 100);

  function handleApplyCoupon(e) {
    e.preventDefault();
    if (!couponInput.trim()) return;
    const result = applyCoupon(couponInput, subtotal);
    if (result.valid) {
      toast.success(`Coupon applied: ${result.label}`);
      setCouponInput("");
    } else {
      toast.error(result.message);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/50 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
          />
          <motion.aside
            className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white z-50 flex flex-col shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.28 }}
          >
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <ShoppingBag size={20} className="text-ayur-green" /> Your Cart (
                {items.reduce((n, i) => n + i.qty, 0)})
              </h2>
              <button onClick={closeCart} className="p-1.5 hover:bg-gray-100 rounded-full">
                <X size={20} />
              </button>
            </div>

            {items.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-500 px-6 text-center">
                <ShoppingBag size={48} className="text-gray-300" />
                <p>Your cart is empty. Add some Ayurvedic goodness!</p>
                <Link
                  to="/category/popular"
                  onClick={closeCart}
                  className="btn-primary px-5 py-2 text-sm"
                >
                  Shop Now
                </Link>
              </div>
            ) : (
              <>
                {/* Free shipping bar */}
                <div className="px-4 py-3 bg-ayur-cream/60 border-b border-gray-100">
                  {remainingForFreeShip > 0 ? (
                    <p className="text-xs font-medium text-ayur-green-dark mb-1.5">
                      Add ₹{remainingForFreeShip} more & get FREE Shipping! 🚚
                    </p>
                  ) : (
                    <p className="text-xs font-semibold text-ayur-green-dark mb-1.5">
                      🎉 You've unlocked FREE Shipping!
                    </p>
                  )}
                  <div className="h-2 bg-white rounded-full overflow-hidden">
                    <div
                      className="h-full bg-ayur-green transition-all duration-500"
                      style={{ width: `${shippingProgress}%` }}
                    />
                  </div>
                </div>

                {/* Items */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-3 border-b border-gray-50 pb-3">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-16 h-16 rounded-lg object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-ayur-green font-semibold">{item.brand}</p>
                        <p className="text-sm font-medium text-gray-800 line-clamp-1">
                          {item.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm font-bold text-ayur-green">
                            ₹{item.price * item.qty}
                          </span>
                          <span className="text-xs text-gray-400 line-through">
                            ₹{item.mrp * item.qty}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-1.5">
                          <div className="flex items-center border border-gray-200 rounded-lg">
                            <button
                              onClick={() => updateQty(item.id, item.qty - 1)}
                              className="p-1 hover:bg-gray-50"
                            >
                              <Minus size={13} />
                            </button>
                            <span className="w-6 text-center text-xs font-medium">
                              {item.qty}
                            </span>
                            <button
                              onClick={() => updateQty(item.id, item.qty + 1)}
                              className="p-1 hover:bg-gray-50"
                            >
                              <Plus size={13} />
                            </button>
                          </div>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="text-gray-400 hover:text-red-500 p-1"
                            aria-label="Remove item"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Coupon + summary */}
                <div className="border-t border-gray-100 px-4 py-3 space-y-3">
                  {savings > 0 && (
                    <p className="text-xs font-semibold text-green-700 bg-green-50 rounded-lg px-3 py-2">
                      🎉 You saved ₹{savings + couponDiscount} on this order with SB Lowest
                      Price Guarantee!
                    </p>
                  )}

                  {appliedCoupon ? (
                    <div className="flex items-center justify-between bg-ayur-cream rounded-lg px-3 py-2 text-sm">
                      <span className="flex items-center gap-1.5 text-ayur-green-dark font-medium">
                        <Tag size={14} /> {appliedCoupon.code} applied
                      </span>
                      <button
                        onClick={removeCoupon}
                        className="text-xs text-red-500 font-medium hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleApplyCoupon} className="flex gap-2">
                      <input
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value)}
                        placeholder="Coupon code e.g. FIRST10"
                        className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ayur-green/30"
                      />
                      <button className="btn-primary px-4 text-sm shrink-0">Apply</button>
                    </form>
                  )}

                  <div className="text-sm space-y-1">
                    <div className="flex justify-between text-gray-500">
                      <span>MRP Total</span>
                      <span className="line-through">₹{mrpTotal}</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>Product Discount</span>
                      <span className="text-green-600">-₹{savings}</span>
                    </div>
                    {couponDiscount > 0 && (
                      <div className="flex justify-between text-gray-500">
                        <span>Coupon Discount</span>
                        <span className="text-green-600">-₹{couponDiscount}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-base pt-1.5 border-t border-gray-100">
                      <span>To Pay</span>
                      <span className="text-ayur-green">₹{total}</span>
                    </div>
                  </div>

                  <Link
                    to="/checkout"
                    onClick={closeCart}
                    className="btn-primary w-full text-center py-3 text-sm block"
                  >
                    PROCEED TO SECURE CHECKOUT
                  </Link>
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
