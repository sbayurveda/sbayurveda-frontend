import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { useStore } from "../context/store";
import { useCatalogStore } from "../context/catalogStore";
import ProductCard from "../components/ProductCard";

export default function Wishlist() {
  const wishlist = useStore((s) => s.wishlist);
  const products = useCatalogStore((s) => s.products);
  const items = products.filter((p) => wishlist.includes(p.id));

  return (
    <div className="container-px max-w-7xl mx-auto py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-1 flex items-center gap-2">
        <Heart className="text-red-500 fill-red-500" size={22} /> My Wishlist
      </h1>
      <p className="text-sm text-gray-500 mb-6">{items.length} items saved</p>

      {items.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Heart size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="mb-4">Your wishlist is empty.</p>
          <Link to="/category/popular" className="btn-primary px-5 py-2 text-sm">
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
