import { useMemo, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { Search } from "lucide-react";
import { useCatalogStore } from "../context/catalogStore";
import { slugify } from "../utils/slugify";
import { brandLogos } from "../data/brandLogos";
import { searchProducts } from "../utils/searchProducts";
import ProductCard from "../components/ProductCard";

const SORT_OPTIONS = [
  { id: "relevance", label: "Relevance" },
  { id: "price-low", label: "Price: Low to High" },
  { id: "price-high", label: "Price: High to Low" },
  { id: "discount", label: "Highest Discount" },
  { id: "rating", label: "Highest Rated" },
];

export default function BrandListing() {
  const { brandSlug } = useParams();
  const [sort, setSort] = useState("relevance");
  const [query, setQuery] = useState("");
  const products = useCatalogStore((s) => s.products);
  const brands = useCatalogStore((s) => s.brands);
  const status = useCatalogStore((s) => s.status);

  const brand = brands.find((b) => (b.slug || slugify(b.name)) === brandSlug);

  const brandProducts = useMemo(
    () => products.filter((p) => slugify(p.brand) === brandSlug),
    [products, brandSlug]
  );

  const list = useMemo(() => {
    if (!brand) return [];
    const items = query.trim() ? searchProducts(brandProducts, query) : [...brandProducts];
    switch (sort) {
      case "price-low":
        return [...items].sort((a, b) => a.price - b.price);
      case "price-high":
        return [...items].sort((a, b) => b.price - a.price);
      case "discount":
        return [...items].sort((a, b) => b.discountPct - a.discountPct);
      case "rating":
        return [...items].sort((a, b) => b.rating - a.rating);
      default:
        return items;
    }
  }, [brandProducts, brand, sort, query]);

  if (status === "loading" && products.length === 0) {
    return (
      <div className="container-px max-w-7xl mx-auto py-16 text-center text-gray-500">
        Loading products...
      </div>
    );
  }

  if (!brand && status === "ready") {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="container-px max-w-7xl mx-auto py-8">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {brandLogos[brandSlug] && (
            <img
              src={brandLogos[brandSlug]}
              alt={brand?.name}
              className="w-12 h-12 rounded-full bg-white border border-gray-100 object-contain p-1.5"
            />
          )}
          <h1 className="text-2xl font-bold text-gray-800">{brand?.name || "Brand"}</h1>
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="relative max-w-sm mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search within ${brand?.name || "this brand"}...`}
          className="w-full border border-gray-200 rounded-full pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ayur-green/30 bg-gray-50"
        />
      </div>

      <p className="text-sm text-gray-500 mb-6">{list.length} products found</p>

      {list.length === 0 ? (
        <p className="text-sm text-gray-500 py-10 text-center">
          {query.trim()
            ? `No products matching "${query}" for this brand.`
            : "No products found for this brand."}
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {list.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
