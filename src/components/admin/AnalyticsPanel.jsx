import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3, ChevronDown, Loader2, TrendingUp, TrendingDown, Minus,
  Truck, PackageCheck, Clock, Wallet,
} from "lucide-react";
import { fetchAnalytics, AdminAuthError } from "../../api/adminApi";
import { formatMoney } from "../../utils/adminFormat";

// Validated with the dataviz palette checker on a light surface:
// indigo/amber pass CVD separation at ΔE 29.6 (protan) and 34.5 (normal vision),
// which matters because COD vs Prepaid is the one place two series share a chart.
// Single-series charts use one emerald and carry no legend — the title names them.
const SERIES = {
  single: "#047857",
  prepaid: "#4338CA",
  cod: "#B45309",
};

const RANGES = [
  { key: "1", label: "Today", compare: "vs yesterday" },
  { key: "7", label: "7 days", compare: "vs previous 7 days" },
  { key: "30", label: "30 days", compare: "vs previous 30 days" },
  { key: "90", label: "90 days", compare: "vs previous 90 days" },
];

// Order timestamps come from WooCommerce in the store's own timezone, so the
// ranges have to be built in that timezone too. Using toISOString() here meant
// UTC: after 6:30pm IST the UTC date has already rolled over, so "Today" asked
// for yesterday and showed yesterday's takings. en-CA formats as YYYY-MM-DD.
const STORE_TIMEZONE = "Asia/Kolkata";
const storeDayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: STORE_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function storeDayIso(daysAgo = 0) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return storeDayFormatter.format(d);
}

function pctChange(now, before) {
  if (!before) return now ? null : 0; // no baseline to compare against
  return Math.round(((now - before) / before) * 1000) / 10;
}

function Delta({ now, before }) {
  const change = pctChange(now, before);
  if (change === null) {
    return <span className="text-[11px] text-slate-400">no earlier data</span>;
  }
  const flat = Math.abs(change) < 0.05;
  const Icon = flat ? Minus : change > 0 ? TrendingUp : TrendingDown;
  const tone = flat ? "text-slate-400" : change > 0 ? "text-green-600" : "text-red-600";
  return (
    <span className={`text-[11px] font-semibold inline-flex items-center gap-0.5 ${tone}`}>
      <Icon size={11} />
      {flat ? "no change" : `${Math.abs(change)}%`}
    </span>
  );
}

function Kpi({ label, value, now, before }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-3.5 py-3">
      <p className="text-[11px] text-slate-500 font-medium">{label}</p>
      <p className="text-lg font-bold text-slate-900 leading-tight mt-0.5">{value}</p>
      <div className="mt-1"><Delta now={now} before={before} /></div>
    </div>
  );
}

