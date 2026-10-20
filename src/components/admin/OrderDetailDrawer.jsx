import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, ExternalLink, Loader2, StickyNote } from "lucide-react";
import { fetchOrderNotes, AdminAuthError } from "../../api/adminApi";
import { sanitizeDescriptionHtml } from "../../utils/sanitizeHtml";
import OrderEditPanel from "./OrderEditPanel";
import InvoicePanel from "./InvoicePanel";
import AddressEditor from "./AddressEditor";
import CustomerHistoryPanel from "./CustomerHistoryPanel";
import {
  customerName, deliveryMeta, formatAddress, formatDateTime, formatMoney,
  isCod, paymentMeta, statusMeta,
} from "../../utils/adminFormat";

function Section({ title, children }) {
  return (
    <div className="border-t border-slate-100 px-5 py-4">
      <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2.5">{title}</h3>
      {children}
    </div>
  );
}

function Row({ label, value, mono }) {
  return (
    <div className="flex justify-between gap-4 py-1 text-sm">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className={`text-slate-800 text-right break-words ${mono ? "font-mono text-xs" : ""}`}>
        {value || "—"}
      </span>
    </div>
  );
}

function TotalRow({ label, value, strong, negative }) {
  return (
    <div className={`flex justify-between py-1 ${strong ? "text-base font-bold text-slate-900 border-t border-slate-200 mt-1 pt-2" : "text-sm"}`}>
      <span className={strong ? "" : "text-slate-500"}>{label}</span>
      <span className={negative ? "text-green-600" : ""}>{negative ? `−${value}` : value}</span>
    </div>
  );
}

