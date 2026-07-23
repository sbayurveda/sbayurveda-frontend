import { useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import {
  Star,
  Heart,
  ShieldCheck,
  Truck,
  Minus,
  Plus,
  BadgeCheck,
  Eye,
  TrendingUp,
} from "lucide-react";
import toast from "react-hot-toast";
import { useCatalogStore } from "../context/catalogStore";
import { useStore } from "../context/store";
import ProductCard from "../components/ProductCard";
import ProductImageGallery from "../components/ProductImageGallery";
import { testimonials } from "../data/testimonials";
import { getSocialProof } from "../utils/socialProof";

export default function ProductDetail() {
  const { slug } = useParams();
  const [qty, setQty] = useState(1);

  const addToCart = useStore((s) => s.addToCart);
  const toggleWishlist = useStore((s) => s.toggleWishlist);
  const wishlist = useStore((s) => s.wishlist);
  const products = useCatalogStore((s) => s.products);
  const status = useCatalogStore((s) => s.status);

  const product = products.find((p) => p.slug === slug);

  if (!product) {
    if (status === "loading" || status === "idle") {
      return (
        <div className="container-px max-w-7xl mx-auto py-16 text-center text-gray-500">
          Loading product...
        </div>
      );
    }
    return <Navigate to="/" replace />;
  }

  const isWishlisted = wishlist.includes(product.id);
  const { viewsThisMonth, purchasesThisWeek } = getSocialProof(product.id);
  const related = products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  function handleAdd() {
    addToCart(product, qty);
    toast.success(`${product.name} added to cart!`, { icon: "🛒" });
  }

  return (
    <div className="container-px max-w-7xl mx-auto py-8">
      <nav className="text-xs text-gray-500 mb-5">
        <Link to="/" className="hover:text-ayur-green">Home</Link> /{" "}
        <Link to={`/category/${product.category}`} className="hover:text-ayur-green capitalize">
          {product.category.replace("-", " ")}
        </Link>{" "}
        / <span className="text-gray-700">{product.name}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-8">
        <ProductImageGallery
          images={product.images}
          alt={product.name}
          discountPct={product.discountPct}
        />

        <div>
          <span className="text-sm font-semibold text-ayur-green uppercase tracking-wide">
            {product.brand}
          </span>
          <h1 className="text-2xl font-bold text-gray-800 mt-1 mb-2">{product.name}</h1>

          <div className="flex items-center gap-2 mb-3">
            <span className="flex items-center gap-1 text-sm bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-semibold">
              <Star size={13} className="fill-green-600 text-green-600" /> {product.rating}
            </span>
            <span className="text-sm text-gray-500">
              {product.reviews.toLocaleString("en-IN")} reviews
            </span>
            <span className="text-sm text-gray-400">· {product.packSize}</span>
          </div>

          <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
            <span className="flex items-center gap-1">
              <Eye size={13} /> {viewsThisMonth.toLocaleString("en-IN")} viewed this month
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp size={13} /> {purchasesThisWeek} bought this week
            </span>
          </div>

          <div className="flex items-end gap-3 mb-2">
            <span className="text-3xl font-extrabold text-ayur-green">₹{product.price}</span>
            <span className="text-lg text-red-500 line-through mb-0.5">₹{product.mrp}</span>
            <span className="badge bg-ayur-cream text-ayur-green-dark border border-ayur-gold/40 mb-1.5">
              You Save ₹{product.savings}
            </span>
          </div>
          {product.marketPrice < product.mrp && product.marketPrice > product.price && (
            <p className="text-xs text-gray-500 mb-4">
              Market Price elsewhere: <span className="line-through">₹{product.marketPrice}</span>{" "}
              — SB Ayurveda beats it by ₹{product.marketPrice - product.price}
            </p>
          )}

          <div className="flex flex-wrap gap-2 mb-5">
            <span className="badge bg-green-50 text-green-700">
              <ShieldCheck size={13} /> 2X Refund Guarantee
            </span>
            <span className="badge bg-blue-50 text-blue-700">
              <Truck size={13} /> Free Shipping above ₹799
            </span>
            <span className="badge bg-amber-50 text-amber-700">
              <BadgeCheck size={13} /> 100% Genuine
            </span>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center border border-gray-200 rounded-lg">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="p-2.5 hover:bg-gray-50">
                <Minus size={15} />
              </button>
              <span className="w-8 text-center font-medium">{qty}</span>
              <button onClick={() => setQty((q) => q + 1)} className="p-2.5 hover:bg-gray-50">
                <Plus size={15} />
              </button>
            </div>
            <button onClick={handleAdd} className="btn-primary flex-1 py-3 text-sm">
              ADD TO CART — ₹{product.price * qty}
            </button>
            <button
              onClick={() => toggleWishlist(product.id)}
              className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
              aria-label="Wishlist"
            >
              <Heart size={18} className={isWishlisted ? "fill-red-500 text-red-500" : "text-gray-400"} />
            </button>
          </div>

          <div
            className="text-sm text-gray-600 leading-relaxed
              [&_h1]:text-base [&_h1]:font-bold [&_h1]:text-gray-800 [&_h1]:mt-4 [&_h1]:mb-1.5 [&_h1:first-child]:mt-0
              [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-gray-800 [&_h2]:mt-4 [&_h2]:mb-1.5 [&_h2:first-child]:mt-0
              [&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-gray-800 [&_h3]:mt-4 [&_h3]:mb-1.5 [&_h3:first-child]:mt-0
              [&_h4]:text-sm [&_h4]:font-bold [&_h4]:text-gray-800 [&_h4]:mt-3 [&_h4]:mb-1
              [&_h5]:text-sm [&_h5]:font-bold [&_h5]:text-gray-800 [&_h5]:mt-3 [&_h5]:mb-1
              [&_h6]:text-sm [&_h6]:font-bold [&_h6]:text-gray-800 [&_h6]:mt-3 [&_h6]:mb-1
              [&_p]:mb-2
              [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ul]:mb-3
              [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_ol]:mb-3
              [&_li]:leading-snug
              [&_strong]:text-gray-700 [&_strong]:font-semibold"
            dangerouslySetInnerHTML={{ __html: product.description }}
          />
        </div>
      </div>

      {/* Reviews */}
      <div className="mt-12">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Customer Reviews</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {testimonials.slice(0, 3).map((t) => (
            <div key={t.name} className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-1 mb-1.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={13} className={i < t.rating ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-200"} />
                ))}
              </div>
              <p className="text-sm text-gray-700 mb-2">"{t.text}"</p>
              <span className="text-xs font-medium text-gray-600">{t.name}, {t.location}</span>
            </div>
          ))}
        </div>
      </div>

      {related.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-bold text-gray-800 mb-4">You May Also Like</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