// Daily revenue. Only revenue is plotted — order count rides along in the
// tooltip rather than a second axis, because two y-scales on one chart is the
// fastest way to make a chart lie.
function TrendChart({ trend }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(...trend.map((d) => d.revenue), 1);
  const barW = 100 / Math.max(trend.length, 1);

  if (!trend.length) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3.5">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-xs font-bold text-slate-700">Revenue per day</h3>
        <span className="text-[11px] text-slate-400">
          {hover ? `${hover.date.slice(8)}/${hover.date.slice(5, 7)}` : `peak ${formatMoney(max)}`}
        </span>
      </div>

      <div className="relative">
        <svg viewBox="0 0 100 34" preserveAspectRatio="none" className="w-full h-[110px] overflow-visible">
          {/* recessive baseline only — no gridlines competing with the bars */}
          <line x1="0" y1="34" x2="100" y2="34" stroke="#e2e8f0" strokeWidth="0.3" />
          {trend.map((d, i) => {
            const h = (d.revenue / max) * 30;
            const isHover = hover?.date === d.date;
            return (
              <rect
                key={d.date}
                x={i * barW + barW * 0.15}
                y={34 - h}
                width={barW * 0.7}
                height={Math.max(h, d.revenue > 0 ? 0.6 : 0)}
                // Capped so the "Today" view's single wide bar keeps a normal
                // rounded end instead of turning into a lozenge.
                rx={Math.min(barW * 0.25, 1)}
                fill={SERIES.single}
                opacity={isHover ? 1 : 0.82}
                onMouseEnter={() => setHover(d)}
                onMouseLeave={() => setHover(null)}
              />
            );
          })}
        </svg>

        {hover && (
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[11px] rounded-lg px-2 py-1 pointer-events-none whitespace-nowrap shadow-lg">
            {formatMoney(hover.revenue)} · {hover.orders} order{hover.orders === 1 ? "" : "s"}
          </div>
        )}
      </div>

      <div className="flex justify-between text-[10px] text-slate-400 mt-1">
        <span>{trend[0]?.date.slice(5)}</span>
        <span>{trend[trend.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  );
}

// Horizontal ranked bars, used for products / places / sources. One series, so
// one colour and no legend; the row label is the direct label.
function RankedBars({ title, rows, valueKey, format, empty, footer }) {
  const max = Math.max(...rows.map((r) => r[valueKey]), 1);
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3.5">
      <h3 className="text-xs font-bold text-slate-700 mb-2.5">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-[11px] text-slate-400 py-3">{empty}</p>
      ) : (
        <div className="space-y-1.5">
          {rows.map((r) => (
            <div key={r.name} className="group" title={`${r.name} — ${format(r[valueKey])}`}>
              <div className="flex justify-between gap-2 text-[11px] mb-0.5">
                <span className="text-slate-600 truncate">{r.name}</span>
                <span className="text-slate-800 font-semibold shrink-0">{format(r[valueKey])}</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${(r[valueKey] / max) * 100}%`, background: SERIES.single }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
      {footer && <p className="text-[10px] text-slate-400 mt-2">{footer}</p>}
    </div>
  );
}

function PaymentSplit({ payment }) {
  const total = payment.cod.revenue + payment.prepaid.revenue;
  const totalOrders = payment.cod.orders + payment.prepaid.orders;
  // Revenue share and order share differ whenever one method carries bigger
  // baskets, so both are shown rather than leaving the reader to assume.
  const share = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0);
  const rows = [
    { key: "prepaid", label: "Prepaid", color: SERIES.prepaid, ...payment.prepaid },
    { key: "cod", label: "Cash on delivery", color: SERIES.cod, ...payment.cod },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3.5">
      <h3 className="text-xs font-bold text-slate-700 mb-2.5">Prepaid vs COD</h3>

      {/* stacked share bar, with a 2px surface gap between the two fills */}
      <div className="flex gap-[2px] h-2.5 mb-2.5">
        {rows.map((r) => (
          <div
            key={r.key}
            className="rounded-full first:rounded-r-none last:rounded-l-none"
            style={{
              width: total ? `${(r.revenue / total) * 100}%` : "50%",
              background: r.color,
              minWidth: r.revenue ? "6px" : 0,
            }}
          />
        ))}
      </div>

      {/* legend doubles as the data table — identity never by colour alone */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
          <span className="w-2 shrink-0" />
          <span className="flex-1" />
          <span className="w-24 text-right">Revenue</span>
          <span className="w-20 text-right">Orders</span>
        </div>
        {rows.map((r) => (
          <div key={r.key} className="flex items-center gap-2 text-[11px]">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: r.color }} />
            <span className="text-slate-600 flex-1 truncate">{r.label}</span>
            <span className="w-24 text-right">
              <span className="text-slate-800 font-semibold">{formatMoney(r.revenue)}</span>
              <span className="text-slate-400 ml-1">{share(r.revenue, total)}%</span>
            </span>
            <span className="w-20 text-right">
              <span className="text-slate-700">{r.orders}</span>
              <span className="text-slate-400 ml-1">{share(r.orders, totalOrders)}%</span>
            </span>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-100 mt-2.5 pt-2.5 flex items-center justify-between text-[11px]">
        <span className="text-slate-500">Cancelled before delivery</span>
        <span className="flex gap-3">
          <span className="text-slate-700">
            prepaid <strong>{payment.prepaid.cancelRate}%</strong>
          </span>
          <span className={payment.cod.cancelRate > payment.prepaid.cancelRate + 5 ? "text-red-600" : "text-slate-700"}>
            COD <strong>{payment.cod.cancelRate}%</strong>
          </span>
        </span>
      </div>
    </div>
  );
}

function Fulfilment({ f }) {
  const items = [
    { icon: Clock, label: "Awaiting dispatch", value: f.awaitingDispatch, tone: "text-amber-700 bg-amber-50" },
    { icon: Truck, label: "Shipped", value: f.shipped, tone: "text-blue-700 bg-blue-50" },
    { icon: PackageCheck, label: "Delivered", value: f.delivered, tone: "text-green-700 bg-green-50" },
    { icon: Wallet, label: "COD due", value: formatMoney(f.codOutstanding), tone: "text-slate-600 bg-slate-100" },
  ];
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3.5">
      <h3 className="text-xs font-bold text-slate-700 mb-2.5">Fulfilment</h3>
      <div className="grid grid-cols-2 gap-2">
        {items.map((it) => (
          <div key={it.label} className="flex items-center gap-2">
            <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${it.tone}`}>
              <it.icon size={14} />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-500 leading-tight">{it.label}</p>
              <p className="text-sm font-bold text-slate-900 truncate">{it.value}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-slate-100 mt-2.5 pt-2.5 text-[11px] text-slate-500">
        Order to delivered:{" "}
        <strong className="text-slate-800">
          {f.avgHoursToComplete === null
            ? "—"
            : f.avgHoursToComplete >= 48
              ? `${(f.avgHoursToComplete / 24).toFixed(1)} days`
              : `${f.avgHoursToComplete} hours`}
        </strong>{" "}
        on average
      </div>
    </div>
  );
}

const OPEN_KEY = "sba-admin-analytics-open";

export default function AnalyticsPanel({ onAuthError }) {
  // Expanded the first time so it's discoverable, but the choice sticks — this
  // page is mostly used for working through orders, and someone who collapses
  // the panel shouldn't have to collapse it again every visit.
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(OPEN_KEY) !== "closed";
    } catch {
      return true;
    }
  });

  const toggleOpen = useCallback(() => {
    setOpen((wasOpen) => {
      try {
        localStorage.setItem(OPEN_KEY, wasOpen ? "closed" : "open");
      } catch {
        // Storage unavailable — the panel still toggles for this session.
      }
      return !wasOpen;
    });
  }, []);
  const [rangeKey, setRangeKey] = useState("30");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [productMode, setProductMode] = useState("revenue");
  const [placeMode, setPlaceMode] = useState("states");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await fetchAnalytics({
        from: storeDayIso(Number(rangeKey) - 1),
        to: storeDayIso(0),
      });
      setData(result);
    } catch (err) {
      if (err instanceof AdminAuthError) onAuthError(err);
      else setError(err.message || "Could not load analytics.");
    } finally {
      setLoading(false);
    }
  }, [rangeKey, onAuthError]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const products = useMemo(() => {
    if (!data) return [];
    return productMode === "revenue" ? data.topProductsByRevenue : data.topProductsByUnits;
  }, [data, productMode]);

  const places = useMemo(() => {
    if (!data) return [];
    return placeMode === "states" ? data.states : data.cities;
  }, [data, placeMode]);

  return (
    <section className="bg-white border border-slate-200 rounded-xl">
      <button
        onClick={toggleOpen}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-left"
      >
        <BarChart3 size={15} className="text-ayur-green" />
        <span className="font-bold text-sm text-slate-800">Analytics</span>
        {data && !loading && (
          <span className="text-[11px] text-slate-400">
            {formatMoney(data.totals.revenue)} from {data.totals.orders} orders
          </span>
        )}
        {loading && <Loader2 size={13} className="animate-spin text-slate-400" />}
        <ChevronDown
          size={16}
          className={`ml-auto text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="border-t border-slate-100 p-3 bg-slate-50/60 space-y-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRangeKey(r.key)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                  rangeKey === r.key
                    ? "bg-ayur-green text-white border-ayur-green"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {r.label}
              </button>
            ))}
            {data && (
              <span className="text-[11px] text-slate-400 ml-1">
                {RANGES.find((r) => r.key === rangeKey)?.compare}
              </span>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          {!data && loading && (
            <div className="py-10 text-center text-xs text-slate-400">
              <Loader2 size={20} className="animate-spin mx-auto mb-2" />
              Adding up every order in this range…
            </div>
          )}

          {data && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                <Kpi label="Revenue" value={formatMoney(data.totals.revenue)}
                  now={data.totals.revenue} before={data.previous.revenue} />
                <Kpi label="Orders" value={data.totals.orders}
                  now={data.totals.orders} before={data.previous.orders} />
                <Kpi label="Average order" value={formatMoney(data.totals.aov)}
                  now={data.totals.aov} before={data.previous.aov} />
                <Kpi label="Units sold" value={data.totals.units}
                  now={data.totals.units} before={data.previous.units} />
              </div>

              <TrendChart trend={data.trend} />

              <div className="grid md:grid-cols-2 gap-2.5">
                <PaymentSplit payment={data.payment} />
                <Fulfilment f={data.fulfilment} />
              </div>

              <div className="grid md:grid-cols-3 gap-2.5">
                <RankedBars
                  title={
                    <>
                      Top products
                      <button
                        onClick={() => setProductMode((m) => (m === "revenue" ? "units" : "revenue"))}
                        className="ml-1 text-[10px] font-medium text-ayur-green hover:underline"
                      >
                        by {productMode}
                      </button>
                    </>
                  }
                  rows={products.slice(0, 6)}
                  valueKey={productMode}
                  format={(v) => (productMode === "revenue" ? formatMoney(v) : `${v} units`)}
                  empty="No sales in this period."
                />
                <RankedBars
                  title={
                    <>
                      Top{" "}
                      <button
                        onClick={() => setPlaceMode((m) => (m === "states" ? "cities" : "states"))}
                        className="text-[10px] font-medium text-ayur-green hover:underline"
                      >
                        {placeMode}
                      </button>
                    </>
                  }
                  rows={places.slice(0, 6)}
                  valueKey="revenue"
                  format={formatMoney}
                  empty="No orders in this period."
                />
                <RankedBars
                  title="Where orders came from"
                  rows={data.sources.slice(0, 6)}
                  valueKey="orders"
                  format={(v) => `${v} orders`}
                  empty="Nothing recorded yet."
                  footer="Only recorded for orders placed after this was switched on."
                />
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
