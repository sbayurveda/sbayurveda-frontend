import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  RefreshCw, Download, LogOut, Loader2, ChevronLeft, ChevronRight,
  Package, IndianRupee, Clock, AlertCircle,
} from "lucide-react";
import { AdminAuthError, clearAdminSession, fetchAdminOrders, getAdminSession } from "../api/adminApi";
import AdminLogin from "../components/admin/AdminLogin";
import OrderFilters from "../components/admin/OrderFilters";
import { EMPTY_FILTERS } from "../utils/adminFilters";
import OrderTable from "../components/admin/OrderTable";
import OrderDetailDrawer from "../components/admin/OrderDetailDrawer";
import ExportDialog from "../components/admin/ExportDialog";
import { customerName, formatMoney, paymentMeta, productSummary } from "../utils/adminFormat";
import { useSeo } from "../utils/useSeo";

const PAGE_SIZE_OPTIONS = [25, 50, 100];
const LOAD_LIMIT_OPTIONS = [100, 250, 500, 1000];
const REFRESH_MS = 30000;

function matches(haystack, needle) {
  return String(haystack || "").toLowerCase().includes(needle.trim().toLowerCase());
}

function applyFilters(orders, f) {
  const term = f.search.trim().toLowerCase();
  const min = parseFloat(f.minAmount);
  const max = parseFloat(f.maxAmount);
  const phoneDigits = f.phone.replace(/\D/g, "");

  return orders.filter((o) => {
    if (term) {
      const hay = [
        o.number, customerName(o), o.billing?.email, o.billing?.phone,
        productSummary(o), o.transactionId, o.trackingCode,
      ].join(" ").toLowerCase();
      if (!hay.includes(term)) return false;
    }
    if (f.customerName && !matches(customerName(o), f.customerName)) return false;
    if (f.customerEmail && !matches(o.billing?.email, f.customerEmail)) return false;
    if (phoneDigits && !String(o.billing?.phone || "").replace(/\D/g, "").includes(phoneDigits)) return false;
    if (f.productName && !matches(productSummary(o), f.productName)) return false;
    if (f.paymentMethod !== "any" && (o.paymentMethodTitle || o.paymentMethod) !== f.paymentMethod) return false;
    if (f.paymentStatus !== "any" && paymentMeta(o).key !== f.paymentStatus) return false;
    if (!Number.isNaN(min) && Number(o.total) < min) return false;
    if (!Number.isNaN(max) && Number(o.total) > max) return false;
    return true;
  });
}

function sortOrders(orders, sort) {
  const dir = sort.dir === "asc" ? 1 : -1;
  const value = (o) => {
    switch (sort.key) {
      case "number": return Number(o.number) || 0;
      case "total": return Number(o.total) || 0;
      case "customer": return customerName(o).toLowerCase();
      case "status": return o.status || "";
      default: return o.dateCreated || "";
    }
  };
  return [...orders].sort((a, b) => {
    const av = value(a);
    const bv = value(b);
    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return 0;
  });
}

