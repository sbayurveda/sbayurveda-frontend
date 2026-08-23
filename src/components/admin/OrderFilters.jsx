import { Search, SlidersHorizontal, X } from "lucide-react";
import { ORDER_STATUSES } from "../../utils/adminFormat";
import { EMPTY_FILTERS, PAYMENT_STATUSES, activeFilterCount } from "../../utils/adminFilters";

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold text-slate-500 mb-1">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ayur-green/25";

export default function OrderFilters({ filters, onChange, open, onToggle, paymentMethods }) {
  const set = (key) => (e) => onChange({ ...filters, [key]: e.target.value });
  const count = activeFilterCount(filters);

  return (
    <div className="bg-white border border-slate-200 rounded-xl">
      <div className="flex flex-wrap items-center gap-2 p-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={filters.search}
            onChange={set("search")}
            placeholder="Search order no., name, email, phone, product…"
            className={`${inputCls} pl-9`}
          />
          {filters.search && (
            <button
              onClick={() => onChange({ ...filters, search: "" })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <button
          onClick={onToggle}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
            open || count
              ? "bg-ayur-green/10 border-ayur-green/30 text-ayur-green-dark"
              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          <SlidersHorizontal size={14} />
          Filters
          {count > 0 && (
            <span className="ml-0.5 bg-ayur-green text-white rounded-full px-1.5 text-[10px] font-bold">
              {count}
            </span>
          )}
        </button>

        {count > 0 && (
          <button
            onClick={() => onChange({ ...EMPTY_FILTERS, search: filters.search })}
            className="text-xs text-slate-500 hover:text-red-600 px-2 py-1.5"
          >
            Clear all
          </button>
        )}
      </div>

      {open && (
        <div className="border-t border-slate-100 p-3 grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          <Field label="Date from">
            <input type="date" value={filters.dateFrom} onChange={set("dateFrom")} className={inputCls} />
          </Field>
          <Field label="Date to">
            <input type="date" value={filters.dateTo} onChange={set("dateTo")} className={inputCls} />
          </Field>
          <Field label="Order status">
            <select value={filters.status} onChange={set("status")} className={inputCls}>
              {ORDER_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Payment status">
            <select value={filters.paymentStatus} onChange={set("paymentStatus")} className={inputCls}>
              {PAYMENT_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Payment method">
            <select value={filters.paymentMethod} onChange={set("paymentMethod")} className={inputCls}>
              <option value="any">All methods</option>
              {paymentMethods.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </Field>
          <Field label="Customer name">
            <input value={filters.customerName} onChange={set("customerName")} placeholder="e.g. Rohit" className={inputCls} />
          </Field>
          <Field label="Customer email">
            <input value={filters.customerEmail} onChange={set("customerEmail")} placeholder="e.g. @gmail.com" className={inputCls} />
          </Field>
          <Field label="Phone number">
            <input value={filters.phone} onChange={set("phone")} placeholder="e.g. 9876" className={inputCls} />
          </Field>
          <Field label="Product name">
            <input value={filters.productName} onChange={set("productName")} placeholder="e.g. Chyawanprash" className={inputCls} />
          </Field>
          <Field label="Min amount (₹)">
            <input type="number" inputMode="decimal" value={filters.minAmount} onChange={set("minAmount")} placeholder="0" className={inputCls} />
          </Field>
          <Field label="Max amount (₹)">
            <input type="number" inputMode="decimal" value={filters.maxAmount} onChange={set("maxAmount")} placeholder="Any" className={inputCls} />
          </Field>
        </div>
      )}
    </div>
  );
}
