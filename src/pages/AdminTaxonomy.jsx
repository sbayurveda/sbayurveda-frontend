import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Loader2, Plus, Trash2, Save, X, Upload } from "lucide-react";
import {
  getAdminSession, clearAdminSession, AdminAuthError,
  fetchTerms, createTerm, updateTerm, deleteTerm, uploadProductImage,
} from "../api/adminApi";
import AdminLogin from "../components/admin/AdminLogin";
import AdminShell from "../components/admin/AdminShell";
import { prepareImage, looksLikeImage } from "../utils/imageForUpload";
import { useSeo } from "../utils/useSeo";

// Categories and brands, managed here rather than in wp-admin.
//
// Images use the same staging as product photos: the file is uploaded to this
// server, WooCommerce fetches it, and no WordPress login is involved.

const KINDS = [
  { key: "categories", label: "Categories", one: "category" },
  { key: "brands", label: "Brands", one: "brand" },
];

const inputCls =
  "w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ayur-green/25";

function ImageCell({ src, busy, onPick, onClear }) {
  return (
    <div className="flex items-center gap-2">
      <label className="relative cursor-pointer">
        {src ? (
          <img src={src} alt="" className="w-11 h-11 rounded-lg object-cover border border-slate-200" />
        ) : (
          <span className="w-11 h-11 rounded-lg border-2 border-dashed border-slate-300 grid place-items-center text-slate-400 hover:bg-slate-50">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          </span>
        )}
        <input
          type="file"
          accept="image/*,.heic,.heif"
          hidden
          onChange={(e) => { onPick(e.target.files?.[0]); e.target.value = ""; }}
        />
      </label>
      {src && (
        <button onClick={onClear} title="Remove image" className="text-[11px] text-slate-400 hover:text-red-600">
          Remove
        </button>
      )}
    </div>
  );
}

