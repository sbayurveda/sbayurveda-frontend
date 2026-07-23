import { Link } from "react-router-dom";
import { LayoutGrid, ArrowRight } from "lucide-react";
import { useCatalogStore } from "../../context/catalogStore";

export default function ShopAllProductsCTA() {
  const count = useCatalogStore((s) => s.products.length);

  return (
    <section className="container-px max-w-7xl mx-auto py-8 border-t border-b border-gray-100">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <div>
          <h3 className="font-bold text-lg text-gray-800 mb-1 flex items-center justify-center sm:justify-start gap-2">
            <LayoutGrid size={20} className="text-ayur-green" />
            Browse Our Full Range{count > 0 ? ` — ${count} Products` : ""}
          </h3>
          <p className="text-sm text-gray-500">
            Genuine Ayurvedic medicines, oils, churnas & wellness products across every brand — all
            in one place.
          </p>
        </div>
        <Link
          to="/category/popular"
          className="btn-primary px-6 py-3 text-sm flex items-center gap-2 shrink-0"
        >
          Shop All Products <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}
