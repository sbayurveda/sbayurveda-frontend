import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, PackagePlus, ArrowLeft, ImageOff, FileText, IndianRupee, RefreshCw } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import {
  getAdminSession, clearAdminSession, isAdminApiConfigured, AdminAuthError,
  fetchProductCapabilities, fetchProductTaxonomy, fetchIncompleteProducts,
} from "../api/adminApi";
import AdminLogin from "../components/admin/AdminLogin";
import ProductForm from "../components/admin/ProductForm";
import { useSeo } from "../utils/useSeo";

const NEEDS = [
  { key: "any", label: "Anything missing", icon: RefreshCw },
  { key: "image", label: "No image", icon: ImageOff },
  { key: "description", label: "No description", icon: FileText },
  { key: "price", label: "No price", icon: IndianRupee },
];

export default function AdminProducts() {
  useSeo({ title: "Products — Admin", path: "/admin/products", noindex: true });

  const [session, setSession] = useState(getAdminSession);
  const [taxonomy, setTaxonomy] = useState({ categories: [], brands: [] });
  const [canUpload, setCanUpload] = useState(false);
  const [editing, setEditing] = useState(null);
  const [need, setNeed] = useState("any");
  const [incomplete, setIncomplete] = useState([]);
  const [scanned, setScanned] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleAuthError = useCallback((err) => {
    clearAdminSession();
    setSession(null);
    toast.error(err.message);
  }, []);

  useEffect(() => {
    if (!session) return;
    fetchProductTaxonomy()
      .then((d) => setTaxonomy({ categories: d.categories || [], brands: d.brands || [] }))
      .catch((err) => { if (err instanceof AdminAuthError) handleAuthError(err); });
    fetchProductCapabilities()
      .then((d) => setCanUpload(Boolean(d.imageUpload)))
      .catch(() => {});
  }, [session, handleAuthError]);

  const loadIncomplete = useCallback(async () => {
    setLoading(true);
    try {
      const d = await fetchIncompleteProducts({ page, perPage: 20, need });
      setIncomplete(d.products || []);
      setScanned(d.scanned || 0);
    } catch (err) {
      if (err instanceof AdminAuthError) handleAuthError(err);
      else toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, need, handleAuthError]);

  useEffect(() => { if (session) loadIncomplete(); }, [session, loadIncomplete]);

  function handleSaved(saved) {
    // A repaired product leaves the queue; one still missing something stays,
    // with its remaining gaps updated.
    setIncomplete((prev) =>
      saved.missing.length
        ? prev.map((p) => (p.id === saved.id ? saved : p))
        : prev.filter((p) => p.id !== saved.id),
    );
    if (editing?.id === saved.id) setEditing(saved.missing.length ? saved : null);
  }

  if (!isAdminApiConfigured()) {
    return <div className="p-8 text-center text-slate-500">Admin API isn't configured.</div>;
  }
  if (!session) return <AdminLogin onSuccess={() => setSession(getAdminSession())} />;

  return (
    <div className="min-h-screen bg-slate-100">
      <Toaster position="top-right" />
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center gap-3">
          <PackagePlus size={18} className="text-ayur-green" />
          <h1 className="font-bold text-slate-900">Products</h1>
          <Link to="/admin/orders"
                className="ml-auto text-xs text-slate-500 hover:text-ayur-green inline-flex items-center gap-1">
            <ArrowLeft size={13} /> Orders
          </Link>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 py-4 grid lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] gap-4 items-start">
        <ProductForm
          key={editing?.id || "new"}
          product={editing}
          taxonomy={taxonomy}
          canUpload={canUpload}
          onSaved={handleSaved}
          onAuthError={handleAuthError}
          onCancel={() => setEditing(null)}
        />

        <section className="bg-white border border-slate-200 rounded-xl">
          <div className="px-4 py-3 border-b border-slate-100">
            <h2 className="font-bold text-sm text-slate-800">Products the shop is hiding</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Published, but missing something the storefront requires — so customers can't buy them.
              Fix one and it appears in the shop within 10 minutes.
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {NEEDS.map((n) => (
                <button
                  key={n.key}
                  onClick={() => { setNeed(n.key); setPage(1); }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                    need === n.key
                      ? "bg-ayur-green text-white border-ayur-green"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {n.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <p className="px-4 py-8 text-center text-sm text-slate-400">
              <Loader2 size={15} className="animate-spin inline mr-1.5" /> Checking products…
            </p>
          ) : incomplete.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-400">
              Nothing missing in the {scanned} products on this page.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {incomplete.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                  {p.images[0]
                    ? <img src={p.images[0].src} alt="" className="w-10 h-10 object-cover rounded border border-slate-200" />
                    : <span className="w-10 h-10 rounded border border-dashed border-slate-300 grid place-items-center text-slate-300">
                        <ImageOff size={14} />
                      </span>}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-800 truncate">{p.name}</p>
                    <p className="text-[11px] text-red-600">missing {p.missing.join(", ")}</p>
                  </div>
                  <button onClick={() => setEditing(p)}
                          className="text-xs font-semibold text-ayur-green hover:underline shrink-0">
                    Fix
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 text-xs text-slate-500">
            <span>Page {page} · scanned {scanned}</span>
            <span className="flex gap-2">
              <button disabled={page === 1 || loading} onClick={() => setPage((p) => p - 1)}
                      className="px-2 py-1 rounded border border-slate-200 disabled:opacity-40">Back</button>
              <button disabled={loading || scanned === 0} onClick={() => setPage((p) => p + 1)}
                      className="px-2 py-1 rounded border border-slate-200 disabled:opacity-40">Next</button>
            </span>
          </div>
        </section>
      </main>
    </div>
  );
}