function StatCard({ icon: Icon, label, value, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-600",
    green: "bg-green-50 text-green-700",
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-blue-50 text-blue-700",
  };
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${tones[tone]}`}>
        <Icon size={17} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-slate-500 font-medium">{label}</p>
        <p className="text-base font-bold text-slate-900 truncate">{value}</p>
      </div>
    </div>
  );
}

export default function AdminOrders() {
  useSeo({ title: "Order History — Admin", path: "/admin/orders", noindex: true });

  const [session, setSession] = useState(() => getAdminSession());
  const [orders, setOrders] = useState([]);
  const [totalAvailable, setTotalAvailable] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sort, setSort] = useState({ key: "dateCreated", dir: "desc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [loadLimit, setLoadLimit] = useState(100);

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [detailOrder, setDetailOrder] = useState(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Tracks the newest order id already seen, so a background refresh can tell
  // the difference between "same data" and "a sale just came in".
  const newestSeenRef = useRef(null);

  const handleAuthError = useCallback((err) => {
    clearAdminSession();
    setSession(null);
    setOrders([]);
    toast.error(err?.message || "Session expired — please sign in again.");
  }, []);

  const loadOrders = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      setError("");
      try {
        // Date range and order status are pushed to WooCommerce so we only pull
        // what's relevant; everything else is filtered client-side over this set.
        const base = {
          after: filters.dateFrom ? `${filters.dateFrom}T00:00:00` : undefined,
          before: filters.dateTo ? `${filters.dateTo}T23:59:59` : undefined,
          status: filters.status,
        };

        const collected = [];
        let pageNum = 1;
        let availableCount = 0;
        // WooCommerce caps per_page at 100, so fill the working set in chunks.
        while (collected.length < loadLimit) {
          const perPage = Math.min(100, loadLimit - collected.length);
          const data = await fetchAdminOrders({ ...base, page: pageNum, perPage });
          availableCount = data.total || 0;
          collected.push(...(data.orders || []));
          if (!data.orders?.length || pageNum >= (data.totalPages || 1)) break;
          pageNum += 1;
        }

        const newest = collected[0]?.id ?? null;
        if (silent && newest && newestSeenRef.current && newest !== newestSeenRef.current) {
          const fresh = collected.findIndex((o) => o.id === newestSeenRef.current);
          const count = fresh === -1 ? 1 : fresh;
          if (count > 0) toast.success(`${count} new order${count > 1 ? "s" : ""} received`, { icon: "🛒" });
        }
        newestSeenRef.current = newest;

        setOrders(collected);
        setTotalAvailable(availableCount);
        setLastUpdated(new Date());
      } catch (err) {
        if (err instanceof AdminAuthError) handleAuthError(err);
        else setError(err.message || "Could not load orders.");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [filters.dateFrom, filters.dateTo, filters.status, loadLimit, handleAuthError]
  );

  useEffect(() => {
    if (session) loadOrders();
  }, [session, loadOrders]);

  useEffect(() => {
    if (!session || !autoRefresh) return;
    const id = setInterval(() => loadOrders({ silent: true }), REFRESH_MS);
    return () => clearInterval(id);
  }, [session, autoRefresh, loadOrders]);

  // Any change to what's shown invalidates the current page number.
  useEffect(() => { setPage(1); }, [filters, pageSize, sort]);

  const paymentMethods = useMemo(() => {
    const set = new Set(orders.map((o) => o.paymentMethodTitle || o.paymentMethod).filter(Boolean));
    return [...set].sort();
  }, [orders]);

  const filtered = useMemo(() => sortOrders(applyFilters(orders, filters), sort), [orders, filters, sort]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visible = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage, pageSize]
  );

  const selectedOrders = useMemo(
    () => filtered.filter((o) => selectedIds.has(o.id)),
    [filtered, selectedIds]
  );

  const stats = useMemo(() => {
    const revenue = filtered
      .filter((o) => !["cancelled", "failed", "refunded"].includes(o.status))
      .reduce((sum, o) => sum + Number(o.total || 0), 0);
    return {
      count: filtered.length,
      revenue,
      pending: filtered.filter((o) => ["pending", "processing", "on-hold"].includes(o.status)).length,
      unpaid: filtered.filter((o) => paymentMeta(o).key === "cod" || paymentMeta(o).key === "unpaid").length,
    };
  }, [filtered]);

  function toggleOne(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePage() {
    const allSelected = visible.every((o) => selectedIds.has(o.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      visible.forEach((o) => (allSelected ? next.delete(o.id) : next.add(o.id)));
      return next;
    });
  }

  function handleSort(key) {
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }
    );
  }

  function signOut() {
    clearAdminSession();
    setSession(null);
    setOrders([]);
    setSelectedIds(new Set());
  }

  if (!session) return <AdminLogin onSuccess={() => setSession(getAdminSession())} />;

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
          <div className="mr-auto">
            <h1 className="font-bold text-slate-900 leading-tight">Order History</h1>
            <p className="text-[11px] text-slate-500">
              {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString("en-IN")}` : "Loading…"}
              {autoRefresh && " · auto-refreshing"}
            </p>
          </div>

          <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)}
              className="accent-ayur-green" />
            Auto-refresh
          </label>

          <button onClick={() => loadOrders()} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          <button onClick={() => setExportOpen(true)} disabled={selectedOrders.length === 0}
            className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed">
            <Download size={14} />
            Export{selectedOrders.length > 0 ? ` (${selectedOrders.length})` : ""}
          </button>

          <button onClick={signOut}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-100">
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 py-4 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={Package} label="Orders shown" value={stats.count} tone="blue" />
          <StatCard icon={IndianRupee} label="Value shown" value={formatMoney(stats.revenue)} tone="green" />
          <StatCard icon={Clock} label="Awaiting dispatch" value={stats.pending} tone="amber" />
          <StatCard icon={AlertCircle} label="Payment due" value={stats.unpaid} tone="slate" />
        </div>

        <OrderFilters
          filters={filters}
          onChange={setFilters}
          open={filtersOpen}
          onToggle={() => setFiltersOpen((v) => !v)}
          paymentMethods={paymentMethods}
        />

        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <span>
            Showing <strong className="text-slate-700">{visible.length}</strong> of{" "}
            <strong className="text-slate-700">{filtered.length}</strong> filtered
            {orders.length !== filtered.length && ` (${orders.length} loaded)`}
            {totalAvailable > orders.length && ` · ${totalAvailable} exist in total`}
          </span>

          {filtered.length > 0 && (
            <button
              onClick={() => setSelectedIds(new Set(filtered.map((o) => o.id)))}
              className="text-ayur-green font-semibold hover:underline"
            >
              Select all {filtered.length} filtered
            </button>
          )}
          {selectedIds.size > 0 && (
            <button onClick={() => setSelectedIds(new Set())} className="text-slate-500 hover:text-red-600 font-medium">
              Clear selection ({selectedIds.size})
            </button>
          )}

          <label className="ml-auto flex items-center gap-1.5">
            Load
            <select value={loadLimit} onChange={(e) => setLoadLimit(Number(e.target.value))}
              className="border border-slate-200 rounded-md px-1.5 py-1 bg-white">
              {LOAD_LIMIT_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            most recent
          </label>
          <label className="flex items-center gap-1.5">
            Rows
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}
              className="border border-slate-200 rounded-md px-1.5 py-1 bg-white">
              {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {loading && orders.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-16 text-center">
            <Loader2 size={26} className="animate-spin mx-auto text-slate-300 mb-3" />
            <p className="text-sm text-slate-500">Loading orders…</p>
          </div>
        ) : (
          <OrderTable
            orders={visible}
            selectedIds={selectedIds}
            onToggle={toggleOne}
            onToggleAll={togglePage}
            onOpen={setDetailOrder}
            sort={sort}
            onSort={handleSort}
          />
        )}

        {pageCount > 1 && (
          <div className="flex items-center justify-center gap-2 pb-6">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-50">
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm text-slate-600">Page {currentPage} of {pageCount}</span>
            <button onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={currentPage === pageCount}
              className="p-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-50">
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </main>

      <OrderDetailDrawer order={detailOrder} onClose={() => setDetailOrder(null)} onAuthError={handleAuthError} />
      <ExportDialog open={exportOpen} orders={selectedOrders} onClose={() => setExportOpen(false)} />
    </div>
  );
}