export default function AdminTaxonomy() {
  useSeo({ title: "Categories & brands — Admin", path: "/admin/taxonomy", noindex: true });

  const [session, setSession] = useState(getAdminSession);
  const [kind, setKind] = useState("categories");
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [edits, setEdits] = useState({});
  const [draft, setDraft] = useState({ name: "", description: "", image: null });
  const [creating, setCreating] = useState(false);

  const onAuthError = useCallback((err) => {
    clearAdminSession(); setSession(null); toast.error(err.message);
  }, []);

  const fail = useCallback((err) => {
    if (err instanceof AdminAuthError) onAuthError(err);
    else toast.error(err.message);
  }, [onAuthError]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { terms: rows } = await fetchTerms(kind);
      setTerms(rows);
      setEdits({});
    } catch (err) { fail(err); } finally { setLoading(false); }
  }, [kind, fail]);

  useEffect(() => { if (session) load(); }, [session, load]);

  // One upload path for both the new-item form and every row, so a staged
  // image behaves the same wherever it is dropped.
  async function stage(file, onDone) {
    if (!file) return;
    if (!looksLikeImage(file)) { toast.error(`${file.name} isn't an image.`); return; }
    try {
      const { file: ready } = await prepareImage(file);
      const { image } = await uploadProductImage({ file: ready, productName: draft.name || "category" });
      onDone({ src: image.src });
    } catch (err) { fail(err); }
  }

  const editOf = (t) => edits[t.id] ?? { name: t.name, description: t.description, image: t.image };
  const setEdit = (t, patch) =>
    setEdits((e) => ({ ...e, [t.id]: { ...editOf(t), ...patch } }));
  const dirty = (t) => {
    const e = edits[t.id];
    if (!e) return false;
    return e.name !== t.name || e.description !== t.description
      || (e.image?.src || null) !== (t.image?.src || null);
  };

  async function save(t) {
    const e = editOf(t);
    if (!e.name.trim()) { toast.error("It needs a name."); return; }
    setBusyId(t.id);
    try {
      const changes = { name: e.name, description: e.description };
      // null clears the image; undefined leaves it alone.
      if ((e.image?.src || null) !== (t.image?.src || null)) changes.image = e.image ?? null;
      const { term } = await updateTerm(kind, t.id, changes);
      setTerms((rows) => rows.map((r) => (r.id === t.id ? term : r)));
      setEdits((x) => { const n = { ...x }; delete n[t.id]; return n; });
      toast.success(`${term.name} saved`);
    } catch (err) { fail(err); } finally { setBusyId(null); }
  }

  async function remove(t) {
    // A term has no trash in WooCommerce, so this cannot be taken back.
    const warning = t.count
      ? `Delete "${t.name}"? ${t.count} product${t.count === 1 ? "" : "s"} will lose this label. This cannot be undone.`
      : `Delete "${t.name}"? This cannot be undone.`;
    if (!window.confirm(warning)) return;
    setBusyId(t.id);
    try {
      await deleteTerm(kind, t.id);
      setTerms((rows) => rows.filter((r) => r.id !== t.id));
      toast.success(`${t.name} deleted`);
    } catch (err) { fail(err); } finally { setBusyId(null); }
  }

  async function add() {
    if (!draft.name.trim()) { toast.error("It needs a name."); return; }
    setCreating(true);
    try {
      const { term } = await createTerm(kind, draft);
      setTerms((rows) => [...rows, term].sort((a, b) => a.name.localeCompare(b.name)));
      setDraft({ name: "", description: "", image: null });
      toast.success(`${term.name} added`);
    } catch (err) { fail(err); } finally { setCreating(false); }
  }

  if (!session) return <AdminLogin onSuccess={() => setSession(getAdminSession())} />;

  const one = KINDS.find((k) => k.key === kind).one;

  return (
    <AdminShell
      title="Categories & brands"
      subtitle="Add, rename, picture and remove the labels products are grouped by — without opening wp-admin."
      onSignOut={() => { clearAdminSession(); setSession(null); }}
    >
      <div className="flex gap-1 mb-4">
        {KINDS.map((k) => (
          <button
            key={k.key}
            onClick={() => setKind(k.key)}
            className={`px-3 py-1.5 rounded-lg text-[12.5px] font-medium border transition-colors ${
              kind === k.key
                ? "bg-ayur-green text-white border-ayur-green"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {k.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-3.5 mb-4">
        <h2 className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2.5">
          Add a {one}
        </h2>
        <div className="flex flex-wrap items-end gap-2">
          <ImageCell
            src={draft.image?.src}
            onPick={(f) => stage(f, (image) => setDraft((d) => ({ ...d, image })))}
            onClear={() => setDraft((d) => ({ ...d, image: null }))}
          />
          <label className="flex-1 min-w-[180px]">
            <span className="block text-[11px] font-semibold text-slate-500 mb-1">Name</span>
            <input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder={`e.g. ${kind === "brands" ? "Dabur" : "Immunity"}`} className={inputCls} />
          </label>
          <label className="flex-[2] min-w-[200px]">
            <span className="block text-[11px] font-semibold text-slate-500 mb-1">Description</span>
            <input value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              placeholder="Optional" className={inputCls} />
          </label>
          <button onClick={add} disabled={creating}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12.5px] font-semibold bg-ayur-green text-white hover:opacity-90 disabled:opacity-50">
            {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <p className="flex items-center justify-center gap-2 py-12 text-sm text-slate-400">
            <Loader2 size={15} className="animate-spin" /> Loading…
          </p>
        ) : terms.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-400">No {kind} yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {terms.map((t) => {
              const e = editOf(t);
              return (
                <li key={t.id} className="flex flex-wrap items-center gap-2.5 px-3.5 py-2.5">
                  <ImageCell
                    src={e.image?.src}
                    onPick={(f) => stage(f, (image) => setEdit(t, { image }))}
                    onClear={() => setEdit(t, { image: null })}
                  />
                  <input
                    value={e.name}
                    onChange={(ev) => setEdit(t, { name: ev.target.value })}
                    className={`${inputCls} flex-1 min-w-[150px]`}
                  />
                  <input
                    value={e.description}
                    onChange={(ev) => setEdit(t, { description: ev.target.value })}
                    placeholder="Description"
                    className={`${inputCls} flex-[2] min-w-[180px]`}
                  />
                  <span className="text-[11px] text-slate-400 tabular-nums w-20 text-right">
                    {t.count} product{t.count === 1 ? "" : "s"}
                  </span>
                  {dirty(t) && (
                    <>
                      <button onClick={() => save(t)} disabled={busyId === t.id}
                        className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11.5px] font-semibold bg-ayur-green text-white hover:opacity-90 disabled:opacity-50">
                        {busyId === t.id ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save
                      </button>
                      <button onClick={() => setEdits((x) => { const n = { ...x }; delete n[t.id]; return n; })}
                        title="Discard changes" className="p-1.5 text-slate-400 hover:text-slate-700">
                        <X size={13} />
                      </button>
                    </>
                  )}
                  <button onClick={() => remove(t)} disabled={busyId === t.id}
                    title={`Delete ${t.name}`}
                    className="p-1.5 text-slate-300 hover:text-red-600 disabled:opacity-50">
                    <Trash2 size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AdminShell>
  );
}
