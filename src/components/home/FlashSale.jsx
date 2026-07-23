import { Zap } from "lucide-react";
import { useCatalogStore } from "../../context/catalogStore";
import ProductCard from "../ProductCard";
import CountdownTimer from "../CountdownTimer";

const MAX_DEALS = 8;

export default function FlashSale() {
  const products = useCatalogStore((s) => s.products);
  const deals = products
    .filter((p) => p.isFlashSale)
    .sort((a, b) => b.discountPct - a.discountPct)
    .slice(0, MAX_DEALS);

  if (deals.length === 0) return null;

  return (
    <section className="bg-ayur-green-dark py-10">
      <div className="container-px max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2 text-white">
            <Zap className="text-ayur-yellow fill-ayur-yellow" size={22} />
            <h2 className="text-xl sm:text-2xl font-bold">Today's Hot Deals</h2>
          </div>
          <div className="flex items-center gap-2 text-white/80 text-xs sm:text-sm">
            <span>Ends in</span>
            <CountdownTimer hours={6} className="text-ayur-yellow text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {deals.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    </section>
  );
}