export default function OrderDetailDrawer({ order, onClose, onAuthError, onUpdated }) {
  const [notes, setNotes] = useState(null);
  const [notesError, setNotesError] = useState("");

  useEffect(() => {
    if (!order) return;
    let cancelled = false;
    setNotes(null);
    setNotesError("");
    fetchOrderNotes(order.id)
      .then((d) => { if (!cancelled) setNotes(d.notes || []); })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof AdminAuthError) onAuthError(err);
        else setNotesError(err.message);
      });
    return () => { cancelled = true; };
  }, [order, onAuthError]);

  // Escape closes the drawer — expected in any admin tool.
  useEffect(() => {
    if (!order) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [order, onClose]);

  return (
    <AnimatePresence>
      {order && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/40 z-40"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="fixed top-0 right-0 h-full w-full sm:w-[560px] bg-white z-50 flex flex-col shadow-2xl overflow-y-auto"
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.25 }}
          >
            <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-start justify-between z-10">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Order #{order.number}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{formatDateTime(order.dateCreated)}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[statusMeta(order.status), paymentMeta(order), deliveryMeta(order)].map((m, i) => (
                    <span key={i} className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold ${m.className}`}>
                      {m.label}
                    </span>
                  ))}
                  {order.needsReview && (
                    <span className="px-2 py-0.5 rounded-full border text-[11px] font-bold bg-red-50 text-red-700 border-red-300">
                      ⚠ Needs review
                    </span>
                  )}
                </div>
                {order.needsReview && (
                  <p className="mt-2 text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5 leading-relaxed">
                    Paid, but the delivery address never reached us — this order was rebuilt from the
                    payment record. Call the customer for their address before dispatch, then set the
                    status to Processing.
                  </p>
                )}
              </div>
              <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-full" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <OrderEditPanel
              // Remounting on a different order re-seeds the form for free.
              // Keyed on the id, not the object: the same order comes back as
              // a new object on every save, and remounting then would wipe a
              // half-typed tracking number.
              key={order.id}
              order={order}
              onUpdated={onUpdated}
              onAuthError={onAuthError}
              onNoteAdded={(created) => setNotes((prev) => [created, ...(prev || [])])}
            />

            <Section title="Customer">
              <Row label="Name" value={customerName(order)} />
              <Row label="Email" value={order.billing?.email} />
              <Row label="Phone" value={order.billing?.phone} />
            </Section>

            <Section title="Billing address">
              <AddressEditor order={order} which="billing" onUpdated={onUpdated} onAuthError={onAuthError} />
            </Section>

            <Section title="Shipping address">
              <AddressEditor order={order} which="shipping" onUpdated={onUpdated} onAuthError={onAuthError} />
            </Section>

            <Section title="Payment">
              <Row label="Method" value={order.paymentMethodTitle || order.paymentMethod} />
              <Row label="Transaction ID" value={order.transactionId} mono />
              <Row label="Paid on" value={order.datePaid ? formatDateTime(order.datePaid) : (isCod(order) ? "Collect on delivery" : "Not paid")} />
            </Section>

            <Section title="This customer's other orders">
              <CustomerHistoryPanel order={order} onAuthError={onAuthError} />
            </Section>

            <Section title="Tax invoice">
              <InvoicePanel order={order} onAuthError={onAuthError} />
            </Section>

            <Section title={`Items (${order.lineItems?.length || 0})`}>
              <div className="space-y-2">
                {(order.lineItems || []).map((item) => (
                  <div key={item.id} className="flex justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="text-slate-800">{item.name}</p>
                      <p className="text-xs text-slate-400">
                        {formatMoney(item.price)} × {item.qty}
                        {item.sku ? ` · SKU ${item.sku}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 font-medium text-slate-800">{formatMoney(item.total)}</span>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Totals">
              <TotalRow label="Items subtotal" value={formatMoney(order.itemsTotal)} />
              {order.discountTotal > 0 && (
                <TotalRow label="Discount" value={formatMoney(order.discountTotal)} negative />
              )}
              {order.shippingTotal > 0 && (
                <TotalRow label="Delivery charges" value={formatMoney(order.shippingTotal)} />
              )}
              {(order.feeLines || []).filter((f) => f.total > 0).map((f, i) => (
                <TotalRow key={i} label={f.name} value={formatMoney(f.total)} />
              ))}
              {order.cgst > 0 && <TotalRow label="CGST" value={formatMoney(order.cgst)} />}
              {order.sgst > 0 && <TotalRow label="SGST" value={formatMoney(order.sgst)} />}
              {order.igst > 0 && <TotalRow label="IGST" value={formatMoney(order.igst)} />}
              {order.totalTax > 0 && order.cgst + order.sgst + order.igst === 0 && (
                <TotalRow label="Tax" value={formatMoney(order.totalTax)} />
              )}
              <TotalRow label="Total" value={formatMoney(order.total, order.currency)} strong />
            </Section>

            {order.customerNote && (
              <Section title="Customer note">
                <p className="text-sm text-slate-800 font-semibold bg-amber-50 border border-amber-100 rounded-lg p-3 leading-relaxed">
                  {order.customerNote}
                </p>
              </Section>
            )}

            <Section title="Shipment">
              {/* Everything about the parcel in one place. The tracking number
                  is the thing most often read aloud to a customer on the
                  phone, so it is big enough to read and tappable to open the
                  courier's page. */}
              {order.trackingCode || order.trackingUrl || order.carrierName ? (
                <>
                  <div className="flex flex-wrap items-center gap-2 mb-2.5">
                    <span className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold ${statusMeta(order.status).className}`}>
                      {statusMeta(order.status).label}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold ${deliveryMeta(order).className}`}>
                      {deliveryMeta(order).label}
                    </span>
                  </div>

                  {order.trackingCode && (
                    <div className="mb-2">
                      <span className="block text-[11px] font-semibold text-slate-500 mb-1">Tracking ID</span>
                      {order.trackingUrl ? (
                        <a
                          href={order.trackingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between gap-2 w-full px-3 py-2.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-800 font-mono text-sm font-semibold break-all hover:bg-blue-100"
                        >
                          <span className="min-w-0 break-all">{order.trackingCode}</span>
                          <ExternalLink size={14} className="shrink-0" />
                        </a>
                      ) : (
                        <p className="px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 font-mono text-sm font-semibold text-slate-800 break-all">
                          {order.trackingCode}
                        </p>
                      )}
                    </div>
                  )}

                  <Row label="Carrier" value={order.carrierName} />
                  {order.pickUpDate && <Row label="Pickup date" value={String(order.pickUpDate).slice(0, 10)} />}
                  {order.trackingUrl && !order.trackingCode && (
                    <a href={order.trackingUrl} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1.5 mt-2 text-sm font-semibold text-blue-700 hover:underline">
                      Open tracking page <ExternalLink size={13} />
                    </a>
                  )}
                </>
              ) : (
                <p className="text-sm text-slate-400">
                  Not shipped yet — add the courier and tracking number below.
                </p>
              )}
            </Section>

            <Section title="Order notes & history">
              {notes === null && !notesError && (
                <p className="flex items-center gap-2 text-sm text-slate-400">
                  <Loader2 size={14} className="animate-spin" /> Loading notes…
                </p>
              )}
              {notesError && <p className="text-sm text-red-600">{notesError}</p>}
              {notes?.length === 0 && <p className="text-sm text-slate-400">No notes on this order yet.</p>}
              <div className="space-y-2.5">
                {(notes || []).map((n) => (
                  <div key={n.id} className={`rounded-lg p-3 border text-sm ${
                    n.isCustomerNote ? "bg-blue-50 border-blue-100" : "bg-slate-50 border-slate-100"
                  }`}>
                    <div
                      className="text-slate-700 leading-relaxed [&_p]:mb-1 [&_a]:text-blue-700 [&_a]:underline"
                      // Notes are written by plugins and staff, but some plugins
                      // echo customer-supplied text back into them — run it
                      // through the same allowlist the storefront uses.
                      dangerouslySetInnerHTML={{ __html: sanitizeDescriptionHtml(n.note) }}
                    />
                    <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                      <StickyNote size={10} />
                      {n.author || "system"} · {formatDateTime(n.dateCreated)}
                      {n.isCustomerNote && " · sent to customer"}
                    </p>
                  </div>
                ))}
              </div>
            </Section>

            <div className="h-6" />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
