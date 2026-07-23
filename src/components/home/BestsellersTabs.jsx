import { useState } from "react";
import { Link } from "react-router-dom";
import { useCatalogStore } from "../../context/catalogStore";
import ProductCard from "../ProductCard";

const tabs = [
  { id: "popular", label: "Popular" },
  { id: "immunity", label: "Immunity" },
  { id: "hair-care", label: "Haircare" },
  { id: "mens-health", label: "Men's Health" },
  { id: "womens-health", label: "Women's Health" },
];

export default function BestsellersTabs() {
  const [active, setActive] = useState("popular");
  const products = useCatalogStore((s) => s.products);

  let list;
  if (active === "popular") {
    const flagged = products.filter((p) => p.isBestseller);
    list =
      flagged.length >= 4
        ? flagged.slice(0, 8)
        : [...products].sort((a, b) => b.rating - a.rating).slice(0, 8);
  } else {
    list = products
      .filter((p) => p.category === active || p.healthConcerns.includes(active))
      .slice(0, 8);
  }

  return (
    <section className="container-px max-w-7xl mx-auto py-10">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Bestsellers</h2>
        <Link to="/category/popular" className="text-sm font-semibold text-ayur-green hover:underline">
          View All
        </Link>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-5">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              active === t.id
                ? "bg-ayur-green text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">No products in this category yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {list.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </section>
  );
}
