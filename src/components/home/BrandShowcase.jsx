import { Link } from "react-router-dom";
import { useCatalogStore } from "../../context/catalogStore";
import { slugify } from "../../utils/slugify";
import { brandLogos } from "../../data/brandLogos";

const PALETTE = ["#005F33", "#8B5E34", "#B45309", "#166534", "#7C2D12", "#0369A1", "#BE185D"];

function initials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function colorFor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export default function BrandShowcase() {
  const brands = useCatalogStore((s) => s.brands);
  const topBrands = brands.slice(0, 16);

  if (topBrands.length === 0) return null;

  return (
    <section className="bg-ayur-cream/40 border-y border-gray-100 py-10">
      <div className="container-px max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Shop by Brand</h2>
            <p className="text-sm text-gray-500">
              {brands.length} authentic Ayurvedic brands, all genuine
            </p>
          </div>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4">
          {topBrands.map((b) => {
            const slug = b.slug || slugify(b.name);
            const logo = brandLogos[slug];
            return (
              <Link
                key={b.id}
                to={`/brand/${slug}`}
                className="flex flex-col items-center gap-1.5 group"
              >
                {logo ? (
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white border border-gray-100 flex items-center justify-center p-2 group-hover:scale-105 transition-transform shadow-card overflow-hidden">
                    <img src={logo} alt={b.name} className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <div
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center font-bold text-white text-sm sm:text-base group-hover:scale-105 transition-transform shadow-card"
                    style={{ backgroundColor: colorFor(b.name) }}
                  >
                    {initials(b.name)}
                  </div>
                )}
                <span className="text-[10px] sm:text-xs font-medium text-center text-gray-600 leading-tight line-clamp-2">
                  {b.name}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
