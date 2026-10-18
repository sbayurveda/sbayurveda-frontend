import { useRef, useState } from "react";
import { Download, Upload, Loader2, AlertTriangle, Check } from "lucide-react";
import toast from "react-hot-toast";
import { downloadCatalogueCsv, importCatalogue, AdminAuthError } from "../../api/adminApi";

// Moving the catalogue in and out as a spreadsheet.
//
// Importing happens in two steps on purpose. A file touching 1,400 products is
// not something to find out about afterwards, so the first pass writes nothing
// and reports what it would do — how many updates, how many new products, and
// every row it could not read.

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function CatalogueTransfer({ onAuthError, onImported }) {
  const [busy, setBusy] = useState("");
  const [plan, setPlan] = useState(null);
  const [csv, setCsv] = useState("");
  const fileRef = useRef(null);

  const fail = (err) => {
    if (err instanceof AdminAuthError) onAuthError(err);
    else toast.error(err.message);
  };

  async function exportCsv() {
    setBusy("export");
    try {
      const { blob, filename } = await downloadCatalogueCsv();
      saveBlob(blob, filename);
      toast.success("Products exported");
    } catch (err) { fail(err); } finally { setBusy(""); }
  }

  async function choose(file) {
    if (!file) return;
    setBusy("read");
    try {
      const text = await file.text();
      setCsv(text);
      const result = await importCatalogue(text, false);
      setPlan(result);
    } catch (err) { fail(err); setPlan(null); } finally { setBusy(""); }
  }

  async function apply() {
    if (!csv || busy) return;
    setBusy("apply");
    try {
      const r = await importCatalogue(csv, true);
      toast.success(`${r.updated} updated, ${r.created} created`);
      if (r.failures?.length) toast.error(`${r.failures.length} rows failed.`);
      setPlan(null);
      setCsv("");
      if (fileRef.current) fileRef.current.value = "";
      onImported?.();
    } catch (err) { fail(err); } finally { setBusy(""); }
  }

  return (
    <div className="border border-slate-200 rounded-xl bg-white p-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={exportCsv}
          disabled={busy === "export"}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11.5px] font-semibold border bg-white text-slate-700 border-slate-300 hover:bg-slate-50 disabled:opacity-50"
        >
          {busy === "export" ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
          Export all products
        </button>

        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy === "read"}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11.5px] font-semibold border bg-white text-slate-700 border-slate-300 hover:bg-slate-50 disabled:opacity-50"
        >
          {busy === "read" ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
          Import from CSV
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          hidden
          onChange={(e) => choose(e.target.files?.[0])}
        />

        <span className="text-[10.5px] text-slate-400">
          Export, edit in a spreadsheet, import back. Only the columns in your file are changed.
        </span>
      </div>

      {plan && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <p className="text-[12px] text-slate-700">
            This file would <b>update {plan.willUpdate}</b> and <b>create {plan.willCreate}</b> product
            {plan.willCreate === 1 ? "" : "s"}. Nothing has been changed yet.
          </p>

          {plan.sample?.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-[11px] text-slate-500">
              {plan.sample.map((r) => (
                <li key={`${r.action}-${r.line}`}>
                  <span className={r.action === "create" ? "text-ayur-green font-semibold" : "text-slate-600 font-semibold"}>
                    {r.action}
                  </span>{" "}
                  line {r.line} · {r.name || "(no name)"}
                  {r.fields?.length > 0 && <span className="text-slate-400"> · {r.fields.join(", ")}</span>}
                </li>
              ))}
            </ul>
          )}

          {plan.errors?.length > 0 && (
            <div className="mt-2 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
              <p className="flex items-center gap-1.5 font-semibold mb-0.5">
                <AlertTriangle size={12} /> {plan.errors.length} row{plan.errors.length === 1 ? "" : "s"} need attention
              </p>
              <ul className="space-y-0.5">
                {plan.errors.slice(0, 8).map((e, i) => (
                  <li key={i}>{e.line ? `Line ${e.line}: ` : ""}{e.reason}</li>
                ))}
                {plan.errors.length > 8 && <li>…and {plan.errors.length - 8} more</li>}
              </ul>
            </div>
          )}

          <div className="flex gap-2 mt-2.5">
            <button
              onClick={apply}
              disabled={busy === "apply" || (plan.willUpdate + plan.willCreate === 0)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11.5px] font-semibold bg-ayur-green text-white hover:opacity-90 disabled:opacity-50"
            >
              {busy === "apply" ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              Apply to {plan.willUpdate + plan.willCreate} product{plan.willUpdate + plan.willCreate === 1 ? "" : "s"}
            </button>
            <button
              onClick={() => { setPlan(null); setCsv(""); if (fileRef.current) fileRef.current.value = ""; }}
              className="text-[11.5px] text-slate-500 underline hover:text-slate-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
