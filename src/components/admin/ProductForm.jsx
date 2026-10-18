import { useEffect, useMemo, useState } from "react";
import { Loader2, Save, AlertTriangle, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";
import { createProduct, updateProduct, AdminAuthError } from "../../api/adminApi";
import ProductImageDrop from "./ProductImageDrop";

const inputCls =
  "w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ayur-green/25";

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold text-slate-500 mb-1">{label}</span>
      {children}
      {hint && <span className="block text-[10px] text-slate-400 mt-1">{hint}</span>}
    </label>
  );
}

const EMPTY = {
  // 3004 is ayurvedic medicaments at 5%, which is what 506 of the 507 lines in
  // the reference month carried. Prefilling it means a new product arrives with
  // the code already written rather than leaning on the report's fallback.
  name: "", mrp: "", price: "", sku: "", stockQty: "", hsn: "3004", codDisabled: false,
  description: "", shortDescription: "", categoryIds: [], brandIds: [], images: [],
};

// What the storefront needs before it will show a product at all. Kept in step
// with mapWooProduct, which drops anything lacking these — a product saved
// without them is saved, but invisible, and saying so here is the difference
// between "done" and a silent hole in the catalogue.
function blockingIssues(form) {
  const issues = [];
  if (!form.name.trim()) issues.push("a name");
  if (!Number(form.mrp) && !Number(form.price)) issues.push("a price");
  if (!form.images.length) issues.push("at least one image");
  if (!form.description.trim() && !form.shortDescription.trim()) issues.push("a description");
  return issues;
}

