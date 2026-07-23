import { useEffect } from "react";
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

function App() {
  const fetchCatalog = useCatalogStore((s) => s.fetchCatalog);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  return (
    <BrowserRouter>
      <ScrollToTop />
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
        <Toaster position="top-center" toastOptions={{ duration: 2000 }} />
      </div>
    </BrowserRouter>
  );
}

export default App;
