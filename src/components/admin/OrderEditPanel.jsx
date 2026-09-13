import { useState } from "react";
import { Loader2, Save, Plus } from "lucide-react";
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

// The switch wp-admin shows at the top of YITH's Order Tracking box. Until it's
// on, the courier fields below are recorded but the customer sees nothing.
function PickupToggle({ on, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-40 ${
        on ? "bg-ayur-green" : "bg-slate-300"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          on ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export default function OrderEditPanel({ order, onUpdated, onAuthError, onNoteAdded }) {
  const [status, setStatus] = useState(order.status);
  const [pickedUp, setPickedUp] = useState(Boolean(order.pickedUp));
  const [carrier, setCarrier] = useState(order.carrierName || "");
  const [code, setCode] = useState(order.trackingCode || "");
  const [url, setUrl] = useState(order.trackingUrl || "");
  const [pickUpDate, setPickUpDate] = useState((order.pickUpDate || "").slice(0, 10));
  const [note, setNote] = useState("");
  const [notifyCustomer, setNotifyCustomer] = useState(false);
  const [busy, setBusy] = useState("");

  const statusChanged = status !== order.status;
  const trackingChanged =
    pickedUp !== Boolean(order.pickedUp) ||
    carrier !== (order.carrierName || "") ||
    code !== (order.trackingCode || "") ||
    url !== (order.trackingUrl || "") ||
    pickUpDate !== (order.pickUpDate || "").slice(0, 10);
  const dirty = statusChanged || trackingChanged;

  // Only couriers whose URL shape is confirmed generate a link; for the rest
  // buildTrackingUrl returns "" and the admin pastes what the courier gave them.
  // Guessing a plausible-but-wrong link sends customers to a dead page.
  function applyCarrier(nextCarrier) {
    const wasAuto = !url || url === buildTrackingUrl(carrier, code);
    setCarrier(nextCarrier);
    if (wasAuto) setUrl(buildTrackingUrl(nextCarrier, code));
  }

  function applyCode(nextCode) {
    const wasAuto = !url || url === buildTrackingUrl(carrier, code);
    setCode(nextCode);
    if (wasAuto) setUrl(buildTrackingUrl(carrier, nextCode));
  }

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

  // Status and courier details go up together in one request. Saving them
  // separately meant two WordPress round trips — on this host that is the
  // difference between roughly two seconds and four.
  //
  // The remaining wait is WordPress booting on shared hosting, and no amount of
  // work here removes it. What it does remove is staring at a spinner: the row
  // and the drawer update the moment the button is pressed, and the server's
  // answer is reconciled in behind it. If the save fails the optimistic copy is
  // rolled back to exactly what the server still holds, so a failure can never
  // leave the screen claiming something that isn't true.
  const saveAll = () => {
    if (busy) return;

    const payload = {};
    if (statusChanged) payload.status = status;
    if (trackingChanged) {
      payload.tracking = {
        pickedUp,
        carrierName: carrier,
        trackingCode: code,
        carrierUrl: url,
        pickUpDate,
      };
    }

    const parts = [];
    if (statusChanged) parts.push(SETTABLE_STATUSES.find((s) => s.value === status)?.label);
    if (trackingChanged) parts.push("tracking");
    const summary = `Order #${order.number} — ${parts.filter(Boolean).join(" + ")}`;

    const before = order;
    const optimistic = {
      ...order,
      ...(statusChanged ? { status } : {}),
      ...(trackingChanged
        ? {
            pickedUp,
            carrierName: carrier,
            trackingCode: code,
            trackingUrl: url,
            pickUpDate,
          }
        : {}),
    };
    onUpdated(optimistic);

    return run("save", async () => {
      try {
        const { order: updated } = await updateOrder(order.id, payload);
        // The server's copy wins — it may have normalised a field, or applied a
        // status WooCommerce overrode.
        onUpdated(updated);
        toast.success(`${summary} saved`);
      } catch (err) {
        onUpdated(before);
        throw err;
      }
    });
  };

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
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
          {SETTABLE_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Tracking ---------------------------------------------------------- */}
      <div className="px-5 py-4 border-b border-slate-100">
        <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2.5">
          Delivery &amp; tracking
        </h3>

        <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-3 py-2.5">
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-700">Order picked up by Carrier</p>
            <p className="text-[10px] text-slate-400">
              {pickedUp
                ? "Tracking is live — the customer can follow this parcel."
                : "Off: the details below are saved but stay hidden from the customer."}
            </p>
          </div>
          <PickupToggle on={pickedUp} onChange={setPickedUp} disabled={Boolean(busy)} />
        </div>

        <div className="grid grid-cols-2 gap-2.5 mt-2.5">
          <label className="block">
            <Label>Carrier name</Label>
            <select value={carrier} onChange={(e) => applyCarrier(e.target.value)} className={inputCls}>
              <option value="">— none —</option>
              {CARRIERS.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}{c.api === "planned" ? " (API later)" : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <Label>Tracking code / AWB</Label>
            <input
              value={code}
              onChange={(e) => applyCode(e.target.value)}
              placeholder="e.g. 372225471072"
              className={inputCls}
            />
          </label>
        </div>

        <label className="block mt-2.5">
          <Label>Carrier website link (what the customer opens)</Label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={
              findCarrier(carrier)?.trackingUrl
                ? "Filled in from the tracking code"
                : "Paste the courier's tracking link"
            }
            className={inputCls}
          />
          {findCarrier(carrier)?.trackingUrl && (
            <span className="block text-[10px] text-slate-400 mt-1">
              Built automatically from the tracking code — overwrite it if the courier gave you a
              different link.
            </span>
          )}
        </label>

        <label className="block mt-2.5">
          <Label>Pickup date</Label>
          <input type="date" value={pickUpDate} onChange={(e) => setPickUpDate(e.target.value)} className={inputCls} />
        </label>

        <button
          onClick={saveAll}
          disabled={!dirty || Boolean(busy)}
          className="btn-primary w-full mt-3 py-1.5 text-sm flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {busy === "save" ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {statusChanged && trackingChanged
            ? "Save status + tracking"
            : statusChanged
              ? "Save order status"
              : "Save tracking details"}
        </button>
        <p className="text-[10px] text-slate-400 mt-1.5">
          One save, one write to WooCommerce — the same as editing the order in wp-admin, including
          any customer email a status change normally triggers.
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
