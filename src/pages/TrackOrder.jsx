import { Fragment, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { UserCircle, ShoppingBag, ExternalLink, Printer, X, Loader2, ChevronDown } from "lucide-react";
import { useStore } from "../context/store";
import { isBridgeConfigured, getOrderStatus } from "../api/checkoutBridge";
import { siteInfo } from "../data/siteInfo";

// Real WooCommerce order statuses — not a fictional shipping-carrier
// progress bar, since we only ever know what WooCommerce itself reports.
const STATUS_META = {
  pending: { label: "Pending Payment", className: "bg-gray-100 text-gray-600" },
  processing: { label: "Processing", className: "bg-amber-50 text-amber-700" },
  "on-hold": { label: "On Hold", className: "bg-amber-50 text-amber-700" },
  completed: { label: "Completed", className: "bg-green-50 text-green-700" },
  cancelled: { label: "Cancelled", className: "bg-red-50 text-red-600" },
  refunded: { label: "Refunded", className: "bg-gray-100 text-gray-600" },
  failed: { label: "Failed", className: "bg-red-50 text-red-600" },
};

function statusMeta(status) {
  return STATUS_META[status] || { label: status || "Processing", className: "bg-gray-100 text-gray-600" };
}

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

// Matches the GST split used on the real WooCommerce invoice: intra-state
// (Haryana, where the business is registered) is CGST + SGST, everything
// else is IGST. Accepts either the state code ("HR") or full name.
function isHaryana(state) {
  const s = (state || "").trim().toUpperCase();
  return s === "HR" || s === "HARYANA";
}

function InvoiceModal({ order, onClose }) {
  if (!order) return null;
  const subtotal = order.items.reduce((sum, i) => sum + Number(i.total ?? i.price * i.qty), 0);
  const totalTax = Number(order.totalTax || 0);
  const shippingTotal = Number(order.shippingTotal || 0);
  const feeTotal = Number(order.feeTotal || 0);
  const haryana = isHaryana(order.billingState);
  const cgst = haryana ? totalTax / 2 : 0;
  const sgst = haryana ? totalTax / 2 : 0;
  const igst = haryana ? 0 : totalTax;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 print:bg-white print:p-0">
      <div className="bg-white rounded-2xl w-full max-w-2xl p-8 relative shadow-2xl print:shadow-none print:rounded-none print:max-w-none max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 rounded-full print:hidden"
        >
          <X size={20} />
        </button>

        {/* Header: business identity + invoice meta */}
        <div className="flex items-start justify-between gap-6 pb-6 mb-6 border-b border-gray-100">
          <div className="flex items-start gap-3">
            <img src={siteInfo.logoUrl} alt="" className="h-12 w-auto" />
            <div className="text-xs text-gray-500 leading-relaxed">
              <p className="font-bold text-gray-800 text-sm mb-0.5">SB Ayurveda</p>
              <p className="max-w-[220px]">{siteInfo.address}</p>
              <p>{siteInfo.phone} · {siteInfo.email}</p>
              <p>GSTIN: {siteInfo.gstin}</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <h2 className="text-2xl font-bold text-gray-800 tracking-tight">INVOICE</h2>
            <p className="text-xs text-gray-500 mt-1">Invoice #{order.id}</p>
            <p className="text-xs text-gray-500">Order #{order.id}</p>
            <p className="text-xs text-gray-500">{formatDate(order.date)}</p>
          </div>
        </div>

        {/* Bill to */}
        {order.billingAddress && (
          <div className="mb-6">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Bill To</p>
            <p className="text-sm font-medium text-gray-800">{order.billingAddress.name}</p>
            <p className="text-sm text-gray-500">{order.billingAddress.line}</p>
          </div>
        )}

        <table className="w-full text-sm mb-4">
          <thead>
            <tr className="text-left text-[11px] text-gray-400 uppercase tracking-wide border-b border-gray-200">
              <th className="py-2">Item</th>
              <th className="py-2 text-right">Qty</th>
              <th className="py-2 text-right">Unit Price</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, i) => {
              const lineTotal = Number(item.total ?? item.price * item.qty);
              return (
                <tr key={i} className="border-b border-gray-50">
                  <td className="py-2 pr-2">{item.name}</td>
                  <td className="py-2 text-right">{item.qty}</td>
                  <td className="py-2 text-right text-gray-500">₹{(lineTotal / item.qty).toFixed(2)}</td>
                  <td className="py-2 text-right font-medium">₹{lineTotal.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="flex justify-end mb-6">
          <div className="w-56 text-sm space-y-1.5">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            {shippingTotal > 0 && (
              <div className="flex justify-between text-gray-500">
                <span>Delivery Charges</span>
                <span>₹{shippingTotal.toFixed(2)}</span>
              </div>
            )}
            {feeTotal > 0 && (
              <div className="flex justify-between text-gray-500">
                <span>COD Fee</span>
                <span>₹{feeTotal.toFixed(2)}</span>
              </div>
            )}
            {totalTax > 0 && (
              haryana ? (
                <>
                  <div className="flex justify-between text-gray-500">
                    <span>CGST (2.5%)</span>
                    <span>₹{cgst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>SGST (2.5%)</span>
                    <span>₹{sgst.toFixed(2)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-gray-500">
                  <span>IGST (5%)</span>
                  <span>₹{igst.toFixed(2)}</span>
                </div>
              )
            )}
            <div className="flex justify-between font-bold text-gray-800 text-base pt-1.5 border-t border-gray-200">
              <span>Total Payable</span>
              <span>₹{order.total}</span>
            </div>
          </div>
        </div>

        {totalTax > 0 && (
          <p className="text-[11px] text-gray-400 mb-6 -mt-4">
            Tax calculated as per GST rules: intra-state (Haryana) supplies are charged CGST + SGST,
            inter-state supplies are charged IGST.
          </p>
        )}

        <p className="text-xs text-gray-400 mb-1">
          Payment method: {order.paymentLabel || (order.payment === "cod" ? "Cash on Delivery" : order.payment)}
        </p>
        <p className="text-xs text-gray-400 mb-6">
          Order status: {statusMeta(order.status).label}
        </p>

        <p className="text-center text-xs text-gray-400 border-t border-gray-100 pt-4 mb-6">
          Thank you for shopping with SB Ayurveda — 100% Genuine Products, 2X Refund Guarantee.
        </p>

        <button
          onClick={() => window.print()}
          className="w-full flex items-center justify-center gap-2 btn-primary py-2.5 text-sm print:hidden"
        >
          <Printer size={15} /> Print / Save as PDF
        </button>
      </div>
    </div>
  );
}

function MyOrdersPanel() {
  const orders = useStore((s) => s.orders);
  const updateOrderStatus = useStore((s) => s.updateOrderStatus);
  const [expandedId, setExpandedId] = useState(null);
  const [invoiceOrder, setInvoiceOrder] = useState(null);
  const [syncing, setSyncing] = useState(isBridgeConfigured());
  const [showTrackById, setShowTrackById] = useState(false);

  useEffect(() => {
    if (!isBridgeConfigured() || orders.length === 0) {
      setSyncing(false);
      return;
    }
    let cancelled = false;
    Promise.all(
      orders.map((o) =>
        getOrderStatus(o.id, o.email)
          .then(({ order }) => {
            if (cancelled) return;
            updateOrderStatus(o.id, {
              status: order.status,
              total: order.total,
              totalTax: order.totalTax,
              shippingTotal: order.shippingTotal,
              feeTotal: order.feeTotal,
              trackingUrl: order.trackingUrl,
              paymentLabel: order.paymentMethodTitle,
              items: order.items.map((i) => ({ name: i.name, qty: i.qty, total: i.total })),
              billingState: order.billing?.state,
              billingAddress: order.billing
                ? {
                    name: `${order.billing.first_name} ${order.billing.last_name}`.trim(),
                    line: [order.billing.address_1, order.billing.city, order.billing.state, order.billing.postcode]
                      .filter(Boolean)
                      .join(", "),
                  }
                : undefined,
            });
          })
          .catch(() => {
            /* order may have been placed before the bridge existed, or is a guest ID we can't look up — keep local data */
          })
      )
    ).finally(() => !cancelled && setSyncing(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const trackByIdToggle = (
    <button
      onClick={() => setShowTrackById((v) => !v)}
      className="flex items-center gap-1.5 text-sm font-medium text-ayur-green mb-4"
    >
      Looking for an order from another device? Track it here
      <ChevronDown size={15} className={`transition-transform ${showTrackById ? "rotate-180" : ""}`} />
    </button>
  );

  if (orders.length === 0) {
    return (
      <div>
        {trackByIdToggle}
        {showTrackById && (
          <div className="mb-6">
            <TrackByIdPanel />
          </div>
        )}
        <div className="bg-white border border-gray-100 rounded-2xl p-10 shadow-card text-center">
          <ShoppingBag size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 mb-4">You haven't placed any orders on this device yet.</p>
          <Link to="/category/popular" className="btn-primary px-5 py-2 text-sm">
            Shop Now
          </Link>
          <p className="text-xs text-gray-400 mt-4">
            Note: orders are currently stored on this device/browser only. Cross-device order
            history will be available once account sync goes live.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {trackByIdToggle}
      {showTrackById && (
        <div className="mb-6">
          <TrackByIdPanel />
        </div>
      )}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-card overflow-hidden">
      {syncing && (
        <p className="flex items-center gap-1.5 text-xs text-gray-400 px-4 pt-3">
          <Loader2 size={12} className="animate-spin" /> Checking latest status from our system...
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Order</th>
              <th className="text-left px-4 py-3">Date</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Total</th>
              <th className="text-left px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orders.map((o) => {
              const meta = statusMeta(o.status);
              const qtyTotal = o.items.reduce((n, i) => n + i.qty, 0);
              return (
                <Fragment key={o.id}>
                  <tr>
                    <td className="px-4 py-3 font-semibold text-gray-700">#{o.id}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(o.date)}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${meta.className}`}>{meta.label}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-700">
                      ₹{o.total} for {qtyTotal} item{qtyTotal > 1 ? "s" : ""}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {o.trackingUrl && (
                          <a
                            href={o.trackingUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100"
                          >
                            Track <ExternalLink size={11} />
                          </a>
                        )}
                        <button
                          onClick={() => setExpandedId(expandedId === o.id ? null : o.id)}
                          className="text-xs font-semibold text-ayur-green bg-ayur-cream px-3 py-1.5 rounded-full hover:bg-amber-100"
                        >
                          {expandedId === o.id ? "Hide" : "View"}
                        </button>
                        <button
                          onClick={() => setInvoiceOrder(o)}
                          className="text-xs font-semibold text-gray-600 bg-gray-50 px-3 py-1.5 rounded-full hover:bg-gray-100"
                        >
                          Invoice
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedId === o.id && (
                    <tr>
                      <td colSpan={5} className="px-4 pb-5">
                        <div className="bg-gray-50 rounded-xl p-4">
                          <ul className="text-sm text-gray-600 space-y-1 mb-3">
                            {o.items.map((item, i) => (
                              <li key={i} className="flex justify-between">
                                <span>{item.name} x{item.qty}</span>
                                <span>₹{item.total ?? item.price * item.qty}</span>
                              </li>
                            ))}
                          </ul>
                          <p className="text-xs text-gray-400">
                            Payment: {o.paymentLabel || (o.payment === "cod" ? "Cash on Delivery" : o.payment)}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      {invoiceOrder && <InvoiceModal order={invoiceOrder} onClose={() => setInvoiceOrder(null)} />}
      </div>
    </div>
  );
}

function TrackByIdPanel() {
  const [orderId, setOrderId] = useState("");
  const [contact, setContact] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleTrack(e) {
    e.preventDefault();
    if (!orderId.trim() || !contact.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      if (!isBridgeConfigured()) throw new Error("Order lookup isn't available yet — please contact us on WhatsApp with your order ID.");
      const { order } = await getOrderStatus(orderId.trim(), contact.trim());
      setResult(order);
    } catch (err) {
      setError(err.message || "Couldn't find that order.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-card">
      <h2 className="font-semibold text-gray-800 mb-1">Track an Order by ID</h2>
      <p className="text-sm text-gray-500 mb-4">
        Enter the order ID and the phone number or email used on that order — both are needed so
        we only show order details to whoever actually placed it.
      </p>
      <form onSubmit={handleTrack} className="space-y-2 mb-6">
        <input
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
          placeholder="Order ID, e.g. 9684"
          className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ayur-green/30"
        />
        <input
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="Phone number or email used on the order"
          className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ayur-green/30"
        />
        <button disabled={loading} className="btn-primary w-full py-2.5 text-sm disabled:opacity-60">
          {loading ? "Checking..." : "Track"}
        </button>
      </form>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {result && (
        <div>
          <p className="text-sm text-gray-500 mb-2">
            Order <span className="font-semibold text-gray-700">#{result.id}</span> — Status:{" "}
            <span className={`badge ${statusMeta(result.status).className}`}>{statusMeta(result.status).label}</span>
          </p>
          {result.trackingUrl && (
            <a
              href={result.trackingUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-sm font-semibold text-blue-700 mt-2"
            >
              Track with courier <ExternalLink size={13} />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export default function TrackOrder() {
  const orders = useStore((s) => s.orders);

  return (
    <div className="container-px max-w-5xl mx-auto py-10">
      <div className="flex items-center gap-3 mb-6">
        <UserCircle size={28} className="text-ayur-green" />
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            My Orders {orders.length > 0 && `(${orders.length})`}
          </h1>
          <p className="text-sm text-gray-500">Your order history and live order status</p>
        </div>
      </div>

      <MyOrdersPanel />
    </div>
  );
}
