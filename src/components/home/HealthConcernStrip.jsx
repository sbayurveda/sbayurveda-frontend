import { useMemo } from "react";
import { Link } from "react-router-dom";
import { healthConcerns } from "../../data/categories";
import { useCatalogStore } from "../../context/catalogStore";

// Designed ingredient/ritual photography per concern (see public/health-concerns/),
// consistent wood-table styling matching the homepage banners. Falls back to a
// real product photo from the live catalog, then a plain icon, if a designed
// image is ever missing for a concern.
const DESIGNED_IMAGES = {
  immunity: "/health-concerns/immunity.jpg",
  "hair-care": "/health-concerns/hair-care.jpg",
  diabetes: "/health-concerns/diabetes.jpg",
  "joint-pain": "/health-concerns/joint-pain.jpg",
  "mens-health": "/health-concerns/mens-health.jpg",
  "womens-health": "/health-concerns/womens-health.jpg",
  digestive: "/health-concerns/digestive.jpg",
  general: "/health-concerns/general.jpg",
};

function useConcernFallbackImages() {
  const products = useCatalogStore((s) => s.products);
  return useMemo(() => {
    const map = {};
    for (const hc of healthConcerns) {
      const matches = products
        .filter((p) => p.healthConcerns.includes(hc.id))
        .sort((a, b) => b.rating * b.reviews - a.rating * a.reviews);
      if (matches[0]) map[hc.id] = matches[0].image;
    }
    return map;
  }, [products]);
}

export default function HealthConcernStrip() {
  const fallbackImages = useConcernFallbackImages();

  return (
    <section className="bg-white border-b border-gray-100">
      <div className="container-px max-w-7xl mx-auto py-6">
        <h2 className="font-bold text-gray-800 mb-1">Shop by Health Concern</h2>
        <p className="text-xs text-gray-500 mb-4">Tap to find the right products fast</p>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
          {healthConcerns.map((hc) => {
            const Icon = hc.icon;
            const image = DESIGNED_IMAGES[hc.id] || fallbackImages[hc.id];
            return (
              <Link
                key={hc.id}
                to={`/category/${hc.id}`}
                className="flex flex-col items-center gap-1.5 group"
              >
                <div
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden flex items-center justify-center group-hover:scale-105 transition-transform border border-gray-100 shadow-card"
                  style={{ backgroundColor: `${hc.color}1A` }}
                >
                  {image ? (
                    <img src={image} alt={hc.label} className="w-full h-full object-cover" />
                  ) : (
                    <Icon size={22} style={{ color: hc.color }} />
                  )}
                </div>
                <span className="text-[10px] sm:text-xs font-medium text-center text-gray-600 leading-tight">
                  {hc.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
