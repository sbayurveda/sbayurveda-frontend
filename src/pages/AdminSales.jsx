import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, RefreshCw, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";
import {
  getAdminSession, clearAdminSession, isAdminApiConfigured, AdminAuthError,
  fetchStoreStatus, resyncStore,
} from "../api/adminApi";
import AdminLogin from "../components/admin/AdminLogin";
import AdminShell from "../components/admin/AdminShell";
import AnalyticsPanel from "../components/admin/AnalyticsPanel";
import { useSeo } from "../utils/useSeo";

function minutesAgo(ts) {
  if (!ts) return "never";
  const m = Math.round((Date.now() - ts) / 60000);
  return m < 1 ? "just now" : m === 1 ? "a minute ago" : `${m} minutes ago`;
}

export default function AdminSales() {
  useSeo({ title: "Sales — Admin", path: "/admin", noindex: true });

  const [session, setSession] = useState(getAdminSession);
  const [status, setStatus] = useState(null);
  const [syncing, setSyncing] = useState(false);

  const onAuthError = useCallback((err) => {
    clearAdminSession(); setSession(null); toast.error(err.message);
  }, []);

  const load = useCallback(() => {
    fetchStoreStatus()
      .then(setStatus)
      .catch((err) => { if (err instanceof AdminAuthError) onAuthError(err); });
  }, [onAuthError]);

  useEffect(() => { if (session) load(); }, [session, load]);

  async function resync() {
    setSyncing(true);
    try {
      await resyncStore();
      load();
      toast.success("Refreshed from WooCommerce");
    } catch (err) {
      if (err instanceof AdminAuthError) onAuthError(err);
      else toast.error(err.message);
    } finally {
      setSyncing(false);
    }
  }

  if (!isAdminApiConfigured()) return <div className="p-8 text-center text-slate-500">Admin API isn't configured.</div>;
  if (!session) return <AdminLogin onSuccess={() => setSession(getAdminSession())} />;

  return (
    <AdminShell
      title="Sales"
      subtitle="Everything here is read from the console's own copy of the shop, refreshed in the background — no waiting on WordPress."
      onSignOut={() => { clearAdminSession(); setSession(null); }}
      actions={
        <button onClick={resync} disabled={syncing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          {syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Refresh from WooCommerce
        </button>
      }
    >
      <div className="space-y-4">
        <AnalyticsPanel onAuthError={onAuthError} />

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {[
            { to: "/admin/orders", label: "Orders", note: "Table, filters, Amazon pickup export" },
            { to: "/admin/products", label: "Products", note: status ? `${status.products} in the catalogue` : "Add and repair" },
            { to: "/admin/customers", label: "Customers", note: "Grouped by phone, with COD risk" },
            { to: "/admin/tax", label: "Tax", note: "Monthly GST file" },
          ].map((c) => (
            <Link key={c.to} to={c.to}
              className="bg-white border border-slate-200 rounded-xl px-3.5 py-3 hover:border-ayur-green transition-colors group">
              <span className="flex items-center justify-between">
                <b className="text-[13.5px] text-slate-900">{c.label}</b>
                <ArrowRight size={14} className="text-slate-300 group-hover:text-ayur-green" />
              </span>
              <span className="block text-[11px] text-slate-500 mt-0.5">{c.note}</span>
            </Link>
          ))}
        </div>

        {status && (
          <p className="text-[11px] text-slate-400">
            Local copy: <b className="tabular-nums text-slate-600">{status.products}</b> products,{" "}
            <b className="tabular-nums text-slate-600">{status.orders}</b> orders · products synced{" "}
            {minutesAgo(status.syncedAt?.products)}, orders {minutesAgo(status.syncedAt?.orders)}
            {status.lastError && <span className="text-red-600"> · last sync failed: {status.lastError}</span>}
            {status.stale && !status.lastError && <span className="text-amber-700"> · this copy is getting old</span>}
          </p>
        )}
      </div>
    </AdminShell>
  );
}
