import { useCallback, useEffect, useState } from "react";
import { Loader2, Save, Trash2, ShieldOff } from "lucide-react";
import toast from "react-hot-toast";
import {
  getAdminSession, clearAdminSession, isAdminApiConfigured, AdminAuthError,
  fetchCodRules, saveCodRules, unblockCodPhone,
} from "../api/adminApi";
import AdminLogin from "../components/admin/AdminLogin";
import AdminShell from "../components/admin/AdminShell";
import { useSeo } from "../utils/useSeo";

const inputCls =
  "w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ayur-green/25";

function Switch({ on, onChange, label }) {
  return (
    <button
      type="button" role="switch" aria-checked={on} aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
        on ? "bg-ayur-green" : "bg-slate-300"
      }`}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
        on ? "translate-x-[18px]" : "translate-x-0.5"}`} />
    </button>
  );
}

export default function AdminSettings() {
  useSeo({ title: "Settings — Admin", path: "/admin/settings", noindex: true });

  const [session, setSession] = useState(getAdminSession);
  const [rules, setRules] = useState(null);
  const [saved, setSaved] = useState("");
  const [busy, setBusy] = useState(false);
  const [blockedProducts, setBlockedProducts] = useState(0);

  const onAuthError = useCallback((err) => {
    clearAdminSession(); setSession(null); toast.error(err.message);
  }, []);

  const load = useCallback(() => {
    fetchCodRules()
      .then((d) => { setRules(d.rules); setSaved(JSON.stringify(d.rules)); setBlockedProducts(d.blockedProducts || 0); })
      .catch((err) => { if (err instanceof AdminAuthError) onAuthError(err); else toast.error(err.message); });
  }, [onAuthError]);

  useEffect(() => { if (session) load(); }, [session, load]);

  const dirty = rules && JSON.stringify(rules) !== saved;
  const set = (key) => (e) => setRules((r) => ({ ...r, [key]: e.target.value }));

  async function save() {
    setBusy(true);
    try {
      const { rules: stored } = await saveCodRules({
        ...rules,
        minOrderValue: Number(rules.minOrderValue),
        maxOrderValue: Number(rules.maxOrderValue),
        fee: Number(rules.fee),
      });
      setRules(stored); setSaved(JSON.stringify(stored));
      toast.success("Saved — the next checkout follows these");
    } catch (err) {
      if (err instanceof AdminAuthError) onAuthError(err);
      else toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function unblock(phone) {
    try {
      const { rules: stored } = await unblockCodPhone(phone);
      setRules(stored); setSaved(JSON.stringify(stored));
      toast.success(`${phone} can pay on delivery again`);
    } catch (err) {
      if (err instanceof AdminAuthError) onAuthError(err);
      else toast.error(err.message);
    }
  }

  if (!isAdminApiConfigured()) return <div className="p-8 text-center text-slate-500">Admin API isn't configured.</div>;
  if (!session) return <AdminLogin onSuccess={() => setSession(getAdminSession())} />;

  return (
    <AdminShell
      title="Settings"
      subtitle="Cash on delivery is withdrawn by any one of three rules: the order value, a product in the cart, or the phone number."
      onSignOut={() => { clearAdminSession(); setSession(null); }}
      actions={
        <button onClick={save} disabled={!dirty || busy}
          className="btn-primary px-3 py-1.5 text-sm flex items-center gap-1.5 disabled:opacity-40">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {dirty ? "Save changes" : "Saved"}
        </button>
      }
    >
      {!rules ? (
        <p className="text-sm text-slate-400 py-8 text-center">
          <Loader2 size={15} className="animate-spin inline mr-1.5" /> Loading…
        </p>
      ) : (
        <div className="grid lg:grid-cols-2 gap-3 items-start max-w-5xl">
          <div className="bg-white border border-slate-200 rounded-xl">
            <header className="px-4 py-3 border-b border-slate-100">
              <h2 className="text-[13.5px] font-semibold">Cash on Delivery</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Takes effect on the next checkout</p>
            </header>
            <div className="px-4 py-3 space-y-3">
              <div className="flex items-center gap-3 border border-slate-200 rounded-lg px-3 py-2.5">
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800">Offer cash on delivery</p>
                  <p className="text-[10.5px] text-slate-400 mt-0.5">
                    {rules.enabled ? "On — subject to the rules below." : "Off — the whole shop is prepaid only."}
                  </p>
                </div>
                <Switch on={rules.enabled} onChange={(v) => setRules((r) => ({ ...r, enabled: v }))}
                  label="Offer cash on delivery" />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <label className="block">
                  <span className="block text-[11px] font-semibold text-slate-500 mb-1">Available from ₹</span>
                  <input value={rules.minOrderValue} onChange={set("minOrderValue")} inputMode="decimal" className={inputCls} />
                </label>
                <label className="block">
                  <span className="block text-[11px] font-semibold text-slate-500 mb-1">Up to ₹</span>
                  <input value={rules.maxOrderValue} onChange={set("maxOrderValue")} inputMode="decimal" className={inputCls} />
                </label>
              </div>
              <p className="text-[10.5px] text-slate-400 leading-relaxed">
                Measured on goods plus delivery — what the courier is actually asked to collect,
                before the handling fee is added.
              </p>

              <label className="block">
                <span className="block text-[11px] font-semibold text-slate-500 mb-1">Handling fee ₹</span>
                <input value={rules.fee} onChange={set("fee")} inputMode="decimal" className={inputCls} />
              </label>
              <p className="text-[10.5px] text-slate-400">
                Added to COD orders and treated as tax-inclusive at the goods rate.
              </p>

              <p className="text-[11px] text-slate-500 border-t border-slate-100 pt-2.5">
                <b className="tabular-nums">{blockedProducts}</b>{" "}
                {blockedProducts === 1 ? "product has" : "products have"} cash on delivery switched off
                individually — set that on the product itself.
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl">
            <header className="px-4 py-3 border-b border-slate-100">
              <h2 className="text-[13.5px] font-semibold flex items-center gap-1.5">
                <ShieldOff size={14} className="text-amber-600" /> Numbers that can't pay on delivery
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Added from the Customers page. They can still buy — they pay online.
              </p>
            </header>

            {rules.blockedPhones?.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-[12.5px] min-w-[420px]">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wide text-slate-400">
                      <th className="text-left px-3 py-2 font-semibold border-b border-slate-100">Phone</th>
                      <th className="text-left px-3 py-2 font-semibold border-b border-slate-100">Blocked</th>
                      <th className="text-left px-3 py-2 font-semibold border-b border-slate-100">Reason</th>
                      <th className="border-b border-slate-100"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rules.blockedPhones.map((b) => (
                      <tr key={b.phone} className="hover:bg-slate-50">
                        <td className="px-3 py-2.5 border-b border-slate-100 tabular-nums">{b.phone}</td>
                        <td className="px-3 py-2.5 border-b border-slate-100 tabular-nums text-slate-500">
                          {(b.blockedAt || "").slice(0, 10)}
                        </td>
                        <td className="px-3 py-2.5 border-b border-slate-100 text-slate-600">{b.reason || "—"}</td>
                        <td className="px-3 py-2.5 border-b border-slate-100 text-right">
                          <button onClick={() => unblock(b.phone)}
                            className="text-[11.5px] text-slate-500 hover:text-ayur-green inline-flex items-center gap-1">
                            <Trash2 size={12} /> Unblock
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="px-4 py-8 text-center text-sm text-slate-400">
                Nobody is blocked. Add numbers from the Customers page.
              </p>
            )}
          </div>
        </div>
      )}
    </AdminShell>
  );
}
