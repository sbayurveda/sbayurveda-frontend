const MESSAGE =
  "🏷️ 100% Lowest Price Guarantee! Found cheaper? Get 200% Refund   |   🚚 Free Delivery above ₹799   |   🌿 Authentic Brands: Dabur, Baidyanath, Zandu, Himalaya & SB Specials   |   📞 9350048002";

export default function AnnouncementBar() {
  return (
    <div className="bg-ayur-green-dark text-white text-xs sm:text-sm font-medium overflow-hidden whitespace-nowrap py-2">
      <div className="flex animate-marquee w-max">
        <span className="px-6">{MESSAGE}</span>
        <span className="px-6">{MESSAGE}</span>
      </div>
    </div>
  );
}
