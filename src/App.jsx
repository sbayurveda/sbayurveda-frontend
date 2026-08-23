import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useCatalogStore } from "./context/catalogStore";
import CatalogStatusBanner from "./components/CatalogStatusBanner";
import ScrollToTop from "./components/ScrollToTop";
import Header from "./components/Header";
import Footer from "./components/Footer";
import AnnouncementBar from "./components/AnnouncementBar";
import CartDrawer from "./components/CartDrawer";
import LiveOrderNotifier from "./components/LiveOrderNotifier";
import Home from "./pages/Home";
import CategoryListing from "./pages/CategoryListing";
import BrandListing from "./pages/BrandListing";
import SearchResults from "./pages/SearchResults";
import ProductDetail from "./pages/ProductDetail";
import Wishlist from "./pages/Wishlist";
import Offers from "./pages/Offers";
import Checkout from "./pages/Checkout";
import PolicyPage from "./pages/PolicyPage";
import TrackOrder from "./pages/TrackOrder";
import UploadPrescription from "./pages/UploadPrescription";
import NotFound from "./pages/NotFound";

// Staff-only and never linked from the storefront, so it's split into its own
// chunk — customers never download the admin dashboard or its xlsx tooling.
const AdminOrders = lazy(() => import("./pages/AdminOrders"));

// The storefront chrome (announcement bar, header, cart, footer) wraps every
// customer-facing route. The admin dashboard deliberately sits outside it.
function StorefrontLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-ayur-cream/30">
      <AnnouncementBar />
      <Header />
      <CatalogStatusBanner />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/category/:categoryId" element={<CategoryListing />} />
          <Route path="/brand/:brandSlug" element={<BrandListing />} />
          <Route path="/search" element={<SearchResults />} />
          <Route path="/product/:slug" element={<ProductDetail />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/offers" element={<Offers />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/track-order" element={<TrackOrder />} />
          <Route path="/upload-prescription" element={<UploadPrescription />} />
          <Route path="/policy/:policyId" element={<PolicyPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <CartDrawer />
      <LiveOrderNotifier />
    </div>
  );
}

function App() {
  const fetchCatalog = useCatalogStore((s) => s.fetchCatalog);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route
          path="/admin/orders"
          element={
            <Suspense
              fallback={
                <div className="min-h-screen flex items-center justify-center bg-slate-100 text-sm text-slate-500">
                  Loading admin…
                </div>
              }
            >
              <AdminOrders />
            </Suspense>
          }
        />
        <Route path="*" element={<StorefrontLayout />} />
      </Routes>
      <Toaster position="top-center" toastOptions={{ duration: 2000 }} />
    </BrowserRouter>
  );
}

export default App;
