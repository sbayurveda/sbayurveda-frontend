import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Search, AlertTriangle, ShieldOff } from "lucide-react";
import toast from "react-hot-toast";
import {
  getAdminSession, clearAdminSession, isAdminApiConfigured, AdminAuthError, fetchCustomers,
  blockCodPhone, unblockCodPhone,
} from "../api/adminApi";
import AdminLogin from "../components/admin/AdminLogin";
import AdminShell from "../components/admin/AdminShell";
import { formatMoney } from "../utils/adminFormat";
import { useSeo } from "../utils/useSeo";

function Stat({ label, value, note, tone }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-3.5 py-3">
      <h3 className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</h3>
      <p className="text-xl font-medium tabular-nums mt-1.5 text-slate-900">{value}</p>
      {note && <p className={`text-[11px] mt-0.5 ${tone === "bad" ? "text-red-600" : "text-slate-500"}`}>{note}</p>}
    </div>
  );
}

export default function AdminCustomers() {
  useSeo({ title: "Customers — Admin", path: "/admin/customers", noindex: true });

  const [session, setSession] = useState(getAdminSession);
  const [data, setData] = useState(null);
  const [q, setQ] = useState("");
  const [pays, setPays] = useState("any");
  const [repeat, setRepeat] = useState(false);
  const [risk, setRisk] = useState(false);
  const [sort, setSort] = useState("value");
  const [blockedOnly, setBlockedOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [blocking, setBlocking] = useState("");

  const onAuthError = useCallback((err) => {
    clearAdminSession(); setSession(null); toast.error(err.message);
  }, []);

  // Filters and typing both fire requests, and they do not return in order.
  // Only the newest answer may write to the screen, or a slower earlier one
  // lands last and the list stops matching the filters above it.
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const mine = ++requestId.current;
    setLoading(true);
    try {
      const result = await fetchCustomers({ q, pays, repeat, risk, blocked: blockedOnly, sort, perPage: 100 });
      if (mine !== requestId.current) return;
      setData(result);
    } catch (err) {
      if (mine !== requestId.current) return;
      if (err instanceof AdminAuthError) onAuthError(err);
      else toast.error(err.message);
    } finally {
      if (mine === requestId.current) setLoading(false);
    }
  }, [q, pays, repeat, risk, blockedOnly, sort, onAuthError]);

  useEffect(() => {
    if (!session) return;
    const t = setTimeout(load, q ? 250 : 0); // debounce typing, load immediately otherwise
    return () => clearTimeout(t);
  }, [session, load, q]);

  // The customer is never told. The option simply stops appearing for that
  // number, the way it does not appear for an order outside the value band.
  async function toggleBlock(c) {
    setBlocking(c.phone);
    try {
      if (c.codBlocked) {
        await unblockCodPhone(c.phone);
        toast.success(`${c.phone} can pay on delivery again`);
      } else {
        await blockCodPhone(c.phone, `${c.cancelled} of ${c.placed} COD orders cancelled`);
        toast.success(`${c.phone} is now prepaid only`);
      }
      await load();
    } catch (err) {
      if (err instanceof AdminAuthError) onAuthError(err);
      else toast.error(err.message);
    } finally {
      setBlocking("");
    }
  }

  if (!isAdminApiConfigured()) return <div className="p-8 text-center text-slate-500">Admin API isn't configured.</div>;
  if (!session) return <AdminLogin onSuccess={() => setSession(getAdminSession())} />;

  const s = data?.summary;

  return (
    <AdminShell
      title="Customers"
      subtitle="Built from the order book and grouped by phone number. Checkout has no login, so every order is a guest order — the phone is the only identity that carries across them."
      onSignOut={() => { clearAdminSession(); setSession(null); }}
    >
      {s && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-4">
          <Stat label="Buyers" value={s.total} note={data.unidentified ? `${data.unidentified} orders with no usable phone` : null} />
          <Stat label="Repeat buyers" value={s.repeat} note={`${s.repeatShare}% of all buyers`} />
          <Stat label="Avg lifetime" value={formatMoney(s.averageLifetime)} note={`${formatMoney(s.averageRepeatLifetime)} for repeat buyers`} />
          <Stat label="Repeat COD cancellers" value={s.atRisk} note={s.atRisk ? "worth refusing COD" : "none"} tone={s.atRisk ? "bad" : null} />
        </div>
      )}

      {data?.atRisk?.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 mb-4">
          <h2 className="text-[13px] font-bold text-amber-900 flex items-center justify-between gap-2 flex-wrap">
            <span className="flex items-center gap-1.5">
              <AlertTriangle size={14} /> Numbers that keep cancelling cash on delivery
            </span>
            <button
              onClick={() => setRisk((v) => !v)}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold border ${
                risk ? "bg-amber-900 text-white border-amber-900" : "bg-white border-amber-400 text-amber-900"
              }`}
            >
              {risk ? "Showing only these" : "Show only these"}
            </button>
          </h2>
          <p className="text-[11px] text-amber-800 mt-1 mb-2.5 max-w-[70ch]">
            Three or more orders, at least 40% of them cancelled. Each one is a parcel shipped twice
            and goods that came back unsellable.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {data.atRisk.map((c) => (
              <span key={c.phone} className={`rounded-lg pl-2.5 pr-1 py-1 text-[11px] flex items-center gap-2 border ${
                c.codBlocked ? "bg-slate-100 border-slate-300 text-slate-500 line-through decoration-slate-400" : "bg-white border-amber-300"
              }`}>
                <span>
                  <b className="tabular-nums">{c.phone}</b>
                  <span className="text-amber-800"> · {c.cancelled} of {c.placed} cancelled</span>
                </span>
                <button
                  onClick={() => toggleBlock(c)}
                  disabled={blocking === c.phone}
                  className={`px-1.5 py-0.5 rounded text-[10.5px] font-semibold disabled:opacity-40 inline-flex items-center gap-1 ${
                    c.codBlocked ? "text-slate-600 hover:bg-slate-100" : "text-red-700 hover:bg-red-50"
                  }`}
                >
                  {blocking === c.phone ? <Loader2 size={10} className="animate-spin" /> : <ShieldOff size={10} />}
                  {c.codBlocked ? "Unblock" : "Block COD"}
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl">
        <div className="px-3.5 py-2.5 border-b border-slate-100 flex items-center gap-2">
          <Search size={14} className="text-slate-400 shrink-0" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Name, phone, email, city or state…"
            className="flex-1 min-w-0 text-sm bg-transparent focus:outline-none"
          />
          {loading && <Loader2 size={14} className="animate-spin text-slate-400" />}
          {data && <span className="text-[11px] text-slate-400 tabular-nums shrink-0">{data.total}</span>}
        </div>

        <div className="px-3.5 py-2 border-b border-slate-100 flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="flex gap-1">
            {[["any", "Everyone"], ["cod", "COD"], ["prepaid", "Prepaid"], ["mixed", "Mixed"]].map(([k, label]) => (
              <button key={k} onClick={() => setPays(k)}
                className={`px-2.5 py-1 rounded-lg text-[11.5px] font-medium border transition-colors ${
                  pays === k ? "bg-ayur-green text-white border-ayur-green" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}>{label}</button>
            ))}
          </span>

          <button onClick={() => setRepeat((v) => !v)}
            className={`px-2.5 py-1 rounded-lg text-[11.5px] font-medium border transition-colors ${
              repeat ? "bg-ayur-green text-white border-ayur-green" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}>Repeat buyers</button>

          <button onClick={() => setRisk((v) => !v)}
            className={`px-2.5 py-1 rounded-lg text-[11.5px] font-medium border transition-colors ${
              risk ? "bg-amber-600 text-white border-amber-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}>COD risks</button>

          <button onClick={() => setBlockedOnly((v) => !v)}
            className={`px-2.5 py-1 rounded-lg text-[11.5px] font-medium border transition-colors ${
              blockedOnly ? "bg-red-700 text-white border-red-700" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}>Blocked{data?.blockedCount ? ` (${data.blockedCount})` : ""}</button>

          <label className="ml-auto flex items-center gap-1.5 text-[11.5px] text-slate-500">
            Sort
            <select value={sort} onChange={(e) => setSort(e.target.value)}
              className="border border-slate-200 rounded-lg px-2 py-1 text-[11.5px] bg-white text-slate-700">
              <option value="value">Lifetime value</option>
              <option value="orders">Most orders</option>
              <option value="recent">Most recent</option>
              <option value="cancelled">Most cancelled</option>
            </select>
          </label>

          {(pays !== "any" || repeat || risk || blockedOnly || q) && (
            <button onClick={() => { setPays("any"); setRepeat(false); setRisk(false); setBlockedOnly(false); setQ(""); }}
              className="text-[11.5px] text-slate-500 underline hover:text-slate-800">Clear</button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px] min-w-[720px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-wide text-slate-400">
                {["Customer", "Phone", "Orders", "Lifetime", "Avg order", "Pays", "COD", "Cancelled", "Last order"].map((h, i) => (
                  <th key={h} className={`px-3 py-2 font-semibold border-b border-slate-100 whitespace-nowrap ${i >= 2 && i <= 4 ? "text-right" : i === 7 ? "text-right" : "text-left"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data?.customers || []).map((c) => (
                <tr key={c.phone} className="hover:bg-slate-50">
                  <td className="px-3 py-2.5 border-b border-slate-100">{c.name || "—"}</td>
                  <td className="px-3 py-2.5 border-b border-slate-100 tabular-nums">{c.phone}</td>
                  <td className="px-3 py-2.5 border-b border-slate-100 text-right tabular-nums">{c.orders}</td>
                  <td className="px-3 py-2.5 border-b border-slate-100 text-right tabular-nums font-medium">{formatMoney(c.lifetimeValue)}</td>
                  <td className="px-3 py-2.5 border-b border-slate-100 text-right tabular-nums text-slate-500">{formatMoney(c.averageOrder)}</td>
                  <td className="px-3 py-2.5 border-b border-slate-100">
                    <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${
                      c.pays === "cod" ? "bg-amber-50 text-amber-700"
                        : c.pays === "prepaid" ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-600"
                    }`}>{c.pays === "cod" ? "COD" : c.pays === "prepaid" ? "Prepaid" : "Mixed"}</span>
                  </td>
                  <td className="px-3 py-2.5 border-b border-slate-100">
                    <button
                      onClick={() => toggleBlock(c)}
                      disabled={blocking === c.phone}
                      title={c.codBlocked ? "Allow cash on delivery again" : "Stop offering cash on delivery to this number"}
                      className={`px-2 py-0.5 rounded-full text-[10.5px] font-semibold border transition-colors disabled:opacity-40 ${
                        c.codBlocked
                          ? "bg-red-50 text-red-700 border-red-300 hover:bg-red-100"
                          : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {blocking === c.phone ? "…" : c.codBlocked ? "Blocked" : "Allowed"}
                    </button>
                  </td>
                  <td className={`px-3 py-2.5 border-b border-slate-100 text-right tabular-nums ${c.cancelRate >= 40 ? "text-red-600 font-semibold" : "text-slate-500"}`}>
                    {c.cancelled}{c.cancelled > 0 ? ` (${c.cancelRate}%)` : ""}
                  </td>
                  <td className="px-3 py-2.5 border-b border-slate-100 tabular-nums text-slate-500">{(c.lastOrderAt || "").slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && data && data.customers.length === 0 && (
          <p className="px-3.5 py-8 text-center text-sm text-slate-400">No customer matches those filters.</p>
        )}
      </div>
    </AdminShell>
  );
}
