import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  Heart,
  ShoppingCart,
  MessageCircle,
  Tag,
  FileText,
  Menu,
  X,
  ChevronDown,
  UserCircle,
  PackageSearch,
  Stethoscope,
} from "lucide-react";
import { useStore } from "../context/store";
import { useCatalogStore } from "../context/catalogStore";
import { searchProducts } from "../utils/searchProducts";
import { healthConcerns } from "../data/categories";
import { whatsappForQuery } from "../utils/whatsapp";
import { siteInfo } from "../data/siteInfo";
import DoctorAppointmentModal from "./DoctorAppointmentModal";

export default function Header() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [concernOpen, setConcernOpen] = useState(false);
  const [doctorModalOpen, setDoctorModalOpen] = useState(false);
  const wrapRef = useRef(null);
  const concernRef = useRef(null);

  const cartCount = useStore((s) => s.getCartCount());
  const wishlist = useStore((s) => s.wishlist);
  const openCart = useStore((s) => s.openCart);
  const catalogProducts = useCatalogStore((s) => s.products);

  const suggestions = query.trim()
    ? searchProducts(catalogProducts, query).slice(0, 6)
    : [];

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
      if (concernRef.current && !concernRef.current.contains(e.target)) {
        setConcernOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function submitSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;
    navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    setShowSuggestions(false);
  }

  return (
    <header className="sticky top-0 z-40 bg-white shadow-card">
      <div className="container-px max-w-7xl mx-auto py-3 flex items-center gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img src={siteInfo.logoUrl} alt="SB Ayurveda" className="h-10 sm:h-12 w-auto" />
          <div className="leading-tight hidden sm:block">
            <div className="text-[10px] sm:text-[11px] font-semibold text-ayur-gold tracking-wide">
              SB AYURVEDA
            </div>
          </div>
        </Link>

        {/* Search */}
        <div ref={wrapRef} className="hidden md:block relative flex-1 max-w-xl">
          <form onSubmit={submitSearch} className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Search products or health concern e.g. Diabetes, Hair Fall..."
              className="w-full border border-gray-200 rounded-full pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ayur-green/40 bg-gray-50"
            />
          </form>

          {showSuggestions && query.trim() && (
            <div className="absolute top-full mt-2 w-full bg-white rounded-xl shadow-card-hover border border-gray-100 overflow-hidden z-50">
              {suggestions.length > 0 ? (
                <>
                  {suggestions.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        navigate(`/product/${p.slug}`);
                        setShowSuggestions(false);
                        setQuery("");
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-ayur-cream text-left"
                    >
                      <img src={p.image} alt="" className="w-9 h-9 rounded object-cover" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{p.name}</div>
                        <div className="text-xs text-gray-500">{p.brand}</div>
                      </div>
                      <div className="ml-auto text-sm font-bold text-ayur-green">
                        ₹{p.price}
                      </div>
                    </button>
                  ))}
                  <button
                    onClick={submitSearch}
                    className="w-full text-center text-sm font-semibold text-ayur-green py-2 border-t border-gray-100 hover:bg-ayur-cream"
                  >
                    View all results for "{query}"
                  </button>
                </>
              ) : (
                <div className="px-4 py-3 text-sm text-gray-500">
                  No products found. Try "Immunity" or "Chyawanprash".
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick actions (desktop) */}
        <div className="hidden lg:flex items-center gap-2 shrink-0">
          <a
            href={whatsappForQuery()}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-xs font-semibold bg-green-50 text-green-700 px-3 py-2 rounded-full hover:bg-green-100"
          >
            <MessageCircle size={15} /> Order on WhatsApp
          </a>
          <button
            onClick={() => setDoctorModalOpen(true)}
            className="flex items-center gap-1.5 text-xs font-semibold bg-ayur-cream text-ayur-green px-3 py-2 rounded-full hover:bg-amber-100"
          >
            <Stethoscope size={15} /> Ask a Doctor
          </button>
          <Link
            to="/offers"
            className="flex items-center gap-1.5 text-xs font-semibold text-ayur-green px-2 py-2 hover:underline"
          >
            <Tag size={15} /> Offers
          </Link>
          <Link
            to="/track-order"
            className="flex items-center gap-1.5 text-xs font-semibold text-ayur-green px-2 py-2 hover:underline"
          >
            <PackageSearch size={15} /> Track My Order
          </Link>
        </div>

        {/* Icons */}
        <div className="flex items-center gap-1 sm:gap-3 shrink-0 ml-auto">
          <Link
            to="/wishlist"
            className="relative p-2 rounded-full hover:bg-gray-100"
            aria-label="Wishlist"
          >
            <Heart size={22} className="text-ayur-green" />
            {wishlist.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-ayur-yellow text-ayur-green-dark text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {wishlist.length}
              </span>
            )}
          </Link>
          <button
            onClick={openCart}
            className="relative p-2 rounded-full hover:bg-gray-100"
            aria-label="Cart"
          >
            <ShoppingCart size={22} className="text-ayur-green" />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-ayur-yellow text-ayur-green-dark text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center animate-pop">
                {cartCount}
              </span>
            )}
          </button>
          <Link
            to="/track-order"
            className="lg:hidden flex items-center gap-1 text-xs font-semibold text-ayur-green bg-ayur-cream px-2.5 py-2 rounded-full hover:bg-amber-100"
            aria-label="My Account"
          >
            <UserCircle size={17} /> My Account
          </Link>
          <button
            className="md:hidden p-2 rounded-full hover:bg-gray-100"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile search */}
      <div className="md:hidden container-px pb-3">
        <form onSubmit={submitSearch} className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Chyawanprash, Diabetes, Hair Fall..."
            className="w-full border border-gray-200 rounded-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-ayur-green/40"
          />
        </form>
      </div>

      {/* Category strip (desktop) */}
      <nav className="hidden md:block border-t border-gray-100 bg-ayur-cream/60 relative z-30">
        <div className="container-px max-w-7xl mx-auto flex items-center gap-6 py-2.5 text-sm font-medium text-gray-700">
          <Link to="/" className="hover:text-ayur-green whitespace-nowrap">
            Home
          </Link>
          <Link to="/category/popular" className="hover:text-ayur-green whitespace-nowrap">
            Shop All Products
          </Link>

          <div ref={concernRef} className="relative">
            <button
              onClick={() => setConcernOpen((v) => !v)}
              className="flex items-center gap-1 hover:text-ayur-green whitespace-nowrap"
            >
              Shop by Health Concern
              <ChevronDown
                size={14}
                className={`transition-transform ${concernOpen ? "rotate-180" : ""}`}
              />
            </button>

            {concernOpen && (
              <div className="absolute left-0 top-full mt-2 w-[560px] bg-white rounded-xl shadow-card-hover border border-gray-100 p-4">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3 px-1">
                  Shop by Health Concern
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {healthConcerns.map((c) => (
                    <Link
                      key={c.id}
                      to={`/category/${c.id}`}
                      onClick={() => setConcernOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-ayur-cream"
                    >
                      <span
                        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: `${c.color}1A` }}
                      >
                        <c.icon size={16} style={{ color: c.color }} />
                      </span>
                      <span className="text-sm font-medium text-gray-700">{c.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Link to="/offers" className="hover:text-ayur-green whitespace-nowrap">
            Today's Offers
          </Link>
          <Link to="/track-order" className="hover:text-ayur-green whitespace-nowrap">
            My Account
          </Link>
          <Link to="/upload-prescription" className="hover:text-ayur-green whitespace-nowrap">
            Upload Prescription
          </Link>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-3">
          <nav className="flex flex-col text-sm font-medium text-gray-700 divide-y divide-gray-50">
            <Link to="/" onClick={() => setMobileMenuOpen(false)} className="py-2.5 hover:text-ayur-green">
              Home
            </Link>
            <Link to="/category/popular" onClick={() => setMobileMenuOpen(false)} className="py-2.5 hover:text-ayur-green">
              Shop All Products
            </Link>
            <Link to="/offers" onClick={() => setMobileMenuOpen(false)} className="py-2.5 hover:text-ayur-green">
              Today's Offers
            </Link>
            <Link to="/track-order" onClick={() => setMobileMenuOpen(false)} className="py-2.5 hover:text-ayur-green">
              My Account
            </Link>
            <Link to="/upload-prescription" onClick={() => setMobileMenuOpen(false)} className="py-2.5 hover:text-ayur-green">
              Upload Prescription
            </Link>
          </nav>

          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Shop by Health Concern
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {healthConcerns.map((c) => (
                <Link
                  key={c.id}
                  to={`/category/${c.id}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-ayur-cream"
                >
                  <span
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: `${c.color}1A` }}
                  >
                    <c.icon size={14} style={{ color: c.color }} />
                  </span>
                  <span className="text-xs font-medium text-gray-700">{c.label}</span>
                </Link>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <a
              href={whatsappForQuery()}
              target="_blank"
              rel="noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold bg-green-50 text-green-700 px-3 py-2 rounded-full"
            >
              <MessageCircle size={15} /> WhatsApp
            </a>
            <button
              onClick={() => {
                setDoctorModalOpen(true);
                setMobileMenuOpen(false);
              }}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold bg-ayur-cream text-ayur-green px-3 py-2 rounded-full"
            >
              <Stethoscope size={15} /> Doctor
            </button>
            <Link
              to="/upload-prescription"
              onClick={() => setMobileMenuOpen(false)}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold bg-gray-50 text-gray-700 px-3 py-2 rounded-full"
            >
              <FileText size={15} /> Rx
            </Link>
            <Link
              to="/track-order"
              onClick={() => setMobileMenuOpen(false)}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold bg-gray-50 text-gray-700 px-3 py-2 rounded-full"
            >
              <UserCircle size={15} /> Account
            </Link>
          </div>
        </div>
      )}

      <DoctorAppointmentModal open={doctorModalOpen} onClose={() => setDoctorModalOpen(false)} />
    </header>
  );
}
