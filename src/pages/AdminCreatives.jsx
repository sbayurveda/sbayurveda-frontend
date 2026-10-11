import { useCallback, useEffect, useState } from "react";
import { Loader2, Save, Trash2, Upload, ChevronUp, ChevronDown } from "lucide-react";
import toast from "react-hot-toast";
import {
  getAdminSession, clearAdminSession, isAdminApiConfigured, AdminAuthError,
  fetchBanners, saveBanners, uploadProductImage, fetchProductCapabilities,
} from "../api/adminApi";
import AdminLogin from "../components/admin/AdminLogin";
import AdminShell from "../components/admin/AdminShell";
import { useSeo } from "../utils/useSeo";

const LINKS = [
  { to: "/", label: "Homepage" },
  { to: "/offers", label: "Today's offers" },
  { to: "/policy/2x-guarantee", label: "2X refund guarantee" },
  { to: "/category/immunity", label: "Immunity" },
  { to: "/category/mens-health", label: "Men's wellness" },
  { to: "/category/digestive", label: "Digestive health" },
];

export default function AdminCreatives() {
  useSeo({ title: "Creatives — Admin", path: "/admin/creatives", noindex: true });

  const [session, setSession] = useState(getAdminSession);
  const [banners, setBanners] = useState([]);
  const [saved, setSaved] = useState("[]");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [canUpload, setCanUpload] = useState(true);

  const onAuthError = useCallback((err) => {
    clearAdminSession(); setSession(null); toast.error(err.message);
  }, []);

  useEffect(() => {
    if (!session) return;
    fetchBanners()
      .then((d) => { setBanners(d.banners || []); setSaved(JSON.stringify(d.banners || [])); })
      .catch((err) => { if (err instanceof AdminAuthError) onAuthError(err); else toast.error(err.message); })
      .finally(() => setLoading(false));
    fetchProductCapabilities().then((d) => setCanUpload(Boolean(d.imageUpload))).catch(() => {});
  }, [session, onAuthError]);

  const dirty = JSON.stringify(banners) !== saved;

  async function accept(fileList) {
    const files = [...fileList].filter((f) => f.type.startsWith("image/"));
    if (!files.length) return;
    setUploading((n) => n + files.length);
    for (const file of files) {
      try {
        const { image } = await uploadProductImage({ file, productName: "banner", altText: "" });
        setBanners((prev) => [...prev, { id: `b${Date.now()}`, src: image.src, alt: "", to: "/offers", active: true }]);
      } catch (err) {
        if (err instanceof AdminAuthError) onAuthError(err);
        else toast.error(`${file.name}: ${err.message}`);
      } finally {
        setUploading((n) => n - 1);
      }
    }
  }

  const edit = (i, patch) => setBanners((prev) => prev.map((b, j) => (j === i ? { ...b, ...patch } : b)));
  const remove = (i) => setBanners((prev) => prev.filter((_, j) => j !== i));
  const move = (i, by) => setBanners((prev) => {
    const next = [...prev];
    const j = i + by;
    if (j < 0 || j >= next.length) return prev;
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });

  async function save() {
    setBusy(true);
    try {
      const { banners: stored } = await saveBanners(banners);
      setBanners(stored); setSaved(JSON.stringify(stored));
      toast.success("Homepage updated");
    } catch (err) {
      if (err instanceof AdminAuthError) onAuthError(err);
      else toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!isAdminApiConfigured()) return <div className="p-8 text-center text-slate-500">Admin API isn't configured.</div>;
  if (!session) return <AdminLogin onSuccess={() => setSession(getAdminSession())} />;

  return (
    <AdminShell
      title="Creatives"
      subtitle="The homepage carousel. Drop an image in, set where it goes, save — the storefront picks it up within two minutes. No deploy."
      onSignOut={() => { clearAdminSession(); setSession(null); }}
      actions={
        <button onClick={save} disabled={!dirty || busy}
          className="btn-primary px-3 py-1.5 text-sm flex items-center gap-1.5 disabled:opacity-40">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {dirty ? "Save changes" : "Saved"}
        </button>
      }
    >
      {loading ? (
        <p className="text-sm text-slate-400 py-8 text-center">
          <Loader2 size={15} className="animate-spin inline mr-1.5" /> Loading banners…
        </p>
      ) : (
        <div className="space-y-2.5 max-w-3xl">
          {banners.map((b, i) => (
            <div key={b.id} className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap sm:flex-nowrap gap-3">
              <div className="flex flex-col gap-0.5 shrink-0 pt-1">
                <button onClick={() => move(i, -1)} disabled={i === 0} title="Move up"
                  className="p-0.5 text-slate-400 hover:text-slate-800 disabled:opacity-25"><ChevronUp size={15} /></button>
                <button onClick={() => move(i, 1)} disabled={i === banners.length - 1} title="Move down"
                  className="p-0.5 text-slate-400 hover:text-slate-800 disabled:opacity-25"><ChevronDown size={15} /></button>
              </div>

              <img src={b.src} alt="" className="w-28 h-14 object-cover rounded-lg border border-slate-200 shrink-0 bg-slate-100" />

              <div className="min-w-0 flex-1 space-y-2">
                <input
                  value={b.alt}
                  onChange={(e) => edit(i, { alt: e.target.value })}
                  placeholder="Describe the banner — read aloud, and by Google"
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-ayur-green/25"
                />
                <div className="flex flex-wrap gap-2 items-center">
                  <select value={b.to} onChange={(e) => edit(i, { to: e.target.value })}
                    className="border border-slate-200 rounded-lg px-2 py-1 text-[12px] bg-white">
                    {LINKS.map((l) => <option key={l.to} value={l.to}>{l.label}</option>)}
                    {!LINKS.some((l) => l.to === b.to) && <option value={b.to}>{b.to}</option>}
                  </select>

                  <button
                    onClick={() => edit(i, { active: !b.active })}
                    role="switch" aria-checked={b.active}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${b.active ? "bg-ayur-green" : "bg-slate-300"}`}
                  >
                    <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${b.active ? "translate-x-[18px]" : "translate-x-0.5"}`} />
                  </button>
                  <span className="text-[11px] text-slate-500">{b.active ? "Showing" : "Hidden"}</span>

                  <button onClick={() => remove(i)} title="Remove"
                    className="ml-auto text-slate-400 hover:text-red-600 p-1"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}

          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); accept(e.dataTransfer.files); }}
            onClick={() => document.getElementById("banner-file")?.click()}
            className={`rounded-xl border-2 border-dashed px-4 py-7 text-center cursor-pointer transition-colors ${
              dragging ? "border-ayur-green bg-ayur-green/5" : "border-slate-300 bg-white hover:bg-slate-50"
            }`}
          >
            <input id="banner-file" type="file" accept="image/*" multiple hidden
              onChange={(e) => { accept(e.target.files); e.target.value = ""; }} />
            {uploading > 0 ? (
              <span className="inline-flex items-center gap-2 text-sm text-slate-500">
                <Loader2 size={15} className="animate-spin" /> Uploading {uploading}…
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 text-sm text-slate-500">
                <Upload size={15} /> <b className="text-slate-800">Drop a banner here</b>, or click to choose
              </span>
            )}
            <p className="text-[10.5px] text-slate-400 mt-1">1600×600 or wider · JPG or WebP · up to 8MB</p>
          </div>

          {!canUpload && (
            <p className="text-[11.5px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              File upload isn't configured on the server yet, so dropping an image here won't work.
            </p>
          )}
        </div>
      )}
    </AdminShell>
  );
}
