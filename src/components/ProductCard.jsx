import { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Star, ShieldCheck, Minus, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { useStore } from "../context/store";

export default function ProductCard({ product }) {
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const addToCart = useStore((s) => s.addToCart);
  const toggleWishlist = useStore((s) => s.toggleWishlist);
  const wishlist = useStore((s) => s.wishlist);
  const isWishlisted = wishlist.includes(product.id);

  function handleAdd(e) {
    e.preventDefault();
    addToCart(product, qty);
    setAdded(true);
    toast.success(`${product.name} added to cart!`, { icon: "🛒" });
    setTimeout(() => setAdded(false), 1200);
  }

  return (
    <div className="group relative bg-white rounded-2xl border border-gray-100 shadow-card hover:shadow-card-hover transition-shadow duration-200 flex flex-col">
      <button
        onClick={(e) => {
          e.preventDefault();
          toggleWishlist(product.id);
        }}
        className="absolute top-2.5 right-2.5 z-10 bg-white/90 rounded-full p-1.5 shadow-sm"
        aria-label="Toggle wishlist"
      >
        <Heart
          size={17}
          className={isWishlisted ? "fill-red-500 text-red-500" : "text-gray-400"}
        />
      </button>

      {product.discountPct > 0 && (
        <span className="absolute top-2.5 left-2.5 z-10 badge bg-red-600 text-white">
          {product.discountPct}% OFF
        </span>
      )}

      <Link to={`/product/${product.slug}`} className="block">
        <div className="overflow-hidden rounded-t-2xl bg-gray-50">
          <img
            src={product.image}
            alt={product.name}
            className="w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        </div>
      </Link>

      <div className="p-3 flex flex-col gap-1.5 flex-1">
        <span className="text-[11px] font-semibold text-ayur-green uppercase tracking-wide">
          {product.brand}
        </span>
        <Link to={`/product/${product.slug}`}>
          <h3 className="text-sm font-medium text-gray-800 leading-snug line-clamp-2 min-h-[2.5em] hover:text-ayur-green">
            {product.name}
          </h3>
        </Link>

        <div className="flex items-center gap-1 text-xs text-amber-500">
          <Star size={13} className="fill-amber-400 text-amber-400" />
          <span className="font-semibold text-gray-700">{product.rating}</span>
          <span className="text-gray-400">({product.reviews.toLocaleString("en-IN")})</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap mt-0.5">
          <span className="text-lg font-extrabold text-ayur-green">₹{product.price}</span>
          <span className="text-xs text-red-500 line-through">₹{product.mrp}</span>
          <span className="badge bg-ayur-cream text-ayur-green-dark border border-ayur-gold/40">
            You Save ₹{product.savings}
          </span>
        </div>

        <span className="badge bg-green-50 text-green-700 w-fit">
          <ShieldCheck size={12} /> 2X Refund Guarantee
        </span>

        <div className="mt-auto pt-2 space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="flex items-center border border-gray-200 rounded-lg">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setQty((q) => Math.max(1, q - 1));
                }}
                className="p-1.5 hover:bg-gray-50"
                aria-label="Decrease quantity"
              >
                <Minus size={13} />
              </button>
              <span className="w-6 text-center text-sm font-medium">{qty}</span>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setQty((q) => q + 1);
                }}
                className="p-1.5 hover:bg-gray-50"
                aria-label="Increase quantity"
              >
                <Plus size={13} />
              </button>
            </div>
            <button
              onClick={handleAdd}
              className={`flex-1 btn-primary text-xs sm:text-sm py-2 ${
                added ? "bg-ayur-green-dark" : ""
              }`}
            >
              {added ? "Added ✓" : "ADD TO CART"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
