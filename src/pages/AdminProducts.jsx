import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, ImageOff, FileText, IndianRupee, RefreshCw, ShieldOff, ShieldCheck, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import {
  getAdminSession, clearAdminSession, isAdminApiConfigured, AdminAuthError,
  fetchProductCapabilities, fetchProductTaxonomy, fetchCatalogue, setProductsCod, setProductsHsn, setProductsStock, deleteProducts,
} from "../api/adminApi";
import AdminLogin from "../components/admin/AdminLogin";
import AdminShell from "../components/admin/AdminShell";
import ProductForm from "../components/admin/ProductForm";
import CatalogueTransfer from "../components/admin/CatalogueTransfer";
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
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [cod, setCod] = useState("any");
  const [matchingIds, setMatchingIds] = useState([]);
  const [stock, setStock] = useState("any");
  const [selected, setSelected] = useState(new Set());
  const [deleting, setDeleting] = useState(false);
  const [bulkQty, setBulkQty] = useState("");
  const [withoutHsn, setWithoutHsn] = useState(0);
  const [hsnIds, setHsnIds] = useState([]);
  const [applying, setApplying] = useState(false);
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
      const d = await fetchCatalogue({ q, need, cod, stock, minPrice, maxPrice, page, perPage: 25 });
      if (mine !== requestId.current) return;
      setIncomplete(d.products || []);
      setScanned(d.total || 0);
      setCounts(d.counts || null);
      setMatchingIds(d.matchingIds || []);
      setWithoutHsn(d.withoutHsn || 0);
      setHsnIds(d.hsnMissingIds || []);
    } catch (err) {
      if (mine !== requestId.current) return;
      if (err instanceof AdminAuthError) handleAuthError(err);
      else toast.error(err.message);
    } finally {
      if (mine === requestId.current) setLoading(false);
    }
  }, [page, need, q, cod, stock, minPrice, maxPrice, handleAuthError]);

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

  // Deleting sends a product to the WooCommerce trash, where it can be
  // restored from wp-admin. Past orders keep their own copy of the name, SKU
  // and price, so invoices and the GST return are unaffected.
  async function removeProducts(targets) {
    if (!targets.length || deleting) return;
    const what = targets.length === 1
      ? `Delete "${targets[0].name}"?`
      : `Delete these ${targets.length} products?`;
    if (!window.confirm(`${what}\n\nThey go to the WooCommerce trash and can be restored from wp-admin. Past orders and invoices are not affected.`)) return;

    setDeleting(true);
    try {
      const { deleted, failed } = await deleteProducts(targets.map((p) => p.id));
      const ids = new Set(targets.map((p) => p.id));
      setIncomplete((prev) => prev.filter((p) => !ids.has(p.id) || failed.some((f) => f.id === p.id)));
      setSelected(new Set());
      if (failed?.length) toast.error(`Deleted ${deleted}; ${failed.length} could not be deleted.`);
      else toast.success(`${deleted} product${deleted === 1 ? "" : "s"} deleted`);
      loadIncomplete();
    } catch (err) {
      if (err instanceof AdminAuthError) handleAuthError(err);
      else toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  }

  // "Everything from this supplier is out of stock" is the instruction someone
  // actually has after a phone call, and it applies to the whole filtered set
  // rather than to the page on screen.
  async function applyStock(mode) {
    if (!matchingIds.length || applying) return;
    if (mode === "tracked" && bulkQty === "") {
      toast.error("Enter the quantity to set first.");
      return;
    }
    setApplying(true);
    try {
      const { updated } = await setProductsStock(matchingIds, mode, bulkQty === "" ? 0 : Number(bulkQty));
      const said = mode === "out" ? "marked out of stock"
        : mode === "unlimited" ? "set to unlimited stock"
        : `set to ${Number(bulkQty)} in stock`;
      toast.success(`${updated} product${updated === 1 ? "" : "s"} ${said}`);
      loadIncomplete();
    } catch (err) {
      if (err instanceof AdminAuthError) handleAuthError(err);
      else toast.error(err.message);
    } finally {
      setApplying(false);
    }
  }

  // The tax report treats a blank code as 3004 and always has, so this changes
  // no figure — it writes down what the return already assumes, so a product
  // opened in wp-admin shows the same code the filing used.
  async function stampHsn() {
    if (!hsnIds.length || applying) return;
    setApplying(true);
    try {
      const { updated } = await setProductsHsn(hsnIds, "3004");
      toast.success(`HSN 3004 set on ${updated} product${updated === 1 ? "" : "s"}`);
      loadIncomplete();
    } catch (err) {
      if (err instanceof AdminAuthError) handleAuthError(err);
      else toast.error(err.message);
    } finally {
      setApplying(false);
    }
  }

  // Applies to everything behind the current filter, not just the page on
  // screen — "every product over ₹2,000" is the rule someone wants to set, and
  // paging through 340 of them to tick boxes is not a feature.
  async function applyCod(codDisabled) {
    if (!matchingIds.length || applying) return;
    setApplying(true);
    try {
      const { updated } = await setProductsCod(matchingIds, codDisabled);
      toast.success(`Cash on delivery ${codDisabled ? "switched off" : "allowed"} on ${updated} product${updated === 1 ? "" : "s"}`);
      loadIncomplete();
    } catch (err) {
      if (err instanceof AdminAuthError) handleAuthError(err);
      else toast.error(err.message);
    } finally {
      setApplying(false);
    }
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
            <div className="flex flex-wrap items-center gap-2 mt-2.5">
              <span className="flex items-center gap-1.5 text-[11.5px] text-slate-500">
                ₹
                <input value={minPrice} onChange={(e) => { setMinPrice(e.target.value); setPage(1); }}
                  placeholder="min" inputMode="numeric"
                  className="w-20 border border-slate-200 rounded-lg px-2 py-1 text-[12px] tabular-nums focus:outline-none focus:ring-2 focus:ring-ayur-green/25" />
                to
                <input value={maxPrice} onChange={(e) => { setMaxPrice(e.target.value); setPage(1); }}
                  placeholder="max" inputMode="numeric"
                  className="w-20 border border-slate-200 rounded-lg px-2 py-1 text-[12px] tabular-nums focus:outline-none focus:ring-2 focus:ring-ayur-green/25" />
              </span>

              <span className="flex gap-1">
                {[["any", "Any COD"], ["on", "COD on"], ["off", "COD off"]].map(([k, label]) => (
                  <button key={k} onClick={() => { setCod(k); setPage(1); }}
                    className={`px-2.5 py-1 rounded-lg text-[11.5px] font-medium border transition-colors ${
                      cod === k ? "bg-ayur-green text-white border-ayur-green" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}>{label}</button>
                ))}
              </span>

              <span className="flex gap-1">
                {[["any", "Any stock"], ["unlimited", "Unlimited"], ["tracked", "Tracked"], ["out", "Out of stock"]].map(([k, label]) => (
                  <button key={k} onClick={() => { setStock(k); setPage(1); }}
                    className={`px-2.5 py-1 rounded-lg text-[11.5px] font-medium border transition-colors ${
                      stock === k ? "bg-ayur-green text-white border-ayur-green" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}>{label}</button>
                ))}
              </span>

              {(minPrice || maxPrice || cod !== "any" || stock !== "any" || q) && (
                <button onClick={() => { setMinPrice(""); setMaxPrice(""); setCod("any"); setStock("any"); setQ(""); setPage(1); }}
                  className="text-[11.5px] text-slate-500 underline hover:text-slate-800">Clear</button>
              )}
            </div>

            <div className="px-3.5 py-2.5 border-b border-slate-100">
              <CatalogueTransfer onAuthError={handleAuthError} onImported={loadIncomplete} />
            </div>

            {withoutHsn > 0 && (
              <div className="flex flex-wrap items-center gap-2 px-3.5 py-2 border-b border-slate-100 bg-amber-50/60">
                <span className="text-[11.5px] text-slate-600">
                  <b className="tabular-nums">{withoutHsn}</b> product{withoutHsn === 1 ? " has" : "s have"} no HSN code.
                  The tax report already treats {withoutHsn === 1 ? "it" : "them"} as 3004.
                </span>
                <button
                  onClick={stampHsn}
                  disabled={applying || !hsnIds.length}
                  className="px-2.5 py-1 rounded-lg text-[11.5px] font-semibold border bg-white text-slate-700 border-slate-300 hover:bg-slate-50 disabled:opacity-50"
                >
                  {applying ? "Setting…" : `Set HSN 3004 on ${hsnIds.length}`}
                </button>
              </div>
            )}

            {matchingIds.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mt-2.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2">
                <span className="text-[11.5px] text-slate-600">
                  Apply to all <b className="tabular-nums">{matchingIds.length}</b> matching:
                </span>
                <button onClick={() => applyCod(true)} disabled={applying}
                  className="px-2.5 py-1 rounded-lg border border-red-300 bg-white text-[11.5px] font-semibold text-red-700 hover:bg-red-50 disabled:opacity-40 inline-flex items-center gap-1.5">
                  {applying ? <Loader2 size={11} className="animate-spin" /> : <ShieldOff size={11} />}
                  Switch COD off
                </button>
                <button onClick={() => applyCod(false)} disabled={applying}
                  className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-[11.5px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 inline-flex items-center gap-1.5">
                  {applying ? <Loader2 size={11} className="animate-spin" /> : <ShieldCheck size={11} />}
                  Allow COD
                </button>

                <span className="w-px h-5 bg-slate-200" />

                <button onClick={() => applyStock("out")} disabled={applying}
                  className="px-2.5 py-1 rounded-lg text-[11.5px] font-semibold border bg-white text-slate-700 border-slate-300 hover:bg-slate-50 disabled:opacity-50">
                  Mark out of stock
                </button>
                <button onClick={() => applyStock("unlimited")} disabled={applying}
                  className="px-2.5 py-1 rounded-lg text-[11.5px] font-semibold border bg-white text-slate-700 border-slate-300 hover:bg-slate-50 disabled:opacity-50">
                  Unlimited stock
                </button>
                <span className="inline-flex items-center gap-1">
                  <input value={bulkQty} onChange={(e) => setBulkQty(e.target.value)}
                    placeholder="qty" inputMode="numeric"
                    className="w-14 border border-slate-200 rounded-lg px-1.5 py-1 text-[11.5px] tabular-nums focus:outline-none focus:ring-2 focus:ring-ayur-green/25" />
                  <button onClick={() => applyStock("tracked")} disabled={applying}
                    className="px-2.5 py-1 rounded-lg text-[11.5px] font-semibold border bg-white text-slate-700 border-slate-300 hover:bg-slate-50 disabled:opacity-50">
                    Set qty
                  </button>
                </span>
              </div>
            )}

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
            <>
            {selected.size > 0 && (
              <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-slate-100 bg-red-50/60">
                <span className="text-[11.5px] text-slate-700">
                  <b className="tabular-nums">{selected.size}</b> selected
                </span>
                <button
                  onClick={() => removeProducts(incomplete.filter((p) => selected.has(p.id)))}
                  disabled={deleting}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11.5px] font-semibold border bg-white text-red-700 border-red-300 hover:bg-red-50 disabled:opacity-50"
                >
                  {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  Delete selected
                </button>
                <button onClick={() => setSelected(new Set())}
                  className="text-[11.5px] text-slate-500 underline hover:text-slate-800">
                  Clear
                </button>
              </div>
            )}

            <ul className="divide-y divide-slate-100">
              {incomplete.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => setSelected((prev) => {
                      const next = new Set(prev);
                      if (next.has(p.id)) next.delete(p.id); else next.add(p.id);
                      return next;
                    })}
                    aria-label={`Select ${p.name}`}
                    className="accent-ayur-green cursor-pointer shrink-0"
                  />
                  {p.images[0]
                    ? <img src={p.images[0].src} alt="" className="w-10 h-10 object-cover rounded border border-slate-200" />
                    : <span className="w-10 h-10 rounded border border-dashed border-slate-300 grid place-items-center text-slate-300">
                        <ImageOff size={14} />
                      </span>}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-800 truncate">{p.name}</p>
                    <p className="text-[11px] flex flex-wrap items-center gap-x-2">
                      {p.missing.length
                        ? <span className="text-red-600">missing {p.missing.join(", ")}</span>
                        : <span className="text-green-700">live</span>}
                      <span className="text-slate-400 tabular-nums">₹{p.salePrice || p.price || p.regularPrice}</span>
                      {p.codDisabled && <span className="text-amber-700 font-semibold">COD off</span>}
                    </p>
                  </div>
                  <button onClick={() => setEditing(p)}
                          className="text-xs font-semibold text-ayur-green hover:underline shrink-0">
                    Fix
                  </button>
                  <button onClick={() => removeProducts([p])}
                          disabled={deleting}
                          title={`Delete ${p.name}`}
                          className="shrink-0 p-1.5 text-slate-300 hover:text-red-600 disabled:opacity-40">
                    <Trash2 size={15} />
                  </button>
                </li>
              ))}
            </ul>
            </>
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
