import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Download, AlertTriangle, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import {
  getAdminSession, clearAdminSession, isAdminApiConfigured, AdminAuthError,
  fetchTaxReport, downloadTaxCsv,
} from "../api/adminApi";
import AdminLogin from "../components/admin/AdminLogin";
import AdminShell from "../components/admin/AdminShell";
import { formatMoney } from "../utils/adminFormat";
import { useSeo } from "../utils/useSeo";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

// Months are built in the store's own timezone. Using the browser's would put
// an order placed late on the 31st into the wrong return.
function monthRange(year, month) {
  const pad = (n) => String(n).padStart(2, "0");
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return { from: `${year}-${pad(month + 1)}-01`, to: `${year}-${pad(month + 1)}-${pad(last)}` };
}

function Figure({ label, value, strong }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b border-slate-100 last:border-0">
      <span className={`text-[12.5px] ${strong ? "font-semibold text-slate-800" : "text-slate-500"}`}>{label}</span>
      <span className={`tabular-nums text-[12.5px] ${strong ? "font-semibold" : ""}`}>{value}</span>
    </div>
  );
}

export default function AdminTax() {
  useSeo({ title: "Tax — Admin", path: "/admin/tax", noindex: true });

  const [session, setSession] = useState(getAdminSession);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const range = useMemo(() => monthRange(year, month), [year, month]);

  const onAuthError = useCallback((err) => {
    clearAdminSession(); setSession(null); toast.error(err.message);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setReport(await fetchTaxReport(range));
    } catch (err) {
      if (err instanceof AdminAuthError) onAuthError(err);
      else toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [range, onAuthError]);

  useEffect(() => { if (session) load(); }, [session, load]);

  async function download() {
    setDownloading(true);
    try {
      const { blob, filename } = await downloadTaxCsv(range);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      toast.success(`${filename} downloaded`);
    } catch (err) {
      if (err instanceof AdminAuthError) onAuthError(err);
      else toast.error(err.message);
    } finally {
      setDownloading(false);
    }
  }

  if (!isAdminApiConfigured()) return <div className="p-8 text-center text-slate-500">Admin API isn't configured.</div>;
  if (!session) return <AdminLogin onSuccess={() => setSession(getAdminSession())} />;

  const s = report?.summary;
  const bad = report?.unreconciled || [];

  return (
    <AdminShell
      title="Tax"
      subtitle="One month per file, in the same 78 columns as the Amazon B2C merchant tax report, so it drops into whatever your accountant already uses."
      onSignOut={() => { clearAdminSession(); setSession(null); }}
      actions={
        <>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
            className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm bg-white">
            {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}
            className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm bg-white">
            {[0, 1, 2].map((d) => <option key={d} value={now.getFullYear() - d}>{now.getFullYear() - d}</option>)}
          </select>
          <button onClick={download} disabled={downloading || !s?.lines}
            className="btn-primary px-3 py-1.5 text-sm flex items-center gap-1.5 disabled:opacity-40">
            {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Download CSV
          </button>
        </>
      }
    >
      {loading && !report && (
        <p className="text-sm text-slate-400 py-8 text-center">
          <Loader2 size={15} className="animate-spin inline mr-1.5" /> Adding up {MONTHS[month]}…
        </p>
      )}

      {s && (
        <div className="grid lg:grid-cols-2 gap-3 items-start">
          <div className="bg-white border border-slate-200 rounded-xl">
            <header className="px-4 py-3 border-b border-slate-100">
              <h2 className="text-[13.5px] font-semibold">{MONTHS[month]} {year}</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">{s.from} to {s.to}</p>
            </header>
            <div className="px-4 py-2">
              <Figure label="Orders" value={s.orders} />
              <Figure label="Lines in the file" value={s.lines} />
              <Figure label="Shipments" value={s.shipments} />
              <Figure label="Cancellations" value={s.cancellations} />
              <Figure label="Refunds" value={s.refunds} />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl">
            <header className="px-4 py-3 border-b border-slate-100">
              <h2 className="text-[13.5px] font-semibold">What you collected</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Tax is carved out of these amounts, never added on top</p>
            </header>
            <div className="px-4 py-2">
              <Figure label="Taxable value" value={formatMoney(s.taxableValue)} />
              <Figure label="CGST" value={formatMoney(s.cgst)} />
              <Figure label="SGST" value={formatMoney(s.sgst)} />
              <Figure label="IGST" value={formatMoney(s.igst)} />
              <Figure label="Total tax" value={formatMoney(s.totalTax)} />
              <Figure label="Invoice total" value={formatMoney(s.invoiceTotal)} strong />
            </div>
          </div>

          <div className="lg:col-span-2">
            {bad.length === 0 ? (
              <div className="bg-green-50 border border-green-300 rounded-xl p-3.5 flex gap-2.5">
                <CheckCircle2 size={15} className="text-green-700 shrink-0 mt-0.5" />
                <p className="text-[12px] text-green-900 leading-relaxed">
                  Every order in this month adds back to what the customer paid — taxable value plus
                  tax equals the invoice total, line by line.
                </p>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-300 rounded-xl p-3.5">
                <h2 className="text-[13px] font-bold text-red-900 flex items-center gap-1.5">
                  <AlertTriangle size={14} /> {bad.length} order{bad.length > 1 ? "s" : ""} did not add up
                </h2>
                <p className="text-[11px] text-red-800 mt-1 mb-2 max-w-[70ch]">
                  The lines on these orders do not total what was charged, usually a discount or fee
                  nothing accounts for. They are still in the file — check them before you file.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {bad.slice(0, 40).map((u) => (
                    <span key={u.order} className="bg-white border border-red-300 rounded-lg px-2.5 py-1 text-[11px] tabular-nums">
                      #{u.order} <span className="text-red-700">off by {formatMoney(Math.abs(u.difference))}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 bg-slate-50 border border-slate-200 rounded-xl p-3.5">
            <h3 className="text-[12px] font-bold text-slate-700 mb-1.5">Before you file</h3>
            <ul className="text-[11.5px] text-slate-600 leading-relaxed list-disc pl-4 space-y-1">
              <li>Cash-on-delivery fees are treated as tax-inclusive at the same rate as the goods on
                  the order, so a ₹36 fee on 5% medicines is ₹34.29 plus ₹1.71 GST. The customer still pays ₹36.</li>
              <li>Haryana addresses are split into CGST and SGST; everywhere else is IGST.</li>
              <li>Invoice numbers are the WooCommerce order number.</li>
              <li>Products with no HSN code recorded are treated as 3004 at 5% — ayurvedic
                  medicaments. Set the code on a product to change its rate.</li>
              <li><b>Check the first month against one you have already filed</b> before relying on this.</li>
            </ul>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
