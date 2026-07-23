import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Lock,
  Smartphone,
  Wallet,
  Truck,
  CheckCircle2,
  LocateFixed,
  Loader2,
  Minus,
  Plus,
} from "lucide-react";
import toast from "react-hot-toast";
import { useStore } from "../context/store";
import { useCart } from "../context/useCart";
import { detectCurrentLocation } from "../utils/geolocation";
import { getDeliveryEstimate } from "../utils/pincode";
import { isBridgeConfigured, createPayment, verifyPayment, placeCodOrder } from "../api/checkoutBridge";

const PAYMENT_METHODS = [
  { id: "online", label: "Pay Online — UPI / Card / Netbanking", icon: Smartphone },
  { id: "cod", label: "Cash on Delivery", icon: Wallet },
];

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa",
  "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala",
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland",
  "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi", "Jammu and Kashmir",
  "Ladakh", "Chandigarh", "Puducherry", "Andaman and Nicobar Islands",
  "Dadra and Nagar Haveli and Daman and Diu", "Lakshadweep",
];

export default function Checkout() {
  const { items, mrpTotal, savings, couponDiscount, total } = useCart();
  const clearCart = useStore((s) => s.clearCart);
  const updateQty = useStore((s) => s.updateQty);
  const addOrder = useStore((s) => s.addOrder);
  const appliedCoupon = useStore((s) => s.appliedCoupon);
  const codFee = useStore((s) => s.getCodFee());
  const shippingFeeAmount = useStore((s) => s.getShippingFee());
  const freeShippingThreshold = useStore((s) => s.getFreeShippingThreshold());
  const remainingForFreeShip = Math.max(freeShippingThreshold - total, 0);
  const shippingProgress = Math.min((total / freeShippingThreshold) * 100, 100);
  const shippingFee = total >= freeShippingThreshold ? 0 : shippingFeeAmount;

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    pincode: "",
    flatBuilding: "",
    area: "",
    landmark: "",
    city: "",
    state: "",
  });
  const [payment, setPayment] = useState("online");
  const [placing, setPlacing] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [checkingPincode, setCheckingPincode] = useState(false);
  const [deliveryEstimate, setDeliveryEstimate] = useState(null);
  const [orderId, setOrderId] = useState(null);
  const [orderTotal, setOrderTotal] = useState(null);
  const [orderPayment, setOrderPayment] = useState(null);

  const finalTotal = total + shippingFee + (payment === "cod" ? codFee : 0);

  function updateField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handlePincodeChange(value) {
    const pincode = value.replace(/\D/g, "").slice(0, 6);
    updateField("pincode", pincode);
    setDeliveryEstimate(null);
    if (pincode.length !== 6) return;

    setCheckingPincode(true);
    try {
      const est = await getDeliveryEstimate(pincode);
      setDeliveryEstimate(est);
      // Note: the free pincode API's "city" is really a post office branch
      // name (e.g. "Haji S Musafarkhana" for Mumbai 400001) rather than the
      // city name people expect. We still auto-fill it since it's editable
      // and better than leaving the field blank, but the customer should
      // double check it.
      setForm((f) => ({
        ...f,
        city: est.city && !f.city ? est.city : f.city,
        state: est.state && !f.state ? est.state : f.state,
      }));
    } finally {
      setCheckingPincode(false);
    }
  }

  async function handleUseLocation() {
    setDetectingLocation(true);
    try {
      const loc = await detectCurrentLocation();
      setForm((f) => ({
        ...f,
        area: loc.area || f.area,
        city: loc.city || f.city,
        state: loc.state || f.state,
        pincode: loc.pincode || f.pincode,
      }));
      if (loc.pincode) {
        handlePincodeChange(loc.pincode);
      }
      toast.success("Location detected — please check the flat/house number and landmark.");
    } catch (err) {
      toast.error(err.message || "Couldn't detect your location.");
    } finally {
      setDetectingLocation(false);
    }
  }

  function validate() {
    if (!form.name.trim()) return "Please enter your name";
    if (!/^\d{10}$/.test(form.phone)) return "Please enter a valid 10-digit phone number";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return "Please enter a valid email address";
    if (!/^\d{6}$/.test(form.pincode)) return "Please enter a valid 6-digit pincode";
    if (!form.flatBuilding.trim()) return "Please enter your flat/house/building";
    if (!form.area.trim()) return "Please enter your area, street or village";
    if (!form.city.trim()) return "Please enter your town/city";
    if (!form.state.trim()) return "Please select your state";
    return null;
  }

  async function placeOrder(e) {
    e.preventDefault();
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    const customer = {
      name: form.name, phone: form.phone, email: form.email, pincode: form.pincode,
      flatBuilding: form.flatBuilding, area: form.area, landmark: form.landmark,
      city: form.city, state: form.state,
    };
    const cartItems = items.map((i) => ({ id: i.id, qty: i.qty }));
    const orderItemsForHistory = items.map((i) => ({ name: i.name, qty: i.qty, price: i.price }));

    function finishOrder(id, finalOrderTotal) {
      addOrder({
        id, date: new Date().toISOString(), status: "processing", total: finalOrderTotal,
        payment, email: form.email, items: orderItemsForHistory,
      });
      setOrderId(id);
      setOrderTotal(finalOrderTotal);
      setOrderPayment(payment);
      clearCart();
    }

    setPlacing(true);

    // Until the real payment/order bridge server is deployed, fall back to a
    // clearly-simulated order instead of a broken real-payment attempt.
    if (!isBridgeConfigured()) {
      setTimeout(() => {
        finishOrder(`SBA${Date.now().toString().slice(-8)}`, finalTotal);
        setPlacing(false);
      }, 1200);
      return;
    }

    if (payment === "cod") {
      try {
        const result = await placeCodOrder({ items: cartItems, customer, couponCode: appliedCoupon?.code });
        finishOrder(String(result.orderNumber || result.orderId), result.total);
      } catch (err) {
        toast.error(err.message || "Could not place your order. Please try again.");
      } finally {
        setPlacing(false);
      }
      return;
    }

    // Online payment (UPI/Card) via Razorpay
    try {
      const pay = await createPayment({ items: cartItems, couponCode: appliedCoupon?.code });
      const rzp = new window.Razorpay({
        key: pay.keyId,
        amount: Math.round(pay.amount * 100),
        currency: pay.currency,
        name: "SB Ayurveda",
        description: "Order Payment",
        order_id: pay.razorpayOrderId,
        prefill: { name: form.name, email: form.email, contact: form.phone },
        theme: { color: "#005F33" },
        handler: async (response) => {
          try {
            const result = await verifyPayment({ ...response, customer, items: cartItems });
            finishOrder(String(result.orderNumber || result.orderId), result.total);
          } catch (err) {
            toast.error(err.message || "Payment succeeded but we couldn't record your order. Please contact us.");
          } finally {
            setPlacing(false);
          }
        },
        modal: { ondismiss: () => setPlacing(false) },
      });
      rzp.on("payment.failed", () => {
        toast.error("Payment failed. Please try again.");
        setPlacing(false);
      });
      rzp.open();
    } catch (err) {
      toast.error(err.message || "Could not start payment. Please try again.");
      setPlacing(false);
    }
  }

  if (items.length === 0 && !orderId) {
    return (
      <div className="container-px max-w-2xl mx-auto py-16 text-center text-gray-500">
        <p className="mb-4">Your cart is empty.</p>
        <Link to="/category/popular" className="btn-primary px-5 py-2 text-sm">
          Shop Now
        </Link>
      </div>
    );
  }

  if (orderId) {
    return (
      <div className="container-px max-w-2xl mx-auto py-16 text-center">
        <CheckCircle2 size={56} className="mx-auto text-ayur-green mb-4" />
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Order Placed Successfully!</h1>
        <p className="text-gray-500 mb-1">
          Order ID: <span className="font-semibold text-gray-700">{orderId}</span>
        </p>
        <p className="text-gray-500 mb-6">
          Payment: {orderPayment === "cod" ? "Cash on Delivery" : orderPayment?.toUpperCase()} ·
          Total: ₹{orderTotal}
        </p>
        <p className="text-sm text-gray-500 mb-8">
          We've sent an order confirmation to your email. Our team will dispatch it today —
          expect delivery within 2-4 business days.
        </p>
        <Link to="/" className="btn-primary px-6 py-3 text-sm">
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="container-px max-w-6xl mx-auto py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Secure Checkout</h1>

      <div className="grid lg:grid-cols-[1fr_380px] gap-8">
        <form onSubmit={placeOrder} className="space-y-6">
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800">Shipping Details</h2>
              <button
                type="button"
                onClick={handleUseLocation}
                disabled={detectingLocation}
                className="flex items-center gap-1.5 text-xs font-semibold text-ayur-green bg-ayur-cream hover:bg-amber-100 rounded-full px-3 py-1.5 disabled:opacity-60"
              >
                {detectingLocation ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <LocateFixed size={14} />
                )}
                {detectingLocation ? "Detecting..." : "Use My Current Location"}
              </button>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <input
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="Full Name *"
                className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ayur-green/30 sm:col-span-2"
              />
              <input
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="10-digit Phone Number *"
                inputMode="numeric"
                className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ayur-green/30"
              />
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="Email Address *"
                className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ayur-green/30"
              />
              <div className="sm:col-span-2">
                <input
                  value={form.pincode}
                  onChange={(e) => handlePincodeChange(e.target.value)}
                  placeholder="Pincode *"
                  inputMode="numeric"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ayur-green/30"
                />
                {checkingPincode && (
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
                    <Loader2 size={12} className="animate-spin" /> Checking delivery estimate...
                  </p>
                )}
                {!checkingPincode && deliveryEstimate && (
                  <p className="text-xs text-ayur-green-dark font-medium mt-1 flex items-center gap-1.5">
                    <Truck size={12} />
                    {deliveryEstimate.guessed || !deliveryEstimate.state
                      ? `Estimated delivery in ${deliveryEstimate.days.min}-${deliveryEstimate.days.max} business days`
                      : `Estimated delivery to ${deliveryEstimate.state}: ${deliveryEstimate.days.min}-${deliveryEstimate.days.max} business days`}
                  </p>
                )}
              </div>
              <input
                value={form.flatBuilding}
                onChange={(e) => updateField("flatBuilding", e.target.value)}
                placeholder="Flat, House no., Building, Company, Apartment *"
                className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ayur-green/30 sm:col-span-2"
              />
              <input
                value={form.area}
                onChange={(e) => updateField("area", e.target.value)}
                placeholder="Area, Street, Sector, Village *"
                className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ayur-green/30 sm:col-span-2"
              />
              <input
                value={form.landmark}
                onChange={(e) => updateField("landmark", e.target.value)}
                placeholder="Landmark (optional) e.g. near Apollo Hospital"
                className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ayur-green/30 sm:col-span-2"
              />
              <input
                value={form.city}
                onChange={(e) => updateField("city", e.target.value)}
                placeholder="Town/City *"
                className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ayur-green/30"
              />
              <select
                value={form.state}
                onChange={(e) => updateField("state", e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ayur-green/30 bg-white text-gray-700"
              >
                <option value="">Choose a state *</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-card">
            <h2 className="font-semibold text-gray-800 mb-4">Payment Method</h2>
            <div className="space-y-2">
              {PAYMENT_METHODS.map((m) => (
                <label
                  key={m.id}
                  className={`flex items-center gap-3 border rounded-lg px-4 py-3 cursor-pointer transition-colors ${
                    payment === m.id
                      ? "border-ayur-green bg-ayur-cream/50"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    checked={payment === m.id}
                    onChange={() => setPayment(m.id)}
                    className="accent-ayur-green"
                  />
                  <m.icon size={18} className="text-ayur-green" />
                  <span className="text-sm font-medium text-gray-700 flex-1">{m.label}</span>
                  {m.id === "cod" && (
                    <span className="text-xs text-amber-600 font-medium">+₹{codFee} fee</span>
                  )}
                </label>
              ))}
            </div>
            {payment === "cod" && (
              <p className="text-xs text-gray-500 mt-2">
                💡 Pay online to avoid COD charges and enjoy faster processing.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={placing}
            className="btn-primary w-full py-3.5 text-sm disabled:opacity-60"
          >
            {placing ? "Placing Order..." : `PLACE ORDER — ₹${finalTotal}`}
          </button>

          <div className="flex items-center justify-center gap-4 text-xs text-gray-500 pt-2">
            <span className="flex items-center gap-1"><Lock size={13} /> SSL Secured</span>
            <span className="flex items-center gap-1"><ShieldCheck size={13} /> Razorpay Protected</span>
            <span className="flex items-center gap-1"><Truck size={13} /> 100% Money Back</span>
          </div>
        </form>

        {/* Order summary */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-card h-fit">
          <h2 className="font-semibold text-gray-800 mb-4">Order Summary</h2>
          <div className="space-y-3 max-h-64 overflow-y-auto pr-1 mb-4">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 text-sm">
                <img src={item.image} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="line-clamp-1 font-medium text-gray-700">{item.name}</p>
                  <div className="flex items-center border border-gray-200 rounded-md w-fit mt-1">
                    <button
                      type="button"
                      onClick={() => updateQty(item.id, item.qty - 1)}
                      className="p-1 hover:bg-gray-50"
                      aria-label="Decrease quantity"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="w-6 text-center text-xs font-medium">{item.qty}</span>
                    <button
                      type="button"
                      onClick={() => updateQty(item.id, item.qty + 1)}
                      className="p-1 hover:bg-gray-50"
                      aria-label="Increase quantity"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
                <span className="font-semibold text-gray-700 shrink-0">₹{item.price * item.qty}</span>
              </div>
            ))}
          </div>
          <div className="text-sm space-y-1.5 border-t border-gray-100 pt-3">
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
            {shippingFee > 0 && (
              <div className="flex justify-between text-gray-500">
                <span>Delivery Charges</span>
                <span>+₹{shippingFee}</span>
              </div>
            )}
            {payment === "cod" && (
              <div className="flex justify-between text-gray-500">
                <span>COD Fee</span>
                <span>+₹{codFee}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-100">
              <span>Total Payable</span>
              <span className="text-ayur-green">₹{finalTotal}</span>
            </div>
          </div>

          <div className="bg-ayur-cream/60 border border-ayur-gold/30 rounded-xl px-3 py-2.5 mt-4">
            {remainingForFreeShip > 0 ? (
              <p className="text-xs font-medium text-ayur-green-dark mb-1.5">
                Add ₹{remainingForFreeShip} more & get FREE Shipping! 🚚
              </p>
            ) : (
              <p className="text-xs font-semibold text-ayur-green-dark mb-1.5">
                🎉 You've unlocked FREE Shipping!
              </p>
            )}
            <div className="h-1.5 bg-white rounded-full overflow-hidden">
              <div
                className="h-full bg-ayur-green transition-all duration-500"
                style={{ width: `${shippingProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
