import { Tag, ShieldCheck } from "lucide-react";
import { useCatalogStore } from "../context/catalogStore";
import ProductCard from "../components/ProductCard";
import CountdownTimer from "../components/CountdownTimer";

export default function Offers() {
  const products = useCatalogStore((s) => s.products);
  const sorted = [...products].sort((a, b) => b.discountPct - a.discountPct);

  return (
    <div>
      <div className="bg-ayur-green-dark text-white py-8">
        <div className="container-px max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Tag className="text-ayur-yellow" size={22} />
              <h1 className="text-2xl font-bold">Today's Offers</h1>
            </div>
            <p className="text-white/70 text-sm flex items-center gap-1.5">
              <ShieldCheck size={14} /> Found cheaper elsewhere? Claim your 2X Refund Guarantee.
            </p>
          </div>
          <div className="text-sm flex items-center gap-2 text-white/80">
            Deals refresh in <CountdownTimer hours={6} className="text-ayur-yellow" />
          </div>
        </div>
      </div>

      <div className="container-px max-w-7xl mx-auto py-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {sorted.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    </div>
  );
}
