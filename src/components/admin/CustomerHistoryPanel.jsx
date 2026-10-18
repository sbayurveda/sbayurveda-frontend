import { useEffect, useState } from "react";
import { Loader2, AlertTriangle, ShieldOff } from "lucide-react";
import { fetchCustomerHistory, AdminAuthError } from "../../api/adminApi";
import { formatMoney, statusMeta } from "../../utils/adminFormat";

// This customer's other orders, beside the one being processed.
//
// Dispatching a cash-on-delivery parcel is a decision, and it depends on what
// the same phone number has done before: four taken and three refused is a
// different proposition from a first-time buyer. That used to mean leaving the
// order, searching Customers, and coming back.

function Stat({ label, value, tone = "" }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`text-sm font-semibold tabular-nums ${tone || "text-slate-800"}`}>{value}</p>
    </div>
  );
}

export default function CustomerHistoryPanel({ order, onAuthError }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!order) return;
    let cancelled = false;
    setData(null);
    setError("");
    fetchCustomerHistory(order.id)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof AdminAuthError) onAuthError(err);
        else setError(err.message);
      });
    return () => { cancelled = true; };
  }, [order, onAuthError]);

  if (error) return <p className="text-xs text-red-600">{error}</p>;
  if (!data) {
    return (
      <p className="flex items-center gap-2 text-xs text-slate-400">
        <Loader2 size={13} className="animate-spin" /> Looking up this customer…
      </p>
    );
  }

  if (!data.phone) {
    return <p className="text-xs text-slate-400">No phone number on this order, so no history to match.</p>;
  }

  const s = data.summary;

  return (
    <div>
      {(data.atRisk || data.codBlocked) && (
        <p className="flex items-start gap-1.5 mb-2.5 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
          {data.codBlocked ? <ShieldOff size={13} className="shrink-0 mt-px" /> : <AlertTriangle size={13} className="shrink-0 mt-px" />}
          {data.codBlocked
            ? "Cash on delivery is switched off for this number."
            : "This number cancels cash-on-delivery orders often — worth a call before dispatch."}
        </p>
      )}

      {s && (
        <div className="grid grid-cols-4 gap-2 mb-3 pb-3 border-b border-slate-100">
          <Stat label="Orders" value={s.orders} />
          <Stat label="Lifetime" value={formatMoney(s.lifetimeValue)} />
          <Stat label="Avg order" value={formatMoney(s.averageOrder)} />
          <Stat
            label="Cancelled"
            value={s.cancelled ? `${s.cancelled} (${s.cancelRate}%)` : "0"}
            tone={s.cancelled ? "text-amber-700" : ""}
          />
        </div>
      )}

      {data.history.length === 0 ? (
        <p className="text-xs text-slate-400">First order from this number.</p>
      ) : (
        <ul className="space-y-1.5">
          {data.history.map((o) => {
            const meta = statusMeta(o.status);
            return (
              <li key={o.id} className="flex items-start justify-between gap-3 text-xs">
                <div className="min-w-0">
                  <p className="text-slate-700">
                    <span className="font-semibold">#{o.number}</span>
                    <span className="text-slate-400"> · {String(o.dateCreated).slice(0, 10)}</span>
                  </p>
                  {o.items.length > 0 && (
                    <p className="text-[11px] text-slate-400 truncate">{o.items.join(", ")}</p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-medium text-slate-700 tabular-nums">{formatMoney(o.total)}</p>
                  <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded-full border text-[10px] font-semibold ${meta.className}`}>
                    {meta.label}
                  </span>
                  {o.isCod && !o.isPaid && (
                    <span className="ml-1 text-[10px] text-amber-700 font-semibold">COD</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
