import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { SlidersHorizontal } from "lucide-react";
import { useCatalogStore } from "../context/catalogStore";
import { categories } from "../data/categories";
import ProductCard from "../components/ProductCard";

const SORT_OPTIONS = [
  { id: "relevance", label: "Relevance" },
  { id: "price-low", label: "Price: Low to High" },
  { id: "price-high", label: "Price: High to Low" },
  { id: "discount", label: "Highest Discount" },
  { id: "rating", label: "Highest Rated" },
];

export default function CategoryListing() {
  const { categoryId } = useParams();
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [sort, setSort] = useState("relevance");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const products = useCatalogStore((s) => s.products);
  const brands = useCatalogStore((s) => s.brands);
  const status = useCatalogStore((s) => s.status);

  const categoryLabel =
    categories.find((c) => c.id === categoryId)?.label ||
    categoryId?.replace(/-/g, " ") ||
    "Products";

  const list = useMemo(() => {
    let items =
      categoryId === "popular"
        ? [...products]
        : products.filter(
            (p) => p.category === categoryId || p.healthConcerns.includes(categoryId)
          );

    if (selectedBrands.length) {
      items = items.filter((p) => selectedBrands.includes(p.brand));
    }

    switch (sort) {
      case "price-low":
        items.sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        items.sort((a, b) => b.price - a.price);
        break;
      case "discount":
        items.sort((a, b) => b.discountPct - a.discountPct);
        break;
      case "rating":
        items.sort((a, b) => b.rating - a.rating);
        break;
      default:
        break;
    }
    return items;
  }, [categoryId, selectedBrands, sort, products]);

  function toggleBrand(brand) {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
  }

  if (status === "loading" && products.length === 0) {
    return (
      <div className="container-px max-w-7xl mx-auto py-16 text-center text-gray-500">
        Loading products...
      </div>
    );
  }

  return (
    <div className="container-px max-w-7xl mx-auto py-8">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-gray-800 capitalize">{categoryLabel}</h1>
        <button
          onClick={() => setFiltersOpen((v) => !v)}
          className="sm:hidden flex items-center gap-1.5 text-sm font-medium bg-gray-100 px-3 py-1.5 rounded-full"
        >
          <SlidersHorizontal size={14} /> Filters
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-6">{list.length} products found</p>

      <div className="grid sm:grid-cols-[220px_1fr] gap-6">
        <aside className={`${filtersOpen ? "block" : "hidden"} sm:block space-y-6`}>
          <div>
            <h3 className="font-semibold text-sm text-gray-800 mb-2">Sort By</h3>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <h3 className="font-semibold text-sm text-gray-800 mb-2">Brand</h3>
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {brands.map((b) => (
                <label key={b.id} className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={selectedBrands.includes(b.name)}
                    onChange={() => toggleBrand(b.name)}
                    className="accent-ayur-green"
                  />
                  {b.name}
                </label>
              ))}
            </div>
          </div>
        </aside>

        <div>
          {list.length === 0 ? (
            <p className="text-sm text-gray-500 py-10 text-center">
              No products match your filters.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {list.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
