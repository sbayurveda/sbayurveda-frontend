import { useEffect, useState } from "react";
import { Loader2, Save, Wand2, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { updateOrder, addOrderNote, AdminAuthError } from "../../api/adminApi";
import { ORDER_STATUSES } from "../../utils/adminFormat";
import { CARRIERS, buildTrackingUrl, findCarrier } from "../../utils/carriers";

const inputCls =
  "w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ayur-green/25";

// "any" is a filter option, not something an order can actually be set to.
const SETTABLE_STATUSES = ORDER_STATUSES.filter((s) => s.value !== "any");

function Label({ children }) {
  return <span className="block text-[11px] font-semibold text-slate-500 mb-1">{children}</span>;
}

export default function OrderEditPanel({ order, onUpdated, onAuthError, onNoteAdded }) {
  const [status, setStatus] = useState(order.status);
  const [carrier, setCarrier] = useState(order.carrierName || "");
  const [code, setCode] = useState(order.trackingCode || "");
  const [url, setUrl] = useState(order.trackingUrl || "");
  const [pickUpDate, setPickUpDate] = useState((order.pickUpDate || "").slice(0, 10));
  const [note, setNote] = useState("");
  const [notifyCustomer, setNotifyCustomer] = useState(false);
  const [busy, setBusy] = useState("");

  // Re-seed the form whenever a different order is opened.
  useEffect(() => {
    setStatus(order.status);
    setCarrier(order.carrierName || "");
    setCode(order.trackingCode || "");
    setUrl(order.trackingUrl || "");
    setPickUpDate((order.pickUpDate || "").slice(0, 10));
    setNote("");
    setNotifyCustomer(false);
  }, [order]);

  const suggestedUrl = buildTrackingUrl(carrier, code);
  const canSuggest = Boolean(suggestedUrl) && suggestedUrl !== url;
  const statusChanged = status !== order.status;
  const trackingChanged =
    carrier !== (order.carrierName || "") ||
    code !== (order.trackingCode || "") ||
    url !== (order.trackingUrl || "") ||
    pickUpDate !== (order.pickUpDate || "").slice(0, 10);

  async function run(kind, fn) {
    if (busy) return;
    setBusy(kind);
    try {
      await fn();
    } catch (err) {
      if (err instanceof AdminAuthError) onAuthError(err);
      else toast.error(err.message || "Couldn't save that.");
    } finally {
      setBusy("");
    }
  }

  const saveStatus = () =>
    run("status", async () => {
      const { order: updated } = await updateOrder(order.id, { status });
      onUpdated(updated);
      toast.success(`Order #${order.number} → ${SETTABLE_STATUSES.find((s) => s.value === status)?.label}`);
    });

  const saveTracking = () =>
    run("tracking", async () => {
      const { order: updated } = await updateOrder(order.id, {
        tracking: {
          carrierName: carrier,
          trackingCode: code,
          carrierUrl: url,
          pickUpDate,
        },
      });
      onUpdated(updated);
      toast.success("Tracking details saved");
    });

  const submitNote = () =>
    run("note", async () => {
      const { note: created } = await addOrderNote(order.id, note, { customerNote: notifyCustomer });
      onNoteAdded(created);
      setNote("");
      setNotifyCustomer(false);
      toast.success(notifyCustomer ? "Note added and emailed to customer" : "Note added");
    });

  return (
    <div className="border-t-4 border-slate-100 bg-slate-50/60">
      {/* Status ------------------------------------------------------------ */}
      <div className="px-5 py-4 border-b border-slate-100">
        <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2.5">
          Order status
        </h3>
        <div className="flex gap-2">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
            {SETTABLE_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <button
            onClick={saveStatus}
            disabled={!statusChanged || Boolean(busy)}
            className="btn-primary px-3 py-1.5 text-sm flex items-center gap-1.5 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy === "status" ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Update
          </button>
        </div>
        <p className="text-[10px] text-slate-400 mt-1.5">
          Saves straight to WooCommerce — the same as changing it in wp-admin, including any
          customer emails that status normally triggers.
        </p>
      </div>

      {/* Tracking ---------------------------------------------------------- */}
      <div className="px-5 py-4 border-b border-slate-100">
        <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2.5">
          Delivery &amp; tracking
        </h3>
        <div className="grid grid-cols-2 gap-2.5">
          <label className="block">
            <Label>Courier</Label>
            <select value={carrier} onChange={(e) => setCarrier(e.target.value)} className={inputCls}>
              <option value="">— none —</option>
              {CARRIERS.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}{c.api === "planned" ? " (API later)" : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <Label>Tracking / AWB number</Label>
            <input
              value={code}
              onChange={(e) => {
                const next = e.target.value;
                setCode(next);
                // Only auto-fill an empty link, so a pasted one is never clobbered.
                if (!url) setUrl(buildTrackingUrl(carrier, next));
              }}
              placeholder="e.g. 17526310001304"
              className={inputCls}
            />
          </label>
        </div>

        <label className="block mt-2.5">
          <Label>Tracking link (what the customer opens)</Label>
          <div className="flex gap-2">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={
                findCarrier(carrier)?.trackingUrl
                  ? "Auto-filled from the tracking number"
                  : "Paste the courier's tracking link"
              }
              className={inputCls}
            />
            {canSuggest && (
              <button
                onClick={() => setUrl(suggestedUrl)}
                title="Build the link from the tracking number"
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shrink-0"
              >
                <Wand2 size={14} />
              </button>
            )}
          </div>
        </label>

        <label className="block mt-2.5">
          <Label>Pickup date</Label>
          <input type="date" value={pickUpDate} onChange={(e) => setPickUpDate(e.target.value)} className={inputCls} />
        </label>

        <button
          onClick={saveTracking}
          disabled={!trackingChanged || Boolean(busy)}
          className="btn-primary w-full mt-3 py-1.5 text-sm flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {busy === "tracking" ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save tracking details
        </button>
        <p className="text-[10px] text-slate-400 mt-1.5">
          Stored on the order exactly as wp-admin stores it, so the customer's “Track” button and
          the courier export both pick it up.
        </p>
      </div>

      {/* Note -------------------------------------------------------------- */}
      <div className="px-5 py-4">
        <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2.5">
          Add a note
        </h3>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Anything worth recording against this order…"
          className={`${inputCls} resize-y`}
        />
        <label className="flex items-center gap-2 mt-2 text-xs text-slate-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={notifyCustomer}
            onChange={(e) => setNotifyCustomer(e.target.checked)}
            className="accent-ayur-green"
          />
          Email this note to the customer
        </label>
        <button
          onClick={submitNote}
          disabled={!note.trim() || Boolean(busy)}
          className="btn-primary w-full mt-2.5 py-1.5 text-sm flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {busy === "note" ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Add note
        </button>
      </div>
    </div>
  );
}
