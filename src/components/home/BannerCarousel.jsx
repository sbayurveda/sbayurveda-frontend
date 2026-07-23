import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Designed banners (AI-generated product photography, art-directed to match
// the site's real content: real brand names, real contact info, real product
// types). Swap files in public/banners/ to update — same filenames.
const SLIDES = [
  {
    src: "/banners/hero-best-brands.jpg",
    alt: "Best Brands Available — Dabur, Baidyanath, Zandu, Himalaya, Kottakkal, Patanjali — Up to 50% Off",
    to: "/category/popular",
  },
  {
    src: "/banners/2x-guarantee.jpg",
    alt: "Found It Cheaper? We Pay You 2X — SB Ayurveda Lowest Price Guarantee",
    to: "/policy/2x-guarantee",
  },
  {
    src: "/banners/hot-deals.jpg",
    alt: "Today's Hot Deals — Up to 55% Off, Genuine Ayurvedic Products",
    to: "/offers",
  },
  {
    src: "/banners/free-shipping-cod.jpg",
    alt: "Free Shipping and Cash on Delivery — Same Day Dispatch, Pan-India Delivery",
    to: "/offers",
  },
];

export default function BannerCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), 5000);
    return () => clearInterval(id);
  }, []);

  function prev() {
    setIndex((i) => (i - 1 + SLIDES.length) % SLIDES.length);
  }
  function next() {
    setIndex((i) => (i + 1) % SLIDES.length);
  }

  return (
    <section className="relative bg-gray-100">
      <div className="relative w-full aspect-[16/6] sm:aspect-[21/7] overflow-hidden">
        {SLIDES.map((slide, i) => (
          <Link
            key={slide.src}
            to={slide.to}
            className={`absolute inset-0 transition-opacity duration-500 ${
              i === index ? "opacity-100 z-10" : "opacity-0 pointer-events-none"
            }`}
          >
            <img
              src={slide.src}
              alt={slide.alt}
              className="w-full h-full object-cover"
              loading={i === 0 ? "eager" : "lazy"}
            />
          </Link>
        ))}

        <button
          onClick={prev}
          aria-label="Previous banner"
          className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 bg-white/80 hover:bg-white rounded-full p-1.5 sm:p-2 shadow-card"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          onClick={next}
          aria-label="Next banner"
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 bg-white/80 hover:bg-white rounded-full p-1.5 sm:p-2 shadow-card"
        >
          <ChevronRight size={18} />
        </button>

        <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
          {SLIDES.map((slide, i) => (
            <button
              key={slide.src}
              onClick={() => setIndex(i)}
              aria-label={`Go to banner ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-6 bg-white" : "w-1.5 bg-white/60"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
