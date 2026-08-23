import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Download, Loader2, AlertTriangle, FileSpreadsheet } from "lucide-react";
import toast from "react-hot-toast";
import {
  PACKAGE_DEFAULTS, PRODUCT_TYPES, SHIPPING_SERVICES,
  downloadPickupWorkbook, validateOrdersForPickup,
} from "../../utils/pickupExport";

const inputCls =
  "w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ayur-green/25";

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold text-slate-500 mb-1">{label}</span>
      {children}
      {hint && <span className="block text-[10px] text-slate-400 mt-0.5">{hint}</span>}
    </label>
  );
}

export default function ExportDialog({ open, orders, onClose }) {
  const [pkg, setPkg] = useState(PACKAGE_DEFAULTS);
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [busy, setBusy] = useState(false);

  const problems = useMemo(() => (open ? validateOrdersForPickup(orders) : []), [open, orders]);
  const set = (key) => (e) => setPkg((p) => ({ ...p, [key]: e.target.value }));

  async function handleExport() {
    if (busy || orders.length === 0) return;
    setBusy(true);
    try {
      await downloadPickupWorkbook(orders, { pkg, pickupDate, pickupTime });
      toast.success(`Exported ${orders.length} order${orders.length > 1 ? "s" : ""}`);
      onClose();
    } catch (err) {
      toast.error(err.message || "Could not build the file.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 bg-black/40 z-40"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
          >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg pointer-events-auto max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="text-green-700" size={18} />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900">Export pickup sheet</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {orders.length} order{orders.length === 1 ? "" : "s"} · courier's Schedule&nbsp;Pickup format
                    </p>
                  </div>
                </div>
                <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-full" aria-label="Close">
                  <X size={18} />
                </button>
              </div>

              <div className="px-5 py-4 space-y-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">
                    Package details — applied to every row
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Field label="Length (cm)">
                      <input type="number" min="1" value={pkg.lengthCm} onChange={set("lengthCm")} className={inputCls} />
                    </Field>
                    <Field label="Width (cm)">
                      <input type="number" min="1" value={pkg.widthCm} onChange={set("widthCm")} className={inputCls} />
                    </Field>
                    <Field label="Height (cm)">
                      <input type="number" min="1" value={pkg.heightCm} onChange={set("heightCm")} className={inputCls} />
                    </Field>
                    <Field label="Weight (kg)">
                      <input type="number" min="0.011" step="0.1" value={pkg.weightKg} onChange={set("weightKg")} className={inputCls} />
                    </Field>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Product type">
                    <select value={pkg.productType} onChange={set("productType")} className={inputCls}>
                      {PRODUCT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </Field>
                  <Field label="Shipping service">
                    <select value={pkg.shippingService} onChange={set("shippingService")} className={inputCls}>
                      {SHIPPING_SERVICES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                  <Field label="Pickup date" hint="Optional">
                    <input type="date" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="Pickup time" hint="Optional · HH:MM">
                    <input type="time" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} className={inputCls} />
                  </Field>
                </div>

                {problems.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="flex items-center gap-1.5 text-xs font-bold text-amber-800 mb-1.5">
                      <AlertTriangle size={13} />
                      {problems.length} order{problems.length === 1 ? "" : "s"} may be rejected by the courier
                    </p>
                    <ul className="text-[11px] text-amber-800 space-y-0.5 max-h-28 overflow-y-auto">
                      {problems.slice(0, 8).map((p) => (
                        <li key={p.number}>#{p.number} — {p.issues.join(", ")}</li>
                      ))}
                      {problems.length > 8 && <li>…and {problems.length - 8} more</li>}
                    </ul>
                    <p className="text-[10px] text-amber-700 mt-1.5">
                      They'll still be exported — fix the address in WooCommerce to clear these.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100">
                <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">
                  Cancel
                </button>
                <button
                  onClick={handleExport}
                  disabled={busy || orders.length === 0}
                  className="btn-primary px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {busy ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                  {busy ? "Building…" : `Download .xlsx`}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
