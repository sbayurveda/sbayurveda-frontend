import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, ImageOff, FileText, IndianRupee, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import {
  getAdminSession, clearAdminSession, isAdminApiConfigured, AdminAuthError,
  fetchProductCapabilities, fetchProductTaxonomy, fetchCatalogue,
} from "../api/adminApi";
import AdminLogin from "../components/admin/AdminLogin";
import AdminShell from "../components/admin/AdminShell";
import ProductForm from "../components/admin/ProductForm";
import { useSeo } from "../utils/useSeo";

const NEEDS = [
  { key: "", label: "All products", icon: RefreshCw },
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
  const [need, setNeed] = useState("");
  const [incomplete, setIncomplete] = useState([]);
  const [scanned, setScanned] = useState(0);
  const [counts, setCounts] = useState(null);
  const [q, setQ] = useState("");
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

  // Searching and switching tabs both fire requests that can return out of
  // order, which would leave the list showing one tab's results under
  // another tab's heading.
  const requestId = useRef(0);

  const loadIncomplete = useCallback(async () => {
    const mine = ++requestId.current;
    setLoading(true);
    try {
      const d = await fetchCatalogue({ q, need, page, perPage: 25 });
      if (mine !== requestId.current) return;
      setIncomplete(d.products || []);
      setScanned(d.total || 0);
      setCounts(d.counts || null);
    } catch (err) {
      if (mine !== requestId.current) return;
      if (err instanceof AdminAuthError) handleAuthError(err);
      else toast.error(err.message);
    } finally {
      if (mine === requestId.current) setLoading(false);
    }
  }, [page, need, q, handleAuthError]);

  useEffect(() => { if (session) loadIncomplete(); }, [session, loadIncomplete]);

  function handleSaved(saved) {
    // A repaired product leaves the queue; one still missing something stays,
    // with its remaining gaps updated.
    setIncomplete((prev) =>
      saved.missing.length || need === ""
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
    <AdminShell
      title="Products"
      subtitle={counts
        ? `All ${counts.all} products, searchable. ${counts.missingImage} hidden for no image, ${counts.missingDescription} for no description.`
        : "Add a product here and it is in WooCommerce immediately, on the storefront within ten minutes."}
      onSignOut={() => { clearAdminSession(); setSession(null); }}
    >
      <div className="grid lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] gap-4 items-start">
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
            <h2 className="font-bold text-sm text-slate-800">
              {need === "" ? "Catalogue" : "Products the shop is hiding"}
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {need === ""
                ? "Every product in the shop. Click Fix on any of them to edit it here."
                : "Published, but missing something the storefront requires — so customers can't buy them. Fix one and it appears in the shop within 10 minutes."}
            </p>
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              placeholder="Search all products by name, SKU or brand…"
              className="w-full mt-2.5 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ayur-green/25"
            />
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
              {q ? `No product matches "${q}".` : need === "" ? "No products yet." : "Nothing missing here."}
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
                    {p.missing.length
                      ? <p className="text-[11px] text-red-600">missing {p.missing.join(", ")}</p>
                      : <p className="text-[11px] text-green-700">live · {p.sku || "no SKU"}</p>}
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
            <span className="tabular-nums">{scanned} matching · page {page} of {Math.max(1, Math.ceil(scanned / 25))}</span>
            <span className="flex gap-2">
              <button disabled={page === 1 || loading} onClick={() => setPage((p) => p - 1)}
                      className="px-2 py-1 rounded border border-slate-200 disabled:opacity-40">Back</button>
              <button disabled={loading || page * 25 >= scanned} onClick={() => setPage((p) => p + 1)}
                      className="px-2 py-1 rounded border border-slate-200 disabled:opacity-40">Next</button>
            </span>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
