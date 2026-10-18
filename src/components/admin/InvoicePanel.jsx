import { useEffect, useState } from "react";
import { FileText, Download, Loader2, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import { fetchInvoice, AdminAuthError } from "../../api/adminApi";
import { invoicePdf, invoiceFilename, money } from "../../utils/invoicePdf";

// The invoice for one order: shown on screen, and downloadable as a real PDF.
//
// The figures are not computed here. They come from the server, which builds
// them from the same rows that go into the GST return — a claim is assessed
// against this document, so it has to say exactly what was filed.

function Cell({ children, align = "left", bold, className = "" }) {
  return (
    <td className={`px-2 py-1.5 text-${align} ${bold ? "font-semibold text-slate-900" : "text-slate-600"} ${className}`}>
      {children}
    </td>
  );
}

export default function InvoicePanel({ order, onAuthError }) {
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!order) return;
    let cancelled = false;
    setInvoice(null);
    setError("");
    fetchInvoice(order.id)
      .then((d) => { if (!cancelled) setInvoice(d.invoice); })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof AdminAuthError) onAuthError(err);
        else setError(err.message);
      });
    return () => { cancelled = true; };
  }, [order, onAuthError]);

  function download() {
    try {
      invoicePdf(invoice).save(invoiceFilename(invoice));
    } catch (err) {
      toast.error(`Couldn't build the PDF: ${err.message}`);
    }
  }

  if (error) return <p className="text-xs text-red-600">{error}</p>;
  if (!invoice) {
    return (
      <p className="flex items-center gap-2 text-xs text-slate-400">
        <Loader2 size={13} className="animate-spin" /> Building the invoice…
      </p>
    );
  }

  const rows = [...invoice.lines, ...(invoice.charges ? [invoice.charges] : [])];
  const taxLabel = invoice.intraState ? ["CGST", "SGST"] : ["IGST"];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
        <span className="text-[11.5px] text-slate-500">
          Invoice <b className="text-slate-800">{invoice.invoiceNumber}</b> · {invoice.invoiceDate}
          {invoice.transactionType !== "Shipment" && (
            <b className="ml-1.5 text-amber-700">{invoice.transactionType}</b>
          )}
        </span>
        <button
          onClick={download}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11.5px] font-semibold bg-ayur-green text-white hover:opacity-90"
        >
          <Download size={13} /> Download PDF
        </button>
      </div>

      {/* An invoice that does not add up to the order must not be filed
          quietly; it says so here as well as on the PDF itself. */}
      {!invoice.reconciles && (
        <p className="flex items-start gap-1.5 mb-2 text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5">
          <AlertTriangle size={13} className="shrink-0 mt-px" />
          This invoice differs from the order total by {money(invoice.difference)}. Check it before filing.
        </p>
      )}

      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-[11.5px] min-w-[460px]">
          <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-2 py-1.5 text-left font-semibold">Description</th>
              <th className="px-2 py-1.5 text-left font-semibold">HSN</th>
              <th className="px-2 py-1.5 text-right font-semibold">Qty</th>
              <th className="px-2 py-1.5 text-right font-semibold">Taxable</th>
              {taxLabel.map((t) => (
                <th key={t} className="px-2 py-1.5 text-right font-semibold">{t}</th>
              ))}
              <th className="px-2 py-1.5 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((l, i) => (
              <tr key={i}>
                <Cell>{l.description}</Cell>
                <Cell>{l.hsn || "—"}</Cell>
                <Cell align="right">{l.qty ?? "—"}</Cell>
                <Cell align="right" className="tabular-nums">{money(l.taxable)}</Cell>
                <Cell align="right" className="tabular-nums">
                  {money(invoice.intraState ? l.cgst : l.igst)}
                </Cell>
                {invoice.intraState && (
                  <Cell align="right" className="tabular-nums">{money(l.sgst)}</Cell>
                )}
                <Cell align="right" bold className="tabular-nums">{money(l.total)}</Cell>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-50">
            <tr>
              <td className="px-2 py-1.5 text-[11px] text-slate-500" colSpan={3 + taxLabel.length}>
                {invoice.amountInWords}
              </td>
              <td className="px-2 py-1.5 text-right text-[10px] uppercase tracking-wide text-slate-400">Total</td>
              <td className="px-2 py-1.5 text-right font-bold text-slate-900 tabular-nums">
                {money(invoice.totals.grand)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="mt-2 text-[10.5px] text-slate-400 flex items-center gap-1.5">
        <FileText size={11} />
        Place of supply {invoice.placeOfSupply || "—"} · {invoice.intraState ? "CGST + SGST" : "IGST"} ·
        built from the same figures as the GST return
      </p>
    </div>
  );
}
