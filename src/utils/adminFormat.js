// Shared display helpers for the admin dashboard — kept out of the components
// so the table, the detail drawer and the CSV/Excel paths all label an order
// the same way.

export const ORDER_STATUSES = [
  { value: "any", label: "All statuses" },
  { value: "pending", label: "Pending payment" },
  { value: "processing", label: "Processing" },
  { value: "on-hold", label: "On hold" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "refunded", label: "Refunded" },
  { value: "failed", label: "Failed" },
];

const STATUS_STYLES = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  processing: "bg-blue-50 text-blue-700 border-blue-200",
  "on-hold": "bg-slate-100 text-slate-600 border-slate-200",
  completed: "bg-green-50 text-green-700 border-green-200",
  cancelled: "bg-slate-100 text-slate-500 border-slate-200",
  refunded: "bg-purple-50 text-purple-700 border-purple-200",
  failed: "bg-red-50 text-red-700 border-red-200",
};

export function statusMeta(status) {
  const found = ORDER_STATUSES.find((s) => s.value === status);
  return {
    label: found?.label || status || "—",
    className: STATUS_STYLES[status] || "bg-slate-100 text-slate-600 border-slate-200",
  };
}

// WooCommerce only stamps date_paid when money actually settles, so an order can
// sit in "processing" while still unpaid (a COD order always does). Reporting
// those separately is the whole point of having a payment-status column.
export function paymentMeta(order) {
  if (order.isPaid) {
    return { key: "paid", label: "Paid", className: "bg-green-50 text-green-700 border-green-200" };
  }
  if (order.status === "refunded") {
    return { key: "refunded", label: "Refunded", className: "bg-purple-50 text-purple-700 border-purple-200" };
  }
  if (order.status === "failed") {
    return { key: "failed", label: "Failed", className: "bg-red-50 text-red-700 border-red-200" };
  }
  if (isCod(order)) {
    return { key: "cod", label: "COD — due", className: "bg-amber-50 text-amber-700 border-amber-200" };
  }
  return { key: "unpaid", label: "Unpaid", className: "bg-slate-100 text-slate-600 border-slate-200" };
}

export function isCod(order) {
  return String(order.paymentMethod || "").toLowerCase().includes("cod");
}

export function formatMoney(amount, currency = "INR") {
  const n = Number(amount) || 0;
  const symbol = currency === "INR" ? "₹" : "";
  return `${symbol}${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// WooCommerce returns store-local time with no zone suffix; parsing it as-is
// and formatting the parts avoids shifting an order to the previous day.
export function formatDateTime(iso) {
  if (!iso) return "—";
  const [datePart, timePart = ""] = String(iso).split("T");
  const [y, m, d] = datePart.split("-");
  if (!y) return "—";
  return `${d}/${m}/${y}${timePart ? ` ${timePart.slice(0, 5)}` : ""}`;
}

export function formatDateOnly(iso) {
  if (!iso) return "—";
  const [y, m, d] = String(iso).slice(0, 10).split("-");
  return y ? `${d}/${m}/${y}` : "—";
}

export function customerName(order) {
  const b = order.billing || {};
  const s = order.shipping || {};
  return (
    [b.first_name || s.first_name, b.last_name || s.last_name].filter(Boolean).join(" ").trim() ||
    "—"
  );
}

export function formatAddress(addr = {}) {
  const parts = [
    addr.address_1,
    addr.address_2,
    addr.city,
    addr.state,
    addr.postcode,
    addr.country,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : "—";
}

export function productSummary(order) {
  return (order.lineItems || []).map((i) => `${i.name} x${i.qty}`).join(", ") || "—";
}

export function totalQty(order) {
  return (order.lineItems || []).reduce((sum, i) => sum + Number(i.qty || 0), 0);
}

// Delivery state is inferred from courier meta rather than order status: a
// "completed" order with no tracking hasn't necessarily shipped.
export function deliveryMeta(order) {
  if (order.status === "completed") {
    return { label: "Delivered", className: "bg-green-50 text-green-700 border-green-200" };
  }
  if (order.trackingCode || order.trackingUrl) {
    return { label: "Shipped", className: "bg-blue-50 text-blue-700 border-blue-200" };
  }
  if (["cancelled", "refunded", "failed"].includes(order.status)) {
    return { label: "—", className: "bg-slate-100 text-slate-500 border-slate-200" };
  }
  return { label: "Not shipped", className: "bg-slate-100 text-slate-600 border-slate-200" };
}
