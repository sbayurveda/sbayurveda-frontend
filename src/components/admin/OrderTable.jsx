import { ArrowDown, ArrowUp, ChevronsUpDown, ExternalLink, Package } from "lucide-react";
import {
  customerName, deliveryMeta, formatAddress, formatDateTime, formatMoney,
  paymentMeta, productSummary, statusMeta, totalQty,
} from "../../utils/adminFormat";

function SortHeader({ label, sortKey, sort, onSort, align = "left", className = "" }) {
  const active = sort.key === sortKey;
  const Icon = !active ? ChevronsUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th className={`px-3 py-2 font-semibold whitespace-nowrap text-${align} ${className}`}>
      <button
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 hover:text-ayur-green ${active ? "text-ayur-green" : ""}`}
      >
        {label}
        <Icon size={12} className={active ? "" : "text-slate-300"} />
      </button>
    </th>
  );
}

function Th({ children, className = "" }) {
  return <th className={`px-3 py-2 font-semibold whitespace-nowrap ${className}`}>{children}</th>;
}

function Badge({ meta }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full border text-[11px] font-semibold whitespace-nowrap ${meta.className}`}>
      {meta.label}
    </span>
  );
}

export default function OrderTable({ orders, selectedIds, onToggle, onToggleAll, onOpen, sort, onSort }) {
  const allShownSelected = orders.length > 0 && orders.every((o) => selectedIds.has(o.id));

  if (orders.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
        <Package size={32} className="mx-auto text-slate-300 mb-3" />
        <p className="text-sm font-medium text-slate-600">No orders match these filters</p>
        <p className="text-xs text-slate-400 mt-1">Try clearing a filter or widening the date range.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-slate-50 text-slate-600 text-xs border-b border-slate-200">
            <tr>
              <th className="sticky left-0 z-20 bg-slate-50 px-3 py-2 w-10">
                <input
                  type="checkbox"
                  checked={allShownSelected}
                  onChange={onToggleAll}
                  className="accent-ayur-green cursor-pointer"
                  aria-label="Select all rows on this page"
                />
              </th>
              <SortHeader label="Order" sortKey="number" sort={sort} onSort={onSort}
                className="sticky left-10 z-20 bg-slate-50" />
              <SortHeader label="Date & time" sortKey="dateCreated" sort={sort} onSort={onSort} />
              <SortHeader label="Customer" sortKey="customer" sort={sort} onSort={onSort} />
              <Th>Email</Th>
              <Th>Phone</Th>
              <Th>Products</Th>
              <Th className="text-right">Qty</Th>
              <Th className="text-right">Subtotal</Th>
              <Th className="text-right">Discount</Th>
              <Th className="text-right">Tax</Th>
              <Th className="text-right">Shipping</Th>
              <SortHeader label="Total" sortKey="total" sort={sort} onSort={onSort} align="right" />
              <Th>Payment method</Th>
              <Th>Payment status</Th>
              <SortHeader label="Order status" sortKey="status" sort={sort} onSort={onSort} />
              <Th>Delivery</Th>
              <Th>Transaction ID</Th>
              <Th>Tracking</Th>
              <Th>Notes</Th>
              <Th>Billing address</Th>
              <Th>Shipping address</Th>
              <Th />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.map((order) => {
              const selected = selectedIds.has(order.id);
              return (
                <tr
                  key={order.id}
                  onClick={() => onOpen(order)}
                  className={`cursor-pointer transition-colors ${selected ? "bg-ayur-green/5" : "hover:bg-slate-50"}`}
                >
                  <td
                    className={`sticky left-0 z-10 px-3 py-2.5 ${selected ? "bg-[#f2f7f4]" : "bg-white"}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => onToggle(order.id)}
                      className="accent-ayur-green cursor-pointer"
                      aria-label={`Select order ${order.number}`}
                    />
                  </td>
                  <td className={`sticky left-10 z-10 px-3 py-2.5 font-semibold text-slate-800 whitespace-nowrap ${selected ? "bg-[#f2f7f4]" : "bg-white"}`}>
                    #{order.number}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-slate-600">{formatDateTime(order.dateCreated)}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-slate-800">{customerName(order)}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-slate-500">{order.billing?.email || "—"}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-slate-500">{order.billing?.phone || "—"}</td>
                  <td className="px-3 py-2.5 text-slate-600 max-w-[240px] truncate" title={productSummary(order)}>
                    {productSummary(order)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-slate-600">{totalQty(order)}</td>
                  <td className="px-3 py-2.5 text-right text-slate-600 whitespace-nowrap">{formatMoney(order.itemsTotal)}</td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap text-slate-600">
                    {order.discountTotal > 0 ? (
                      <span className="text-green-600">−{formatMoney(order.discountTotal)}</span>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right text-slate-600 whitespace-nowrap">{formatMoney(order.totalTax)}</td>
                  <td className="px-3 py-2.5 text-right text-slate-600 whitespace-nowrap">{formatMoney(order.shippingTotal)}</td>
                  <td className="px-3 py-2.5 text-right font-semibold text-slate-900 whitespace-nowrap">{formatMoney(order.total, order.currency)}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-slate-600">{order.paymentMethodTitle || "—"}</td>
                  <td className="px-3 py-2.5"><Badge meta={paymentMeta(order)} /></td>
                  <td className="px-3 py-2.5"><Badge meta={statusMeta(order.status)} /></td>
                  <td className="px-3 py-2.5"><Badge meta={deliveryMeta(order)} /></td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-slate-500 font-mono text-[11px]">{order.transactionId || "—"}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    {order.trackingUrl ? (
                      <a href={order.trackingUrl} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1 text-blue-700 hover:underline text-xs font-semibold">
                        {order.trackingCode || "Track"} <ExternalLink size={11} />
                      </a>
                    ) : (
                      <span className="text-slate-400">{order.trackingCode || "—"}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-slate-500 max-w-[180px] truncate" title={order.customerNote}>
                    {order.customerNote || "—"}
                  </td>
                  <td className="px-3 py-2.5 text-slate-500 max-w-[220px] truncate" title={formatAddress(order.billing)}>
                    {formatAddress(order.billing)}
                  </td>
                  <td className="px-3 py-2.5 text-slate-500 max-w-[220px] truncate" title={formatAddress(order.shipping)}>
                    {formatAddress(order.shipping)}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className="text-xs font-semibold text-ayur-green">View</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
