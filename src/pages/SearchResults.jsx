import { useSearchParams } from "react-router-dom";
import { useCatalogStore } from "../context/catalogStore";
import { searchProducts } from "../utils/searchProducts";
import ProductCard from "../components/ProductCard";

export default function SearchResults() {
  const [params] = useSearchParams();
  const q = params.get("q") || "";
  const products = useCatalogStore((s) => s.products);
  const status = useCatalogStore((s) => s.status);
  const results = searchProducts(products, q);

  if (status === "loading" && products.length === 0) {
    return (
      <div className="container-px max-w-7xl mx-auto py-16 text-center text-gray-500">
        Loading products...
      </div>
    );
  }

  return (
    <div className="container-px max-w-7xl mx-auto py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">
        Search results for "{q}"
      </h1>
      <p className="text-sm text-gray-500 mb-6">{results.length} products found</p>

      {results.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="mb-2">No products found for "{q}".</p>
          <p className="text-sm">Try searching for "Immunity", "Chyawanprash" or "Hair Fall".</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {results.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