export default function ProductForm({ product, taxonomy, canUpload, onSaved, onAuthError, onCancel }) {
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!product) { setForm(EMPTY); return; }
    setForm({
      name: product.name || "",
      mrp: product.regularPrice ? String(product.regularPrice) : "",
      price: product.salePrice ? String(product.salePrice) : "",
      sku: product.sku || "",
      stockQty: product.stockQty != null ? String(product.stockQty) : "",
      hsn: product.hsn || "",
      codDisabled: Boolean(product.codDisabled),
      description: product.description || "",
      shortDescription: product.shortDescription || "",
      categoryIds: (product.categories || []).map((c) => c.id),
      brandIds: (product.brands || []).map((b) => b.id),
      images: product.images || [],
    });
  }, [product]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setImages = (updater) =>
    setForm((f) => ({ ...f, images: typeof updater === "function" ? updater(f.images) : updater }));

  const issues = useMemo(() => blockingIssues(form), [form]);
  const isEdit = Boolean(product?.id);

  async function save() {
    if (busy) return;
    setBusy(true);
    try {
      const payload = {
        name: form.name.trim(),
        mrp: form.mrp === "" ? undefined : Number(form.mrp),
        price: form.price === "" ? undefined : Number(form.price),
        sku: form.sku.trim() || undefined,
        stockQty: form.stockQty === "" ? undefined : Number(form.stockQty),
        hsn: form.hsn.trim(),
        codDisabled: form.codDisabled,
        description: form.description,
        shortDescription: form.shortDescription,
        categoryIds: form.categoryIds,
        brandIds: form.brandIds,
        // Only a library image has an attachment id, and it is an integer.
        // A freshly staged upload is identified by a filename, and treating
        // that as an id sent {id: "mv…-photo.jpg"} with no src at all — the
        // request WooCommerce refused with "images[0][id] is not of type
        // integer", which is why uploading a new photo never worked.
        images: form.images.map((i) =>
          Number.isInteger(Number(i.id)) && Number(i.id) > 0
            ? { id: Number(i.id) }
            : { src: i.src },
        ),
      };
      const { product: saved } = isEdit
        ? await updateProduct(product.id, payload)
        : await createProduct(payload);

      onSaved(saved);
      if (saved.warning) { toast.error(saved.warning, { duration: 6000 }); return; }
      toast.success(
        saved.missing.length
          ? `Saved — but still hidden from the shop (needs ${saved.missing.join(", ")})`
          : `${saved.name} is live`,
      );
      if (!isEdit) setForm(EMPTY);
    } catch (err) {
      if (err instanceof AdminAuthError) onAuthError(err);
      else toast.error(err.message || "Couldn't save the product.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-sm text-slate-800">
          {isEdit ? `Edit — ${product.name}` : "Add a product"}
        </h2>
        {isEdit && (
          <div className="flex items-center gap-2">
            {product.permalink && (
              <a href={product.permalink} target="_blank" rel="noreferrer"
                 className="text-[11px] text-slate-500 hover:text-ayur-green inline-flex items-center gap-1">
                View <ExternalLink size={11} />
              </a>
            )}
            <button onClick={onCancel} className="text-[11px] text-slate-500 hover:text-slate-800">
              Close
            </button>
          </div>
        )}
      </div>

      <Field label="Product name">
        <input value={form.name} onChange={set("name")} className={inputCls}
               placeholder="e.g. Ashwagandha Churna (100g)" autoFocus={!isEdit} />
      </Field>

      <div className="grid grid-cols-2 gap-2.5">
        <Field label="MRP (₹)" hint="The struck-through price">
          <input value={form.mrp} onChange={set("mrp")} inputMode="decimal" className={inputCls} placeholder="900" />
        </Field>
        <Field label="Selling price (₹)" hint="Leave blank to sell at MRP">
          <input value={form.price} onChange={set("price")} inputMode="decimal" className={inputCls} placeholder="715" />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <Field label="Brand">
          <select
            value={form.brandIds[0] || ""}
            onChange={(e) => setForm((f) => ({ ...f, brandIds: e.target.value ? [Number(e.target.value)] : [] }))}
            className={inputCls}
          >
            <option value="">— none —</option>
            {taxonomy.brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </Field>
        <Field label="Category">
          <select
            value={form.categoryIds[0] || ""}
            onChange={(e) => setForm((f) => ({ ...f, categoryIds: e.target.value ? [Number(e.target.value)] : [] }))}
            className={inputCls}
          >
            <option value="">— none —</option>
            {taxonomy.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
      </div>

      <div className="flex items-center gap-3 border border-slate-200 rounded-lg px-3 py-2.5 bg-white">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-700">Cash on Delivery</p>
          <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
            {form.codDisabled
              ? "Off — this product can only be bought by paying online, and any cart holding it loses the option."
              : "On — customers can pay for this product on delivery."}
          </p>
        </div>
        <button
          type="button" role="switch" aria-checked={!form.codDisabled} aria-label="Cash on Delivery for this product"
          onClick={() => setForm((f) => ({ ...f, codDisabled: !f.codDisabled }))}
          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
            form.codDisabled ? "bg-slate-300" : "bg-ayur-green"
          }`}
        >
          <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
            form.codDisabled ? "translate-x-0.5" : "translate-x-[18px]"}`} />
        </button>
      </div>

      <Field label="HSN code" hint="Blank is treated as 3004 — ayurvedic medicaments, 5%. This sets the GST rate in the tax report.">
        <input value={form.hsn} onChange={set("hsn")} className={inputCls} placeholder="3004" />
      </Field>

      <div className="grid grid-cols-2 gap-2.5">
        <Field label="SKU" hint="Optional">
          <input value={form.sku} onChange={set("sku")} className={inputCls} />
        </Field>
        <Field label="Stock quantity" hint="Blank means don't track stock">
          <input value={form.stockQty} onChange={set("stockQty")} inputMode="numeric" className={inputCls} />
        </Field>
      </div>

      <Field label="Images">
        <ProductImageDrop
          images={form.images}
          onChange={setImages}
          productName={form.name}
          canUpload={canUpload}
          onAuthError={onAuthError}
        />
      </Field>

      <Field label="Description" hint="Shown on the product page. Plain text is fine.">
        <textarea value={form.description} onChange={set("description")} rows={5}
                  className={`${inputCls} resize-y`}
                  placeholder="What it is, what it helps with, how to take it." />
      </Field>

      {issues.length > 0 && (
        <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-800 leading-relaxed">
            The shop won't show this product until it has {issues.join(", ")}. You can still save it —
            it just won't be buyable yet.
          </p>
        </div>
      )}

      <button
        onClick={save}
        disabled={busy || !form.name.trim()}
        className="btn-primary w-full py-2 text-sm flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
        {isEdit ? "Save changes" : "Add product"}
      </button>
    </div>
  );
}
