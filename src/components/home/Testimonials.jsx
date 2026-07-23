import { Star, BadgeCheck } from "lucide-react";
import { testimonials } from "../../data/testimonials";

export default function Testimonials() {
  return (
    <section className="bg-white border-t border-gray-100 py-10">
      <div className="container-px max-w-7xl mx-auto">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1">
          What Our Customers Say
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Real reviews from verified buyers across India
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="bg-ayur-cream/50 border border-gray-100 rounded-2xl p-5"
            >
              <div className="flex items-center gap-1 mb-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={14}
                    className={
                      i < t.rating
                        ? "fill-amber-400 text-amber-400"
                        : "fill-gray-200 text-gray-200"
                    }
                  />
                ))}
              </div>
              <p className="text-sm text-gray-700 leading-relaxed mb-3">"{t.text}"</p>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-gray-800">{t.name}</span>
                <span className="text-xs text-gray-400">· {t.location}</span>
                {t.verified && (
                  <span className="flex items-center gap-0.5 text-[11px] text-green-700 font-medium ml-auto">
                    <BadgeCheck size={13} /> Verified Buyer
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
