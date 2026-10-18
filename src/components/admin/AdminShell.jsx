import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import {
  BarChart3, ShoppingBag, Package, Users, Image as ImageIcon, Receipt, Settings, LogOut,
  PanelLeftClose, PanelLeftOpen,
} from "lucide-react";

// One frame around every admin screen.
//
// Orders, Products and the rest used to be standalone pages, each with its own
// header, so moving between them meant a full page load and a fresh look at
// where everything had gone. The sections are routes inside this shell now.

const SECTIONS = [
  { to: "/admin", label: "Sales", icon: BarChart3, end: true },
  { to: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/customers", label: "Customers", icon: Users },
  { to: "/admin/creatives", label: "Creatives", icon: ImageIcon },
  { to: "/admin/tax", label: "Tax", icon: Receipt },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

// The Orders table is two dozen columns wide, so 208px of navigation is real
// estate worth reclaiming. Collapsed, the rail keeps its icons — the sections
// stay reachable, they just stop spelling themselves out.
const COLLAPSE_KEY = "sba-admin-nav-collapsed";

function useCollapsed() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === "1";
    } catch {
      // Private windows and blocked site data both throw here; the rail simply
      // starts open rather than the page failing to render.
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
    } catch {
      /* A preference we could not save is not worth an error. */
    }
  }, [collapsed]);
  return [collapsed, setCollapsed];
}

export default function AdminShell({ title, subtitle, actions, onSignOut, children }) {
  const { pathname } = useLocation();
  const isCurrent = (s) => (s.end ? pathname === s.to : pathname.startsWith(s.to));
  const [collapsed, setCollapsed] = useCollapsed();

  return (
    <div
      className={`min-h-screen bg-slate-100 lg:grid ${
        collapsed ? "lg:grid-cols-[60px_minmax(0,1fr)]" : "lg:grid-cols-[208px_minmax(0,1fr)]"
      }`}
    >
      <Toaster position="top-right" />

      <nav className="bg-slate-900 lg:min-h-screen flex lg:flex-col gap-1 lg:gap-4 px-3 py-2.5 lg:py-4 overflow-x-auto">
        {/* Collapsed, the rail is 60px: a badge and a button side by side do not
            fit, and the button was pushed out of sight — leaving no way to open
            the menu again. Stacked, both stay reachable. */}
        <div className={`hidden lg:flex gap-2.5 px-2 pb-1 ${
          collapsed ? "flex-col items-center" : "items-center"
        }`}>
          <span className="w-7 h-7 rounded-lg bg-ayur-green text-white grid place-items-center text-[11px] font-bold shrink-0">
            SB
          </span>
          {!collapsed && (
            <span className="min-w-0">
              <b className="block text-white text-[13px] font-semibold leading-tight">SB Ayurveda</b>
              <i className="block text-slate-500 text-[10px] not-italic">Console</i>
            </span>
          )}
          <button
            onClick={() => setCollapsed((v) => !v)}
            title={collapsed ? "Show menu" : "Hide menu"}
            aria-label={collapsed ? "Show menu" : "Hide menu"}
            aria-expanded={!collapsed}
            className={`p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 shrink-0 ${
              collapsed ? "" : "ml-auto"
            }`}
          >
            {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
          </button>
        </div>

        <div className="flex lg:flex-col gap-1">
          {SECTIONS.map((s) => (
            <Link
              key={s.to}
              to={s.to}
              aria-current={isCurrent(s) ? "page" : undefined}
              title={collapsed ? s.label : undefined}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] whitespace-nowrap transition-colors ${
                collapsed ? "lg:justify-center lg:px-0" : ""
              } ${
                isCurrent(s)
                  ? "bg-ayur-green text-white font-semibold"
                  : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              <s.icon size={15} className="shrink-0" />
              <span className={collapsed ? "lg:hidden" : ""}>{s.label}</span>
            </Link>
          ))}
        </div>

        {onSignOut && (
          <button
            onClick={onSignOut}
            title={collapsed ? "Sign out" : undefined}
            className={`lg:mt-auto flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-slate-400 hover:bg-slate-800 whitespace-nowrap ${
              collapsed ? "lg:justify-center lg:px-0" : ""
            }`}
          >
            <LogOut size={15} className="shrink-0" />
            <span className={collapsed ? "lg:hidden" : ""}>Sign out</span>
          </button>
        )}
      </nav>

      <main className="min-w-0 px-4 py-4 pb-12 lg:px-6">
        {(title || actions) && (
          <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 mb-4">
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
              {subtitle && <p className="text-xs text-slate-500 mt-1 max-w-[62ch]">{subtitle}</p>}
            </div>
            {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
          </header>
        )}
        {children}
      </main>
    </div>
  );
}
