import { useEffect, useState } from "react";
import { ShoppingBag } from "lucide-react";
import { useCatalogStore } from "../context/catalogStore";

const CITIES = [
  "Delhi", "Mumbai", "Bengaluru", "Kolkata", "Pune", "Ahmedabad", "Chennai",
  "Jaipur", "Hyderabad", "Lucknow", "Kochi", "Chandigarh",
];

// Deterministic pseudo-random pick so the same "session" doesn't repeat the
// exact same product/city pairing every time, without needing real order data.
function pickIndex(seed, length) {
  return length > 0 ? Math.abs(Math.sin(seed) * 10000) % length | 0 : 0;
}

export default function LiveOrderNotifier() {
  const products = useCatalogStore((s) => s.products);
  const [visible, setVisible] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const showTimer = setInterval(() => {
      setTick((t) => t + 1);
      setVisible(true);
      setTimeout(() => setVisible(false), 4500);
    }, 8000);

    const initial = setTimeout(() => setVisible(true), 3000);
    return () => {
      clearInterval(showTimer);
      clearTimeout(initial);
    };
  }, []);

  if (products.length === 0) return null;

  const product = products[pickIndex(tick * 7 + 1, products.length)];
  const city = CITIES[pickIndex(tick * 3 + 2, CITIES.length)];
  const minsAgo = 1 + (tick % 9);

  return (
    <div
      className={`fixed bottom-4 left-4 z-30 max-w-xs bg-white rounded-xl shadow-card-hover border border-gray-100 px-4 py-3 flex items-center gap-3 transition-all duration-500 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      }`}
    >
      <div className="bg-ayur-cream rounded-full p-2 shrink-0">
        <ShoppingBag size={16} className="text-ayur-green" />
      </div>
      <p className="text-xs text-gray-700 leading-snug">
        Someone in <span className="font-semibold">{city}</span> just bought{" "}
        <span className="font-semibold">{product.name}</span> — {minsAgo} mins ago
      </p>
    </div>
  );
}
