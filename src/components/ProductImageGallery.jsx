import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function ProductImageGallery({ images, alt, discountPct }) {
  const [active, setActive] = useState(0);
  const hasMultiple = images.length > 1;

  function prev() {
    setActive((i) => (i - 1 + images.length) % images.length);
  }
  function next() {
    setActive((i) => (i + 1) % images.length);
  }

  return (
    <div className="max-w-sm mx-auto md:mx-0">
      <div className="bg-gray-50 rounded-2xl overflow-hidden relative group">
        {discountPct > 0 && (
          <span className="absolute top-3 left-3 badge bg-red-600 text-white z-10">
            {discountPct}% OFF
          </span>
        )}
        <img
          key={active}
          src={images[active]}
          alt={alt}
          className="w-full aspect-square object-contain p-6"
        />
        {hasMultiple && (
          <>
            <button
              onClick={prev}
              aria-label="Previous image"
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-1.5 shadow-card opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={next}
              aria-label="Next image"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-1.5 shadow-card opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight size={18} />
            </button>
          </>
        )}
      </div>

      {hasMultiple && (
        <div className="flex gap-2 mt-3">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`w-16 h-16 rounded-lg overflow-hidden border-2 shrink-0 transition-colors ${
                active === i ? "border-ayur-green" : "border-transparent hover:border-gray-200"
              }`}
              aria-label={`View image ${i + 1}`}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
