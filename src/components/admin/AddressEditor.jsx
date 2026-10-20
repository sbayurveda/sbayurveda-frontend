import { useState } from "react";
import { Loader2, Pencil, Save, X } from "lucide-react";
import toast from "react-hot-toast";
import { updateOrder, AdminAuthError } from "../../api/adminApi";
import { formatAddress } from "../../utils/adminFormat";

// Correcting a delivery address without opening wp-admin.
//
// A missed flat number or a wrong pin code is common enough, and an order the
// courier cannot deliver is a parcel shipped twice. Only the fields that were
// actually changed are sent, so a quick fix to one line cannot blank the rest.

const FIELDS = [
  { key: "first_name", label: "First name", half: true },
  { key: "last_name", label: "Last name", half: true },
  { key: "address_1", label: "Address" },
  { key: "address_2", label: "Address line 2" },
  { key: "city", label: "City", half: true },
  { key: "state", label: "State", half: true },
  { key: "postcode", label: "PIN code", half: true },
  { key: "phone", label: "Phone", half: true },
];

const inputCls =
  "w-full border border-slate-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ayur-green/25";

export default function AddressEditor({ order, which, onUpdated, onAuthError }) {
  const current = order[which] || {};
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);

  const fields = which === "billing" ? [...FIELDS, { key: "email", label: "Email" }] : FIELDS;

  function open() {
    setForm(Object.fromEntries(fields.map((f) => [f.key, current[f.key] || ""])));
    setEditing(true);
  }

  // Only what actually differs is sent.
  const changed = () =>
    Object.fromEntries(
      Object.entries(form).filter(([k, v]) => String(v || "") !== String(current[k] || "")),
    );

  async function save() {
    const patch = changed();
    if (!Object.keys(patch).length) { setEditing(false); return; }
    setBusy(true);
    try {
      const { order: updated } = await updateOrder(order.id, { [which]: patch });
      onUpdated(updated);
      setEditing(false);
      toast.success(`${which === "billing" ? "Billing" : "Shipping"} address updated`);
    } catch (err) {
      if (err instanceof AdminAuthError) onAuthError(err);
      else toast.error(err.message || "Couldn't save that address.");
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-slate-700 leading-relaxed min-w-0">{formatAddress(current)}</p>
        <button
          onClick={open}
          className="shrink-0 inline-flex items-center gap-1 text-[11.5px] font-semibold text-ayur-green hover:underline"
        >
          <Pencil size={12} /> Edit
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* One column on a phone, two where there is room. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {fields.map((f) => (
          <label key={f.key} className={f.half ? "" : "sm:col-span-2"}>
            <span className="block text-[11px] font-semibold text-slate-500 mb-1">{f.label}</span>
            <input
              value={form[f.key] ?? ""}
              onChange={(e) => setForm((x) => ({ ...x, [f.key]: e.target.value }))}
              className={inputCls}
              inputMode={f.key === "postcode" || f.key === "phone" ? "numeric" : undefined}
            />
          </label>
        ))}
      </div>
      <div className="flex gap-2 mt-2.5">
        <button
          onClick={save}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12.5px] font-semibold bg-ayur-green text-white hover:opacity-90 disabled:opacity-50"
        >
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save address
        </button>
        <button
          onClick={() => setEditing(false)}
          className="inline-flex items-center gap-1 px-2 py-2 text-[12.5px] text-slate-500 hover:text-slate-800"
        >
          <X size={13} /> Cancel
        </button>
      </div>
    </div>
  );
}
